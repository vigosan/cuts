import { useState } from 'react'
import { clipDuration, formatDuration, formatTime, isOverLimit, MAX_CLIP_SECONDS, type Clip } from '@shared/clips'
import type { VideoFade } from '@shared/fades'
import { t } from '../i18n'
import { CloseIcon, FadeInIcon, FadeOutIcon, GripIcon, PlayIcon } from './icons'

type Props = {
  clips: Clip[]
  time: number
  videoFades: VideoFade[]
  selectedId: string | null
  onSelect: (clip: Clip) => void
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

export function ClipList({ clips, time, videoFades, selectedId, onSelect, onPlay, onSetStart, onSetEnd, onDelete, onReorder }: Props) {
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
        const dropTarget = dragIndex !== null && overIndex === index && dragIndex !== index
        const now = formatTime(time)
        const selected = clip.id === selectedId
        const fades = videoFades[index] !== 'none'
        const fadeTitle = videoFades[index] === 'white' ? t.fadeToWhite : t.fadeToBlack
        return (
          <li
            key={clip.id}
            data-testid={`clip-row-${n}`}
            data-over-limit={over}
            aria-selected={selected}
            onClick={(e) => {
              if (!(e.target instanceof Element && e.target.closest('button'))) onSelect(clip)
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
              data-testid={index === 0 ? 'clip-cover-1' : undefined}
              title={index === 0 ? t.cover : undefined}
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums ${index === 0 ? 'bg-accent text-on-accent' : selected ? 'bg-surface text-ink-2' : 'bg-sunken text-ink-2'}`}
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
                onClick={() => (selected ? onSetStart(clip) : onSelect(clip))}
              >
                {formatTime(clip.start)}
              </button>
              <span className="text-ink-3">→</span>
              <button
                data-testid={`clip-set-end-${n}`}
                className={selected ? timeButton : 'px-1 tabular-nums'}
                title={selected ? t.moveEndTo(now) : undefined}
                disabled={selected && time <= clip.start}
                onClick={() => (selected ? onSetEnd(clip) : onSelect(clip))}
              >
                {formatTime(clip.end)}
              </button>
              <span className="w-3 text-ink-3" title={fades ? fadeTitle : undefined}>
                {fades && <FadeOutIcon data-testid={`clip-fade-out-${n}`} />}
              </span>
            </span>
            <span
              data-testid={`clip-duration-${n}`}
              title={over ? t.overLimit(MAX_CLIP_SECONDS) : undefined}
              className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink tabular-nums"
            >
              {over && <span className="size-1.5 rounded-full bg-warn" />}
              {formatDuration(clipDuration(clip))}
            </span>
            <button data-testid={`clip-play-${n}`} className={iconButton} title={t.playClip}
              aria-label={t.playClip} onClick={() => onPlay(clip)}>
              <PlayIcon className="size-3.5" />
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
