import { useEffect, useEffectEvent, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { formatDuration, MAX_CLIP_SECONDS, type Clip } from '@cuts/core/clips'
import { audioGain, nearestFadeSeconds, type ClipFade } from '@cuts/core/fades'
import { dragClip, type DragMode } from '@cuts/core/drag-clip'
import { filmstripTiles, PEAKS_PER_SECOND, uncoveredRanges, waveformColumns } from '@cuts/core/filmstrip'
import { spacedLabels } from '@cuts/core/timeline-view'
import { localTime, partBoundsAt, partStarts } from '@cuts/core/parts'
import { rubberband } from '@cuts/core/reorder'
import type { Source } from '@shared/api'
import { t } from '../i18n'
import { useThumbnails } from '../useVideoPreview'
import type { SelectMode } from './ClipList'
import { CloseIcon } from './icons'

const DRAG_THRESHOLD_PX = 3
const TILE_WIDTH_PX = 96
const ROOMY_CLIP_PX = 28
const PENDING_LABEL_PX = 40
const NUMBER_LABEL_PX = 22

const VOLUME_STEPS = 16
const PINCH_STEP = 40

function fadeRamp(seconds: number, clipLength: number): string {
  return `max(6px, ${(seconds / clipLength) * 100}%)`
}

function volumePoints(fade: ClipFade, clipLength: number): string {
  const ramp = Math.min(fade.fadeSeconds, clipLength / 2)
  const times = Array.from({ length: VOLUME_STEPS + 1 }, (_, i) => (ramp * i) / VOLUME_STEPS)
  return [...times, ...times.map((t) => clipLength - t).reverse()]
    .map((t) => `${(t / clipLength) * 100},${1 - audioGain(fade, clipLength, t)}`)
    .join(' ')
}

type Props = {
  videoPath: string
  thumbnails: boolean
  peaks: Float32Array | null
  analysingAudio: boolean
  duration: number
  viewStart: number
  viewSpan: number
  time: number
  now: () => number
  playing: boolean
  clips: Clip[]
  fades: ClipFade[]
  pendingStart: number | null
  selectedIds: string[]
  onSelect: (clip: Clip, mode?: SelectMode) => void
  onSeek: (time: number) => void
  onClipChange: (clip: Clip) => void
  onDragStart: () => void
  onFadeSeconds: (seconds: number) => void
  onPan: (viewStart: number) => void
  onZoomStep: (steps: 1 | -1, anchor: number, fraction: number) => void
  sources: Source[]
  onRemoveSource: (index: number) => void
  onMoveSource: (index: number, gap: number) => void
  onLocateSource: (index: number) => void
  onAddVideos: (() => void) | null
}

export function Timeline({
  videoPath,
  thumbnails,
  peaks,
  analysingAudio,
  duration,
  viewStart,
  viewSpan,
  time,
  now,
  playing,
  clips,
  fades,
  selectedIds,
  onSelect,
  pendingStart,
  onSeek,
  onClipChange,
  onDragStart,
  onFadeSeconds,
  onPan,
  onZoomStep,
  sources,
  onRemoveSource,
  onMoveSource,
  onLocateSource,
  onAddVideos
}: Props) {
  const justDragged = useRef(false)
  const pinch = useRef(0)
  const barRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const [hoveredSource, setHoveredSource] = useState<number | null>(null)
  const [stretch, setStretch] = useState(0)
  const [panning, setPanning] = useState(false)
  const [trimming, setTrimming] = useState<string | null>(null)
  const [movingSource, setMovingSource] = useState<{ index: number; offset: number; gap: number } | null>(null)
  const tiles = thumbnails ? filmstripTiles(viewStart, duration > 0 ? viewSpan : 0, width, TILE_WIDTH_PX, duration) : []
  const tileFrames = tiles.map((tile) => {
    if (sources.length === 0) return { tile, request: { path: videoPath, time: tile.time } }
    const local = localTime(sources, tile.time)
    return { tile, request: sources[local.index].missing ? null : { path: sources[local.index].path, time: local.time } }
  })
  const frames = useThumbnails(
    tileFrames.flatMap(({ request }) => (request ? [request] : [])),
    sources.length > 0 ? sources.map((source) => source.path).join('\n') : videoPath
  )

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(barRef.current!)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !peaks || width === 0) return
    const scale = window.devicePixelRatio || 1
    canvas.width = Math.round(width * scale)
    canvas.height = Math.round(canvas.clientHeight * scale)
    const columns = waveformColumns(peaks, PEAKS_PER_SECOND, viewStart, viewSpan, Math.round(width))
    const gainAt = (time: number) => {
      const index = clips.findIndex((clip) => clip.start <= time && time <= clip.end)
      return index === -1 ? 1 : audioGain(fades[index], clips[index].end - clips[index].start, time - clips[index].start)
    }
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = getComputedStyle(canvas).color
    const middle = canvas.height / 2
    columns.forEach((peak, x) => {
      const h = Math.max(scale, peak * gainAt(viewStart + (x / columns.length) * viewSpan) * canvas.height)
      context.fillRect(x * scale, middle - h / 2, scale, h)
    })
  }, [peaks, viewStart, viewSpan, width, clips, fades])
  const pct = (t: number) => (viewSpan > 0 ? `${(t / viewSpan) * 100}%` : '0%')
  const viewEnd = viewStart + viewSpan
  const starts = partStarts(sources)
  const stretches =
    sources.length > 1
      ? sources
          .map((source, index) => ({
            source,
            index,
            start: Math.max(starts[index], viewStart),
            end: Math.min(starts[index] + source.duration, viewEnd)
          }))
          .filter((stretch) => stretch.end > stretch.start)
      : []
  const numbered = spacedLabels(
    clips.map((clip) => (viewSpan > 0 ? ((clip.start - viewStart) / viewSpan) * width : 0)),
    NUMBER_LABEL_PX
  )

  const startDrag = (e: ReactPointerEvent<HTMLElement>, clip: Clip, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    if (e.shiftKey || e.metaKey || e.ctrlKey) return onSelect(clip, e.shiftKey ? 'range' : 'toggle')
    onSelect(clip)
    if (mode !== 'move') setTrimming(clip.id)
    const bar = e.currentTarget.closest('[data-testid=timeline]')!.getBoundingClientRect()
    const originX = e.clientX
    const bounds = partBoundsAt(sources, clip.start, duration)
    let moved = false
    const onMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - originX) < DRAG_THRESHOLD_PX) return
      if (!moved) onDragStart()
      moved = true
      const next = dragClip(clip, mode, ((move.clientX - originX) / bar.width) * viewSpan, bounds.end, bounds.start)
      onClipChange(next)
      onSeek(mode === 'end' ? next.end : next.start)
    }
    const onUp = (up: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setTrimming(null)
      if (!moved) onSeek(viewStart + ((up.clientX - bar.left) / bar.width) * viewSpan)
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startFadeDrag = (e: ReactPointerEvent<HTMLElement>, clip: Clip, side: 'in' | 'out') => {
    e.stopPropagation()
    e.preventDefault()
    const block = e.currentTarget.parentElement!.getBoundingClientRect()
    const length = clip.end - clip.start
    const onMove = (move: PointerEvent) => {
      const from = side === 'in' ? move.clientX - block.left : block.left + block.width - move.clientX
      onFadeSeconds(nearestFadeSeconds((from / block.width) * length))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startSourceDrag = (e: ReactPointerEvent<HTMLElement>, index: number) => {
    e.stopPropagation()
    e.preventDefault()
    const bar = e.currentTarget.closest('[data-testid=timeline]')!.getBoundingClientRect()
    const originX = e.clientX
    const middles = sources.map((source, i) => starts[i] + source.duration / 2)
    let moved = false
    let gap = index
    const onMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - originX) < DRAG_THRESHOLD_PX) return
      moved = true
      const at = viewStart + ((move.clientX - bar.left) / bar.width) * viewSpan
      gap = middles.filter((middle) => middle < at).length
      setMovingSource({ index, offset: move.clientX - originX, gap })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setMovingSource(null)
      if (!moved) return
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
      if (gap !== index && gap !== index + 1) onMoveSource(index, gap)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startPan = (e: ReactPointerEvent<HTMLElement>) => {
    if (viewSpan >= duration) return
    const bar = e.currentTarget.getBoundingClientRect()
    const originX = e.clientX
    const originStart = viewStart
    let moved = false
    const onMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - originX) < DRAG_THRESHOLD_PX) return
      moved = true
      const wanted = originStart - ((move.clientX - originX) / bar.width) * viewSpan
      const reachable = Math.min(Math.max(0, wanted), duration - viewSpan)
      onPan(reachable)
      setPanning(true)
      setStretch(rubberband(((reachable - wanted) / viewSpan) * bar.width, bar.width))
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) return
      setPanning(false)
      setStretch(0)
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div className="flex gap-1.5">
      <div
        ref={barRef}
        onPointerDown={startPan}
        data-testid="timeline"
        title={t.timelineHelp}
        onPointerMove={(e) => {
          if (stretches.length === 0) return
          const rect = e.currentTarget.getBoundingClientRect()
          setHoveredSource(localTime(sources, viewStart + ((e.clientX - rect.left) / rect.width) * viewSpan).index)
        }}
        onPointerLeave={() => setHoveredSource(null)}
        onWheel={(e) => {
          if (e.ctrlKey) {
            pinch.current = Math.sign(pinch.current) === Math.sign(-e.deltaY) ? pinch.current - e.deltaY : -e.deltaY
            if (Math.abs(pinch.current) < PINCH_STEP) return
            const rect = e.currentTarget.getBoundingClientRect()
            const fraction = (e.clientX - rect.left) / rect.width
            onZoomStep(pinch.current > 0 ? 1 : -1, viewStart + fraction * viewSpan, fraction)
            pinch.current = 0
            return
          }
          if (viewSpan >= duration || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return
          onPan(viewStart + (e.deltaX / e.currentTarget.getBoundingClientRect().width) * viewSpan)
        }}
        className="relative h-22 min-w-0 flex-1 cursor-pointer touch-none select-none overflow-hidden rounded-lg bg-sunken"
        onClick={(e) => {
          if (justDragged.current) return
          const rect = e.currentTarget.getBoundingClientRect()
          onSeek(viewStart + ((e.clientX - rect.left) / rect.width) * viewSpan)
        }}
      >
        <div
          data-testid="timeline-content"
          className={`absolute inset-0 ${panning ? '' : 'transition-transform duration-300 ease-out motion-reduce:transition-none'}`}
          style={{ transform: stretch ? `translateX(${stretch}px)` : undefined }}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-14 overflow-hidden">
            {frames.size === 0 && tiles.length > 0 && (
              <p data-testid="filmstrip-loading" className="grid h-full place-items-center text-xs text-ink-2 motion-safe:animate-pulse">
                {t.loadingFrames}
              </p>
            )}
            {tileFrames.map(({ tile, request }) =>
              request && frames.has(`${request.path}|${request.time}`) ? (
                <img
                  key={tile.time}
                  data-testid="filmstrip-frame"
                  src={frames.get(`${request.path}|${request.time}`)}
                  alt=""
                  draggable={false}
                  className="absolute inset-y-0 h-full object-cover"
                  style={{ left: `${tile.left}%`, width: TILE_WIDTH_PX }}
                />
              ) : null
            )}
          </div>
          <canvas
            ref={canvasRef}
            data-testid="waveform"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-8 w-full text-ink-3"
          />
          {analysingAudio && (
            <p
              data-testid="waveform-loading"
              className="pointer-events-none absolute inset-x-0 bottom-0 grid h-8 place-items-center text-xs text-ink-2 motion-safe:animate-pulse"
            >
              {t.analysingAudio}
            </p>
          )}
          {uncoveredRanges(clips, viewStart, viewStart + viewSpan).map((range) => (
            <div
              key={range.start}
              className="pointer-events-none absolute inset-y-0 bg-black/25 dark:bg-black/40"
              style={{ left: pct(range.start - viewStart), width: pct(range.end - range.start) }}
            />
          ))}
          {stretches.map(({ source, start, end }) =>
            source.missing ? (
              <div
                key={source.path}
                className="pointer-events-none absolute inset-y-0 bg-sunken bg-[repeating-linear-gradient(135deg,var(--line)_0_6px,transparent_6px_12px)]"
                style={{ left: pct(start - viewStart), width: pct(end - start) }}
              />
            ) : null
          )}
          {starts.map((start, index) =>
            index > 0 && sources.length > 1 && start >= viewStart && start <= viewEnd ? (
              <div
                key={index}
                data-testid={`join-${index}`}
                className="pointer-events-none absolute inset-y-0 z-[5] w-[3px] -translate-x-1/2 bg-canvas"
                style={{ left: pct(start - viewStart) }}
              />
            ) : null
          )}
          {clips.map((clip, index) => {
            const fade = fades[index]
            const selected = selectedIds.includes(clip.id)
            const roomy = ((clip.end - clip.start) / viewSpan) * width >= ROOMY_CLIP_PX
            const fadeColor = fade.videoFade === 'white' ? 'from-white/80' : 'from-black/80'
            const unavailable = sources.length > 1 && sources[localTime(sources, clip.start).index].missing
            const handle = `absolute inset-y-0 w-3 cursor-ew-resize after:absolute after:inset-y-3 after:w-1 after:rounded-full after:bg-white after:shadow-[0_0_0_1px_rgb(0_0_0/0.4)] ${!roomy ? 'after:hidden' : selected ? '' : 'after:opacity-0 group-hover:after:opacity-100'}`
            return (
              <div
                key={clip.id}
                data-testid={`clip-block-${index + 1}`}
                data-fade-in={fades[index].videoFade !== 'none' && index > 0}
                data-fade-out={fades[index].videoFade !== 'none'}
                aria-current={selected}
                className={`group absolute inset-y-0.5 min-w-3 cursor-grab rounded-md shadow-[0_0_0_1px_rgb(0_0_0/0.5)] active:cursor-grabbing ${selected ? 'z-10 border-[3px] border-white' : 'border-2 border-white/70 hover:border-white'} ${unavailable ? 'opacity-50' : ''}`}
                style={{ left: pct(clip.start - viewStart), width: pct(clip.end - clip.start) }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => startDrag(e, clip, 'move')}
              >
                {roomy && fade.videoFade !== 'none' && index > 0 && (
                  <span
                    className={`pointer-events-none absolute inset-y-0 left-0 rounded-l-[4px] bg-gradient-to-r ${fadeColor} to-transparent`}
                    style={{ width: fadeRamp(fade.fadeSeconds, clip.end - clip.start) }}
                  />
                )}
                {roomy && fade.videoFade !== 'none' && (
                  <span
                    className={`pointer-events-none absolute inset-y-0 right-0 rounded-r-[4px] bg-gradient-to-l ${fadeColor} to-transparent`}
                    style={{ width: fadeRamp(fade.fadeSeconds, clip.end - clip.start) }}
                  />
                )}
                {roomy && (
                  <svg
                    className="pointer-events-none absolute inset-x-0 bottom-1 h-6 w-full overflow-visible"
                    viewBox="0 0 100 1"
                    preserveAspectRatio="none"
                  >
                    <polyline
                      data-testid={`clip-volume-${index + 1}`}
                      points={volumePoints(fade, clip.end - clip.start)}
                      fill="none"
                      className="stroke-yellow-300"
                      strokeWidth={1.5}
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>
                )}
                {roomy && selected && fade.audioFade !== 'none' &&
                  (['in', 'out'] as const).map((side) => (
                    <div
                      key={side}
                      data-testid={`fade-handle-${side}-${index + 1}`}
                      className="absolute bottom-7 z-10 size-3 cursor-ew-resize rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.5)]"
                      style={{
                        [side === 'in' ? 'left' : 'right']: `${(Math.min(fade.fadeSeconds, (clip.end - clip.start) / 2) / (clip.end - clip.start)) * 100}%`,
                        translate: side === 'in' ? '-50% 50%' : '50% 50%'
                      }}
                      onPointerDown={(e) => startFadeDrag(e, clip, side)}
                    />
                  ))}
                {numbered[index] && (
                  <span
                    data-testid={`clip-block-number-${index + 1}`}
                    className={`pointer-events-none absolute left-1 rounded bg-black/60 px-1 text-[11px] leading-4 font-semibold text-white tabular-nums ${stretches.length > 0 ? 'top-6' : 'top-1'}`}
                  >
                    {index + 1}
                  </span>
                )}
                {trimming === clip.id && (
                  <span
                    data-testid={`clip-trim-duration-${index + 1}`}
                    className={`pointer-events-none absolute right-1 rounded bg-black/60 px-1 text-[11px] leading-4 font-semibold whitespace-nowrap text-white tabular-nums ${stretches.length > 0 ? 'top-6' : 'top-1'}`}
                  >
                    {formatDuration(clip.end - clip.start)}
                  </span>
                )}
                <div
                  data-testid={`clip-handle-start-${index + 1}`}
                  className={`${handle} -left-1.5 after:left-1`}
                  onPointerDown={(e) => startDrag(e, clip, 'start')}
                />
                <div
                  data-testid={`clip-handle-end-${index + 1}`}
                  className={`${handle} -right-1.5 after:right-1`}
                  onPointerDown={(e) => startDrag(e, clip, 'end')}
                />
              </div>
            )
          })}
          {stretches.map(({ source, index, start, end }) => (
            <div
              key={source.path}
              data-testid={source.missing ? `missing-${index}` : undefined}
              className={`pointer-events-none absolute inset-y-0 ${movingSource?.index === index ? 'z-30 bg-white/10 ring-2 ring-white ring-inset' : hoveredSource === index ? 'z-20 ring-2 ring-white/40 ring-inset' : 'z-20'}`}
              style={{
                left: pct(start - viewStart),
                width: pct(end - start),
                transform: movingSource?.index === index ? `translateX(${movingSource.offset}px)` : undefined
              }}
            >
              <span
                data-testid={`video-name-${index}`}
                className={`pointer-events-auto absolute top-1 left-1.5 max-w-[calc(100%-2.25rem)] cursor-grab truncate rounded px-1.5 text-[11px] leading-4 text-white active:cursor-grabbing ${movingSource?.index === index ? 'bg-black/80 shadow-lg' : 'bg-black/60'}`}
                onPointerDown={(e) => startSourceDrag(e, index)}
                onClick={(e) => e.stopPropagation()}
              >
                {source.name}
              </span>
              <button
                data-testid={`remove-video-${index}`}
                aria-label={t.removeVideo(source.name)}
                title={t.removeVideo(source.name)}
                data-shown={hoveredSource === index}
                className={`pointer-events-auto absolute top-1 right-1 grid size-5 place-items-center rounded-full bg-black/80 text-white transition-[background-color,opacity,transform] duration-150 ease-out hover:bg-black active:scale-[0.97] focus-visible:opacity-100 ${hoveredSource === index ? 'opacity-100' : 'opacity-0'}`}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveSource(index)
                }}
              >
                <CloseIcon className="size-3" />
              </button>
              {source.missing && (
                <div className="absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-center gap-2 px-2 text-xs text-ink-2">
                  <span className="truncate">{t.notFound(source.name)}</span>
                  <button
                    data-testid={`locate-${index}`}
                    className="pointer-events-auto h-6 shrink-0 rounded-md bg-surface px-2 font-medium text-ink shadow-sm ring-1 ring-line transition-colors hover:bg-canvas"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation()
                      onLocateSource(index)
                    }}
                  >
                    {t.locate}
                  </button>
                </div>
              )}
            </div>
          ))}
          {movingSource && movingSource.gap !== movingSource.index && movingSource.gap !== movingSource.index + 1 && (
            <div
              data-testid="video-drop-line"
              className={`pointer-events-none absolute inset-y-0 z-30 w-[3px] rounded-full bg-white shadow-[0_0_0_1px_rgb(0_0_0/0.4)] ${movingSource.gap === 0 ? '' : movingSource.gap === sources.length ? '-translate-x-full' : '-translate-x-1/2'}`}
              style={{ left: pct((movingSource.gap < sources.length ? starts[movingSource.gap] : duration) - viewStart) }}
            />
          )}
          {pendingStart !== null && (
            <PendingClip
              elapsed={Math.max(0, time - pendingStart)}
              left={pct(pendingStart - viewStart)}
              width={pct(Math.max(0, time - pendingStart))}
              widthPx={viewSpan > 0 ? (Math.max(0, time - pendingStart) / viewSpan) * width : 0}
              belowNames={stretches.length > 0}
            />
          )}
          <Playhead time={time} now={now} playing={playing} position={(at) => pct(at - viewStart)} />
        </div>
      </div>
      {onAddVideos && (
        <button
          data-testid="add-videos"
          aria-label={t.addVideos}
          title={t.addVideos}
          className="grid w-11 shrink-0 place-items-center rounded-lg border border-dashed border-ink-3/50 text-lg text-ink-2 transition-[background-color,border-color,color,transform] duration-150 ease-out hover:border-ink-2 hover:bg-sunken hover:text-ink active:scale-[0.97]"
          onClick={onAddVideos}
        >
          +
        </button>
      )}
    </div>
  )
}

function PendingClip({
  elapsed,
  left,
  width,
  widthPx,
  belowNames
}: {
  elapsed: number
  left: string
  width: string
  widthPx: number
  belowNames: boolean
}) {
  const over = elapsed > MAX_CLIP_SECONDS
  const outside = widthPx < PENDING_LABEL_PX
  return (
    <div
      data-testid="pending-clip"
      data-over-limit={over}
      className={`pointer-events-none absolute inset-y-1.5 rounded-md border-2 border-dashed shadow-[0_0_0_1px_rgb(0_0_0/0.5)] ${over ? 'border-amber-300 bg-amber-300/20' : 'border-white bg-white/20'}`}
      style={{ left, width }}
    >
      <span
        data-testid="pending-clip-time"
        data-outside={outside}
        className={`absolute rounded bg-black/60 px-1 text-[11px] leading-4 font-semibold whitespace-nowrap tabular-nums ${over ? 'text-amber-300' : 'text-white'} ${belowNames ? 'top-6' : 'top-1'} ${outside ? 'left-[calc(100%+6px)]' : 'right-1'}`}
      >
        {formatDuration(elapsed)}
      </span>
    </div>
  )
}

function Playhead({
  time,
  now,
  playing,
  position
}: {
  time: number
  now: () => number
  playing: boolean
  position: (time: number) => string
}) {
  const [followed, setFollowed] = useState(time)
  const read = useEffectEvent(now)
  useEffect(() => {
    if (!playing) return
    let frame = requestAnimationFrame(function follow() {
      setFollowed(read())
      frame = requestAnimationFrame(follow)
    })
    return () => cancelAnimationFrame(frame)
  }, [playing])
  return (
    <div
      data-testid="playhead"
      className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 rounded-full bg-red-500"
      style={{ left: position(playing ? followed : time) }}
    />
  )
}
