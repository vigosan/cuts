import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { Clip } from '@cuts/core/clips'
import type { ClipFade } from '@cuts/core/fades'
import { dragClip, type DragMode } from '@cuts/core/drag-clip'
import { filmstripTiles, PEAKS_PER_SECOND, uncoveredRanges, waveformColumns } from '@cuts/core/filmstrip'
import { t } from '../i18n'
import { useThumbnails, useWaveform } from '../useVideoPreview'

const DRAG_THRESHOLD_PX = 3
const TILE_WIDTH_PX = 96
const ROOMY_CLIP_PX = 28

function fadeRamp(seconds: number, clipLength: number): string {
  return `max(6px, ${(seconds / clipLength) * 100}%)`
}

type Props = {
  videoPath: string
  duration: number
  viewStart: number
  viewSpan: number
  time: number
  clips: Clip[]
  fades: ClipFade[]
  pendingStart: number | null
  selectedId: string | null
  onSelect: (clip: Clip) => void
  onSeek: (time: number) => void
  onClipChange: (clip: Clip) => void
  onDragStart: () => void
  onPan: (viewStart: number) => void
}

export function Timeline({
  videoPath,
  duration,
  viewStart,
  viewSpan,
  time,
  clips,
  fades,
  selectedId,
  onSelect,
  pendingStart,
  onSeek,
  onClipChange,
  onDragStart,
  onPan
}: Props) {
  const justDragged = useRef(false)
  const barRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [width, setWidth] = useState(0)
  const tiles = filmstripTiles(viewStart, duration > 0 ? viewSpan : 0, width, TILE_WIDTH_PX, duration)
  const frames = useThumbnails(
    videoPath,
    tiles.map((tile) => tile.time)
  )
  const peaks = useWaveform(videoPath)

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
    context.clearRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = getComputedStyle(canvas).color
    const middle = canvas.height / 2
    columns.forEach((peak, x) => {
      const h = Math.max(scale, peak * canvas.height)
      context.fillRect(x * scale, middle - h / 2, scale, h)
    })
  }, [peaks, viewStart, viewSpan, width])
  const pct = (t: number) => (viewSpan > 0 ? `${(t / viewSpan) * 100}%` : '0%')

  const startDrag = (e: ReactPointerEvent<HTMLElement>, clip: Clip, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    onSelect(clip)
    const bar = e.currentTarget.closest('[data-testid=timeline]')!.getBoundingClientRect()
    const originX = e.clientX
    let moved = false
    const onMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - originX) < DRAG_THRESHOLD_PX) return
      if (!moved) onDragStart()
      moved = true
      const next = dragClip(clip, mode, ((move.clientX - originX) / bar.width) * viewSpan, duration)
      onClipChange(next)
      onSeek(mode === 'end' ? next.end : next.start)
    }
    const onUp = (up: PointerEvent) => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) onSeek(viewStart + ((up.clientX - bar.left) / bar.width) * viewSpan)
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
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
      onPan(originStart - ((move.clientX - originX) / bar.width) * viewSpan)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) return
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={barRef}
      onPointerDown={startPan}
      data-testid="timeline"
      title={t.timelineHelp}
      className="relative h-22 w-full cursor-pointer touch-none select-none overflow-hidden rounded-lg bg-sunken"
      onClick={(e) => {
        if (justDragged.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        onSeek(viewStart + ((e.clientX - rect.left) / rect.width) * viewSpan)
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-14 overflow-hidden">
        {tiles.map((tile) =>
          frames.has(tile.time) ? (
            <img
              key={tile.time}
              data-testid="filmstrip-frame"
              src={frames.get(tile.time)}
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
      {uncoveredRanges(clips, viewStart, viewStart + viewSpan).map((range) => (
        <div
          key={range.start}
          className="pointer-events-none absolute inset-y-0 bg-black/40"
          style={{ left: pct(range.start - viewStart), width: pct(range.end - range.start) }}
        />
      ))}
      {clips.map((clip, index) => {
        const fade = fades[index]
        const selected = clip.id === selectedId
        const roomy = ((clip.end - clip.start) / viewSpan) * width >= ROOMY_CLIP_PX
        const fadeColor = fade.videoFade === 'white' ? 'from-white/80' : 'from-black/80'
        const handle = `absolute inset-y-0 w-3 cursor-ew-resize after:absolute after:inset-y-3 after:w-1 after:rounded-full after:bg-white after:shadow-[0_0_0_1px_rgb(0_0_0/0.4)] ${!roomy ? 'after:hidden' : selected ? '' : 'after:opacity-0 group-hover:after:opacity-100'}`
        return (
          <div
            key={clip.id}
            data-testid={`clip-block-${index + 1}`}
            data-fade-in={fades[index].videoFade !== 'none' && index > 0}
            data-fade-out={fades[index].videoFade !== 'none'}
            aria-current={clip.id === selectedId}
            className={`group absolute inset-y-0.5 min-w-3 cursor-grab rounded-md shadow-[0_0_0_1px_rgb(0_0_0/0.5)] active:cursor-grabbing ${selected ? 'z-10 border-[3px] border-white' : 'border-2 border-white/70 hover:border-white'}`}
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
            <span className="pointer-events-none absolute top-1 left-1 rounded bg-black/60 px-1 text-[10px] leading-4 font-semibold text-white tabular-nums">
              {index + 1}
            </span>
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
      {pendingStart !== null && (
        <div
          className="pointer-events-none absolute inset-y-1.5 rounded-md border border-dashed border-accent bg-accent-soft"
          style={{ left: pct(pendingStart - viewStart), width: pct(Math.max(0, time - pendingStart)) }}
        />
      )}
      <div
        className="pointer-events-none absolute inset-y-0 z-20 w-0.5 -translate-x-1/2 rounded-full bg-red-500"
        style={{ left: pct(time - viewStart) }}
      />
    </div>
  )
}
