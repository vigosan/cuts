import { clipDuration, formatDuration, formatTime, isOverLimit, MAX_CLIP_SECONDS, type Clip } from '@shared/clips'
import { CloseIcon, PlayIcon } from './icons'

type Props = {
  clips: Clip[]
  time: number
  onPlay: (clip: Clip) => void
  onSetStart: (clip: Clip) => void
  onSetEnd: (clip: Clip) => void
  onDelete: (clip: Clip) => void
}

const iconButton =
  'grid size-7 place-items-center rounded-md text-ink-3 transition-colors hover:bg-sunken hover:text-ink'
const adjustButton =
  'rounded-md px-1.5 py-0.5 tabular-nums text-ink-3 transition-colors hover:bg-accent-soft hover:text-accent disabled:pointer-events-none disabled:opacity-40'

export function ClipList({ clips, time, onPlay, onSetStart, onSetEnd, onDelete }: Props) {
  if (clips.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-1 px-6 py-10 text-center">
        <p className="text-sm text-ink-2">Aún no hay clips</p>
        <p className="text-xs text-ink-3">Reproduce el vídeo y marca el inicio y el final de cada fragmento.</p>
      </div>
    )
  }

  return (
    <ol className="flex flex-col gap-0.5 p-2">
      {clips.map((clip, index) => {
        const n = index + 1
        const over = isOverLimit(clip)
        return (
          <li
            key={clip.id}
            data-testid={`clip-row-${n}`}
            data-over-limit={over}
            className="group rounded-xl px-2.5 py-2 transition-colors hover:bg-canvas"
          >
            <div className="flex items-center gap-3">
              <span className="grid size-6 place-items-center rounded-full bg-sunken text-xs font-medium text-ink-2 tabular-nums">
                {n}
              </span>
              <span className="flex-1 text-sm tabular-nums text-ink">
                {formatTime(clip.start)}
                <span className="px-1.5 text-ink-3">→</span>
                {formatTime(clip.end)}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${over ? 'bg-warn-soft text-warn' : 'bg-accent-soft text-accent'}`}
              >
                {formatDuration(clipDuration(clip))}
              </span>
              <button data-testid={`clip-play-${n}`} className={iconButton} title="Escuchar este clip" onClick={() => onPlay(clip)}>
                <PlayIcon className="size-3.5" />
              </button>
              <button data-testid={`clip-delete-${n}`} className={iconButton} title="Borrar clip" onClick={() => onDelete(clip)}>
                <CloseIcon />
              </button>
            </div>
            <div className="mt-0.5 grid pl-9 text-xs">
              <span className="flex gap-x-1 opacity-0 transition-opacity [grid-area:1/1] group-focus-within:opacity-100 group-hover:opacity-100">
                <button
                  data-testid={`clip-set-start-${n}`}
                  className={adjustButton}
                  title="Mover el inicio a la posición actual"
                  disabled={time >= clip.end}
                  onClick={() => onSetStart(clip)}
                >
                  Inicio = {formatTime(time)}
                </button>
                <button
                  data-testid={`clip-set-end-${n}`}
                  className={adjustButton}
                  title="Mover el final a la posición actual"
                  disabled={time <= clip.start}
                  onClick={() => onSetEnd(clip)}
                >
                  Fin = {formatTime(time)}
                </button>
              </span>
              {over && (
                <span className="pointer-events-none self-center px-1.5 text-warn transition-opacity [grid-area:1/1] group-focus-within:opacity-0 group-hover:opacity-0">
                  más de {MAX_CLIP_SECONDS} s, no vale para carrusel
                </span>
              )}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
