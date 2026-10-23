import { isOverLimit, type Clip } from '@shared/clips'

type Props = {
  duration: number
  time: number
  clips: Clip[]
  pendingStart: number | null
  onSeek: (time: number) => void
}

export function Timeline({ duration, time, clips, pendingStart, onSeek }: Props) {
  const pct = (t: number) => (duration > 0 ? `${(t / duration) * 100}%` : '0%')

  return (
    <div
      data-testid="timeline"
      className="relative h-8 flex-1 cursor-pointer rounded bg-zinc-800"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        onSeek(((e.clientX - rect.left) / rect.width) * duration)
      }}
    >
      {clips.map((clip) => (
        <div
          key={clip.id}
          className={`absolute inset-y-0 rounded-sm ${isOverLimit(clip) ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ left: pct(clip.start), width: pct(clip.end - clip.start) }}
        />
      ))}
      {pendingStart !== null && (
        <div
          className="absolute inset-y-0 bg-blue-500/30"
          style={{ left: pct(pendingStart), width: pct(Math.max(0, time - pendingStart)) }}
        />
      )}
      <div className="absolute -inset-y-1 w-0.5 bg-white" style={{ left: pct(time) }} />
    </div>
  )
}
