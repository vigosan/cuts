import { useState } from 'react'
import { clipDuration, formatDuration, formatTime, isOverLimit, MAX_CLIP_SECONDS, type Clip } from '@shared/clips'
import type { VideoFade } from '@shared/fades'
import { CloseIcon, FadeInIcon, FadeOutIcon, GripIcon, PlayIcon } from './icons'

type Props = {
  clips: Clip[]
  time: number
  videoFade: VideoFade
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

export function ClipList({ clips, time, videoFade, onPlay, onSetStart, onSetEnd, onDelete, onReorder }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const fades = videoFade !== 'none'
  const fadeTitle = videoFade === 'white' ? 'Fundido a blanco' : 'Fundido a negro'
  const [overIndex, setOverIndex] = useState<number | null>(null)

  if (clips.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-10">
        <p className="text-sm text-ink-3">Marca inicio y fin para añadir clips</p>
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
        return (
          <li
            key={clip.id}
            data-testid={`clip-row-${n}`}
            data-over-limit={over}
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
            className={`group relative flex items-center gap-2 rounded-xl py-1.5 pr-1 pl-1 transition-colors hover:bg-canvas ${dragIndex === index ? 'opacity-40' : ''}`}
          >
            {dropTarget && (
              <span
                className={`pointer-events-none absolute inset-x-2 h-0.5 rounded-full bg-accent ${dragIndex < index ? '-bottom-0.5' : '-top-0.5'}`}
              />
            )}
            <span className="cursor-grab text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" title="Arrastra para cambiar el orden">
              <GripIcon />
            </span>
            <span
              data-testid={index === 0 ? 'clip-cover-1' : undefined}
              title={index === 0 ? 'Portada del carrusel' : undefined}
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-medium tabular-nums ${index === 0 ? 'bg-accent text-on-accent' : 'bg-sunken text-ink-2'}`}
            >
              {n}
            </span>
            <span className="flex flex-1 items-center text-sm text-ink">
              <span className="w-3 text-ink-3" title={fades && index > 0 ? fadeTitle : undefined}>
                {fades && index > 0 && <FadeInIcon data-testid={`clip-fade-in-${n}`} />}
              </span>
              <button
                data-testid={`clip-set-start-${n}`}
                className={timeButton}
                title={`Mover el inicio a ${now}`}
                disabled={time >= clip.end}
                onClick={() => onSetStart(clip)}
              >
                {formatTime(clip.start)}
              </button>
              <span className="text-ink-3">→</span>
              <button
                data-testid={`clip-set-end-${n}`}
                className={timeButton}
                title={`Mover el final a ${now}`}
                disabled={time <= clip.start}
                onClick={() => onSetEnd(clip)}
              >
                {formatTime(clip.end)}
              </button>
              <span className="w-3 text-ink-3" title={fades ? fadeTitle : undefined}>
                {fades && <FadeOutIcon data-testid={`clip-fade-out-${n}`} />}
              </span>
            </span>
            <span
              data-testid={`clip-duration-${n}`}
              title={over ? `Más de ${MAX_CLIP_SECONDS} s: no vale para carrusel` : undefined}
              className="flex items-center gap-1.5 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-ink tabular-nums"
            >
              {over && <span className="size-1.5 rounded-full bg-warn" />}
              {formatDuration(clipDuration(clip))}
            </span>
            <button data-testid={`clip-play-${n}`} className={iconButton} title="Escuchar" onClick={() => onPlay(clip)}>
              <PlayIcon className="size-3.5" />
            </button>
            <button data-testid={`clip-delete-${n}`} className={iconButton} title="Borrar" onClick={() => onDelete(clip)}>
              <CloseIcon />
            </button>
          </li>
        )
      })}
    </ol>
  )
}
