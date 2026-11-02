import { useState, type MouseEvent } from 'react'
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
import { t } from '../i18n'
import { CheckIcon, CloseIcon, CropIcon, FitIcon, GripIcon, PauseIcon, PlayIcon, SparkleIcon, SpinnerIcon } from './icons'

export type SelectMode = 'only' | 'toggle' | 'range'

const selectMode = (e: MouseEvent): SelectMode => (e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'only')

type Props = {
  clips: Clip[]
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
  'grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink'
const rowAction = 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
const key = 'rounded bg-sunken px-1.5 font-sans text-xs text-ink-2'
const timeButton =
  'group/time rounded-md px-1 tabular-nums transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none'

export function ClipList({
  clips,
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
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

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

  const endDrag = () => {
    setDragIndex(null)
    setOverIndex(null)
  }

  return (
    <ol className="flex flex-col gap-0.5 p-2">
      {clips.map((clip, index) => {
        const n = index + 1
        const over = isOverLimit(clip)
        const past = isPastCarousel(index)
        const dropTarget = dragIndex !== null && overIndex === index && dragIndex !== index
        const now = formatTime(time)
        const selected = selectedIds.includes(clip.id)
        return (
          <li
            key={clip.id}
            data-testid={`clip-row-${n}`}
            data-over-limit={over}
            data-past-carousel={past}
            aria-current={selected}
            onClick={(e) => {
              if (!(e.target instanceof Element && e.target.closest('button'))) onSelect(clip, selectMode(e))
            }}
            draggable
            onDragStart={(e) => {
              e.dataTransfer?.setData('text/plain', String(index))
              setDragIndex(index)
            }}
            onDragOver={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
              e.stopPropagation()
              setOverIndex(index)
            }}
            onDrop={(e) => {
              if (dragIndex === null) return
              e.preventDefault()
              e.stopPropagation()
              if (dragIndex !== index) onReorder(dragIndex, index)
              endDrag()
            }}
            onDragEnd={endDrag}
            className={`group relative flex cursor-default items-center gap-2 rounded-xl py-1.5 pr-1 pl-1 transition-colors ${selected ? 'bg-sunken' : 'hover:bg-canvas'} ${dragIndex === index ? 'opacity-40' : ''}`}
          >
            {dropTarget && (
              <span
                className={`pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-accent ${dragIndex < index ? '-bottom-0.5' : '-top-0.5'}`}
              />
            )}
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
            <span className="flex flex-1 items-center text-sm text-ink">
              <button
                data-testid={`clip-set-start-${n}`}
                className={selected ? timeButton : 'px-1 tabular-nums'}
                title={selected ? t.moveStartTo(now) : undefined}
                disabled={selected && time >= clip.end}
                onClick={(e) => (selectMode(e) !== 'only' ? onSelect(clip, selectMode(e)) : selected ? onSetStart(clip) : onSelect(clip))}
              >
                <span className={selected ? 'group-hover/time:hidden' : undefined}>{formatTime(clip.start)}</span>
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
                <span className={selected ? 'group-hover/time:hidden' : undefined}>{formatTime(clip.end)}</span>
                {selected && (
                  <span data-testid={`clip-set-end-target-${n}`} className="hidden group-hover/time:inline">
                    {now}
                  </span>
                )}
              </button>
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
