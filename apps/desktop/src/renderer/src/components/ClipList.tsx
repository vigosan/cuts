import { useEffect, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  clipDuration,
  formatDuration,
  formatTime,
  isOverLimit,
  isPastCarousel,
  MAX_CAROUSEL_ITEMS,
  MAX_CLIP_SECONDS,
  type Clip
} from '@cuts/core/clips'
import { localTime, partBoundsAt, partStarts } from '@cuts/core/parts'
import { dragOffset, reorderTarget, rowShift, settleOffset } from '@cuts/core/reorder'
import type { Source } from '@shared/api'
import { t } from '../i18n'
import { CheckIcon, CloseIcon, CropIcon, FitIcon, GripIcon, PauseIcon, PlayIcon, SparkleIcon, SpinnerIcon } from './icons'

export type SelectMode = 'only' | 'toggle' | 'range'

const ROW_GAP_PX = 2
const REORDER_THRESHOLD_PX = 4

type Drag = { from: number; to: number; dy: number; heights: number[] }

const selectMode = (e: MouseEvent): SelectMode => (e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'only')

type Props = {
  clips: Clip[]
  sources: Source[]
  time: number
  selectedIds: string[]
  loopingId: string | null
  onSelect: (clip: Clip, mode?: SelectMode) => void
  onPlay: (clip: Clip) => void
  onSetStart: (clip: Clip) => void
  onSetEnd: (clip: Clip) => void
  onDelete: (clip: Clip) => void
  onReorder: (from: number, to: number) => void
  suggesting: boolean
  onSuggest: () => void
  exportStatus: Record<string, number>
  framings: ('crop' | 'fit')[] | null
}

const iconButton =
  'grid size-7 place-items-center rounded-md text-ink-3 transition-[background-color,color,opacity,transform] duration-150 ease-out hover:bg-sunken hover:text-ink active:scale-[0.97]'
const rowAction = 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
const key = 'rounded bg-sunken px-1.5 font-sans text-xs text-ink-2'
const timeButton =
  'group/time rounded-md px-1 tabular-nums transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none'

export function ClipList({
  clips,
  sources,
  time,
  selectedIds,
  loopingId,
  onSelect,
  onPlay,
  onSetStart,
  onSetEnd,
  onDelete,
  onReorder,
  suggesting,
  onSuggest,
  exportStatus,
  framings
}: Props) {
  const listRef = useRef<HTMLOListElement>(null)
  const justDragged = useRef(false)
  const [drag, setDrag] = useState<Drag | null>(null)
  const [settle, setSettle] = useState<{ id: string; y: number } | null>(null)

  useEffect(() => {
    if (!settle) return
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setSettle(null))
    })
    return () => cancelAnimationFrame(frame)
  }, [settle])

  if (clips.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10 text-center text-sm text-ink-2">
        <p>{t.noClips}</p>
        <p className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <kbd className={key}>I</kbd>
            {t.markStart}
          </span>
          <span className="flex items-center gap-1.5">
            <kbd className={key}>O</kbd>
            {t.markEnd}
          </span>
        </p>
        <button
          data-testid="suggest-empty"
          className="flex h-8 items-center gap-1.5 rounded-lg bg-sunken px-3 font-medium text-ink transition-[background-color,color,transform] duration-150 ease-out hover:bg-accent-soft hover:text-accent active:scale-[0.97] disabled:cursor-default"
          aria-busy={suggesting}
          disabled={suggesting}
          onClick={onSuggest}
        >
          {suggesting ? <SpinnerIcon className="size-3.5" /> : <SparkleIcon className="size-3.5" />}
          {t.suggestMoments}
        </button>
      </div>
    )
  }

  const startReorder = (e: ReactPointerEvent<HTMLLIElement>, clip: Clip, from: number) => {
    if (e.button !== 0) return
    const heights = Array.from(listRef.current!.children).map((row) => row.getBoundingClientRect().height + ROW_GAP_PX)
    const originY = e.clientY
    let current: Drag | null = null
    const onMove = (move: PointerEvent) => {
      const dy = move.clientY - originY
      if (!current && Math.abs(dy) < REORDER_THRESHOLD_PX) return
      const offset = dragOffset(heights, from, dy)
      current = { from, to: reorderTarget(heights, from, offset), dy: offset, heights }
      setDrag(current)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!current) return
      if (current.to !== from) onReorder(from, current.to)
      setSettle({ id: clip.id, y: settleOffset(heights, from, current.to, current.dy) })
      setDrag(null)
      justDragged.current = true
      setTimeout(() => {
        justDragged.current = false
      }, 0)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <ol ref={listRef} className="flex flex-col gap-0.5 p-2">
      {clips.map((clip, index) => {
        const n = index + 1
        const over = isOverLimit(clip)
        const past = isPastCarousel(index)
        const lifted = drag?.from === index
        const offset = lifted ? drag.dy : settle?.id === clip.id ? settle.y : drag ? rowShift(drag.heights, drag.from, drag.to, index) : 0
        const joined = sources.length >= 2
        const source = joined ? localTime(sources, clip.start) : null
        const partStart = source ? partStarts(sources)[source.index] : 0
        const unavailable = source !== null && sources[source.index].missing
        const bounds = joined ? partBoundsAt(sources, clip.start, 0) : null
        const local = (at: number) => formatTime(at - partStart)
        const target = (at: number) => (bounds ? Math.min(Math.max(at, bounds.start), bounds.end) : at)
        const now = local(target(time))
        const selected = selectedIds.includes(clip.id)
        return (
          <li
            key={clip.id}
            data-testid={`clip-row-${n}`}
            data-over-limit={over}
            data-past-carousel={past}
            aria-current={selected}
            onClickCapture={(e) => {
              if (justDragged.current) e.stopPropagation()
            }}
            onClick={(e) => {
              if (!(e.target instanceof Element && e.target.closest('button'))) onSelect(clip, selectMode(e))
            }}
            onPointerDown={(e) => startReorder(e, clip, index)}
            style={{ transform: offset ? `translateY(${offset}px)` : undefined }}
            className={`group relative flex cursor-default items-center gap-2 rounded-xl py-1.5 pr-1 pl-1 select-none ${lifted || settle ? '' : 'transition-[background-color,transform] duration-200 ease-out motion-reduce:transition-none'} ${lifted ? 'z-10 cursor-grabbing bg-surface shadow-lg ring-1 ring-line' : selected ? 'bg-sunken' : 'hover:bg-canvas'}`}
          >
            <span className="cursor-grab text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" title={t.reorderHint}>
              <GripIcon />
            </span>
            <span
              data-testid={index === 0 ? 'clip-cover-1' : `clip-number-${n}`}
              title={index === 0 ? t.cover : past ? t.pastCarousel(MAX_CAROUSEL_ITEMS) : undefined}
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums ${index === 0 ? 'bg-accent text-on-accent' : past ? 'bg-warn-soft text-warn' : selected ? 'bg-surface text-ink-2' : 'bg-sunken text-ink-2'}`}
            >
              {n}
            </span>
            <span
              data-testid={unavailable ? `clip-unavailable-${n}` : undefined}
              title={unavailable ? t.notFound(sources[source.index].name) : undefined}
              className={`flex min-w-0 flex-1 flex-col text-sm text-ink ${unavailable ? 'opacity-50' : ''}`}
            >
              {source && (
                <span data-testid={`clip-source-${n}`} className="truncate px-1 text-xs text-ink-3" title={sources[source.index].name}>
                  {sources[source.index].name}
                </span>
              )}
              <span className="flex items-center">
                <button
                  data-testid={`clip-set-start-${n}`}
                  className={selected ? timeButton : 'px-1 tabular-nums'}
                  title={selected ? t.moveStartTo(now) : undefined}
                  disabled={selected && time >= clip.end}
                  onClick={(e) => (selectMode(e) !== 'only' ? onSelect(clip, selectMode(e)) : selected ? onSetStart(clip) : onSelect(clip))}
                >
                  <span className={selected ? 'group-hover/time:hidden' : undefined}>{local(clip.start)}</span>
                  {selected && (
                    <span data-testid={`clip-set-start-target-${n}`} className="hidden group-hover/time:inline">
                      {now}
                    </span>
                  )}
                </button>
                <span className="text-ink-3">→</span>
                <button
                  data-testid={`clip-set-end-${n}`}
                  className={selected ? timeButton : 'px-1 tabular-nums'}
                  title={selected ? t.moveEndTo(now) : undefined}
                  disabled={selected && time <= clip.start}
                  onClick={(e) => (selectMode(e) !== 'only' ? onSelect(clip, selectMode(e)) : selected ? onSetEnd(clip) : onSelect(clip))}
                >
                  <span className={selected ? 'group-hover/time:hidden' : undefined}>{local(clip.end)}</span>
                  {selected && (
                    <span data-testid={`clip-set-end-target-${n}`} className="hidden group-hover/time:inline">
                      {now}
                    </span>
                  )}
                </button>
              </span>
            </span>
            {framings && (
              <span
                data-testid={`clip-framing-${n}`}
                role="img"
                aria-label={framings[index] === 'fit' ? t.framingFit : t.framingCrop}
                title={framings[index] === 'fit' ? t.framingFit : t.framingCrop}
                className="text-ink-3"
              >
                {framings[index] === 'fit' ? <FitIcon /> : <CropIcon />}
              </span>
            )}
            <span className="flex w-[4.5rem] shrink-0 items-center justify-end gap-1.5">
              {exportStatus[clip.id] === 1 && (
                <span data-testid={`clip-exported-${n}`} role="img" aria-label={t.clipExported} className="text-ok">
                  <CheckIcon />
                </span>
              )}
              {exportStatus[clip.id] !== undefined && exportStatus[clip.id] < 1 && (
                <ExportRing testId={`clip-exporting-${n}`} ratio={exportStatus[clip.id]} />
              )}
              <span
                data-testid={`clip-duration-${n}`}
                title={over ? t.overLimit(MAX_CLIP_SECONDS) : undefined}
                className={`flex items-center gap-1.5 text-xs font-medium tabular-nums ${over ? 'text-warn' : 'text-ink-2'}`}
              >
                {over && <span className="size-1.5 rounded-full bg-warn" />}
                {formatDuration(clipDuration(clip))}
              </span>
            </span>
            <button
              data-testid={`clip-play-${n}`}
              className={`${iconButton} ${clip.id === loopingId ? 'bg-sunken text-ink' : selected ? '' : rowAction}`}
              title={clip.id === loopingId ? t.stopLoop : t.playClip}
              aria-label={clip.id === loopingId ? t.stopLoop : t.playClip}
              aria-pressed={clip.id === loopingId}
              onClick={() => onPlay(clip)}
            >
              {clip.id === loopingId ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
            </button>
            <button data-testid={`clip-delete-${n}`} className={`${iconButton} ${selected ? '' : rowAction}`} title={t.deleteClip}
              aria-label={t.deleteClip} onClick={() => onDelete(clip)}>
              <CloseIcon />
            </button>
          </li>
        )
      })}
    </ol>
  )
}

const RING_RADIUS = 5.5
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

function ExportRing({ testId, ratio }: { testId: string; ratio: number }) {
  const percent = Math.round(ratio * 100)
  return (
    <svg
      data-testid={testId}
      role="progressbar"
      aria-label={t.clipExporting}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      viewBox="0 0 14 14"
      className="size-3.5 shrink-0 -rotate-90 text-accent"
    >
      <circle cx="7" cy="7" r={RING_RADIUS} fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <circle
        cx="7"
        cy="7"
        r={RING_RADIUS}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={RING_LENGTH}
        strokeDashoffset={RING_LENGTH * (1 - ratio)}
        className="transition-[stroke-dashoffset] duration-300 ease-out"
      />
    </svg>
  )
}
