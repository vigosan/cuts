import { clipDuration, formatDuration, formatTime, isOverLimit, MAX_CLIP_SECONDS, type Clip } from '@shared/clips'

type Props = {
  clips: Clip[]
  onPlay: (clip: Clip) => void
  onSetStart: (clip: Clip) => void
  onSetEnd: (clip: Clip) => void
  onDelete: (clip: Clip) => void
}

const button = 'rounded px-2 py-1 text-sm text-zinc-300 hover:bg-zinc-700'

export function ClipList({ clips, onPlay, onSetStart, onSetEnd, onDelete }: Props) {
  if (clips.length === 0) {
    return <p className="text-sm text-zinc-500">Marca el inicio (I) y el final (O) de cada trozo mientras escuchas.</p>
  }

  return (
    <table className="w-full text-left tabular-nums">
      <thead className="text-xs uppercase text-zinc-500">
        <tr>
          <th className="py-1">#</th>
          <th>Inicio</th>
          <th>Fin</th>
          <th>Duración</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {clips.map((clip, index) => {
          const n = index + 1
          const over = isOverLimit(clip)
          return (
            <tr
              key={clip.id}
              data-testid={`clip-row-${n}`}
              data-over-limit={over}
              className={`border-t border-zinc-800 ${over ? 'text-red-400' : ''}`}
            >
              <td className="py-1">{n}</td>
              <td>{formatTime(clip.start)}</td>
              <td>{formatTime(clip.end)}</td>
              <td>
                {formatDuration(clipDuration(clip))}
                {over && ` · pasa de ${MAX_CLIP_SECONDS} s`}
              </td>
              <td className="text-right">
                <button data-testid={`clip-play-${n}`} className={button} title="Escuchar" onClick={() => onPlay(clip)}>
                  ▶
                </button>
                <button data-testid={`clip-set-start-${n}`} className={button} title="Inicio aquí" onClick={() => onSetStart(clip)}>
                  [ aquí
                </button>
                <button data-testid={`clip-set-end-${n}`} className={button} title="Fin aquí" onClick={() => onSetEnd(clip)}>
                  aquí ]
                </button>
                <button data-testid={`clip-delete-${n}`} className={button} title="Borrar" onClick={() => onDelete(clip)}>
                  ✕
                </button>
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}
