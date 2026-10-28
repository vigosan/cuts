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
import type { VideoFade } from '@cuts/core/fades'
import { t } from '../i18n'
import { CloseIcon, FadeInIcon, FadeOutIcon, GripIcon, PauseIcon, PlayIcon } from './icons'

export type SelectMode = 'only' | 'toggle' | 'range'

const selectMode = (e: MouseEvent): SelectMode => (e.shiftKey ? 'range' : e.metaKey || e.ctrlKey ? 'toggle' : 'only')

type Props = {
  clips: Clip[]
  time: number
  videoFades: VideoFade[]
  selectedIds: string[]
  loopingId: string | null
  onSelect: (clip: Clip, mode?: SelectMode) => void
  onPlay: (clip: Clip) => void
  onSetStart: (clip: Clip) => void
  onSetEnd: (clip: Clip) => void
  onDelete: (clip: Clip) => void
  onReorder: (from: number, to: number) => void
}

const iconButton =
  'grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink'
const timeButton =
  'rounded-md px-1 tabular-nums transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none'

export function ClipList({
  clips,
  time,
  videoFades,
  selectedIds,
  loopingId,
  onSelect,
  onPlay,
  onSetStart,
  onSetEnd,
  onDelete,
  onReorder
}: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (clips.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-ink-3">{t.noClips}</p>
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
        const fades = videoFades[index] !== 'none'
        const fadeTitle = videoFades[index] === 'white' ? t.fadeToWhite : t.fadeToBlack
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
              <span className="w-3 text-ink-3" title={fades && index > 0 ? fadeTitle : undefined}>
                {fades && index > 0 && <FadeInIcon data-testid={`clip-fade-in-${n}`} />}
              </span>
              <button
                data-testid={`clip-set-start-${n}`}
                className={selected ? timeButton : 'px-1 tabular-nums'}
                title={selected ? t.moveStartTo(now) : undefined}
                disabled={selected && time >= clip.end}
                onClick={(e) => (selectMode(e) !== 'only' ? onSelect(clip, selectMode(e)) : selected ? onSetStart(clip) : onSelect(clip))}
              >
                {formatTime(clip.start)}
              </button>
              <span className="text-ink-3">→</span>
              <button
                data-testid={`clip-set-end-${n}`}
                className={selected ? timeButton : 'px-1 tabular-nums'}
                title={selected ? t.moveEndTo(now) : undefined}
                disabled={selected && time <= clip.start}
                onClick={(e) => (selectMode(e) !== 'only' ? onSelect(clip, selectMode(e)) : selected ? onSetEnd(clip) : onSelect(clip))}
              >
                {formatTime(clip.end)}
              </button>
              <span className="w-3 text-ink-3" title={fades ? fadeTitle : undefined}>
                {fades && <FadeOutIcon data-testid={`clip-fade-out-${n}`} />}
              </span>
            </span>
            <span className="flex w-[4.5rem] shrink-0 justify-end">
              <span
                data-testid={`clip-duration-${n}`}
                title={over ? t.overLimit(MAX_CLIP_SECONDS) : undefined}
                className="relative flex w-full items-center justify-center rounded-full bg-accent-soft py-0.5 text-xs font-medium text-ink tabular-nums"
              >
                {over && <span className="absolute left-2.5 size-1.5 rounded-full bg-warn" />}
                {formatDuration(clipDuration(clip))}
              </span>
            </span>
            <button
              data-testid={`clip-play-${n}`}
              className={`${iconButton} ${clip.id === loopingId ? 'bg-sunken text-ink' : ''}`}
              title={clip.id === loopingId ? t.stopLoop : t.playClip}
              aria-label={clip.id === loopingId ? t.stopLoop : t.playClip}
              aria-pressed={clip.id === loopingId}
              onClick={() => onPlay(clip)}
            >
              {clip.id === loopingId ? <PauseIcon className="size-3.5" /> : <PlayIcon className="size-3.5" />}
            </button>
            <button data-testid={`clip-delete-${n}`} className={iconButton} title={t.deleteClip}
              aria-label={t.deleteClip} onClick={() => onDelete(clip)}>
              <CloseIcon />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
