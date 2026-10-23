import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isOverLimit, type Clip } from '@shared/clips'
import { dragClip, type DragMode } from '../drag-clip'

const DRAG_THRESHOLD_PX = 3

type Props = {
  duration: number
  viewStart: number
  viewSpan: number
  time: number
  clips: Clip[]
  pendingStart: number | null
  onSeek: (time: number) => void
  onClipChange: (clip: Clip) => void
}

export function Timeline({ duration, viewStart, viewSpan, time, clips, pendingStart, onSeek, onClipChange }: Props) {
  const justDragged = useRef(false)
  const pct = (t: number) => (viewSpan > 0 ? `${(t / viewSpan) * 100}%` : '0%')

  const startDrag = (e: ReactPointerEvent<HTMLElement>, clip: Clip, mode: DragMode) => {
    e.stopPropagation()
    e.preventDefault()
    const bar = e.currentTarget.closest('[data-testid=timeline]')!.getBoundingClientRect()
    const originX = e.clientX
    let moved = false
    const onMove = (move: PointerEvent) => {
      if (!moved && Math.abs(move.clientX - originX) < DRAG_THRESHOLD_PX) return
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

  return (
    <div
      data-testid="timeline"
      className="relative h-8 flex-1 cursor-pointer touch-none select-none overflow-hidden rounded bg-zinc-800"
      onClick={(e) => {
        if (justDragged.current) return
        const rect = e.currentTarget.getBoundingClientRect()
        onSeek(viewStart + ((e.clientX - rect.left) / rect.width) * viewSpan)
      }}
    >
      {clips.map((clip, index) => (
        <div
          key={clip.id}
          data-testid={`clip-block-${index + 1}`}
          className={`group absolute inset-y-0 min-w-3 cursor-grab rounded-sm active:cursor-grabbing ${isOverLimit(clip) ? 'bg-red-500' : 'bg-blue-500'}`}
          style={{ left: pct(clip.start - viewStart), width: pct(clip.end - clip.start) }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => startDrag(e, clip, 'move')}
        >
          <div
            data-testid={`clip-handle-start-${index + 1}`}
            className="absolute inset-y-0 -left-1 w-2 cursor-ew-resize rounded-l-sm group-hover:bg-white/60"
            onPointerDown={(e) => startDrag(e, clip, 'start')}
          />
          <div
            data-testid={`clip-handle-end-${index + 1}`}
            className="absolute inset-y-0 -right-1 w-2 cursor-ew-resize rounded-r-sm group-hover:bg-white/60"
            onPointerDown={(e) => startDrag(e, clip, 'end')}
          />
        </div>
      ))}
      {pendingStart !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 bg-blue-500/30"
          style={{ left: pct(pendingStart - viewStart), width: pct(Math.max(0, time - pendingStart)) }}
        />
      )}
      <div className="pointer-events-none absolute -inset-y-1 w-0.5 bg-white" style={{ left: pct(time - viewStart) }} />
    </div>
  )
}
