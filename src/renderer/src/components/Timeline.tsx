import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import type { Clip } from '@shared/clips'
import type { ClipFade } from '@shared/fades'
import { dragClip, type DragMode } from '../drag-clip'
import { t } from '../i18n'

const DRAG_THRESHOLD_PX = 3

function fadeMask(fadeIn: boolean, fadeOut: boolean, rampPercent: number): string | undefined {
  if (!fadeIn && !fadeOut) return undefined
  const ramp = `max(6px, ${rampPercent}%)`
  const start = fadeIn ? `transparent, black ${ramp}` : 'black, black'
  const end = fadeOut ? `black calc(100% - ${ramp}), transparent` : 'black, black'
  return `linear-gradient(to right, ${start}, ${end})`
}

type Props = {
  duration: number
  viewStart: number
  viewSpan: number
  time: number
  clips: Clip[]
  fades: ClipFade[]
  pendingStart: number | null
  onSeek: (time: number) => void
  onClipChange: (clip: Clip) => void
}

export function Timeline({ duration, viewStart, viewSpan, time, clips, fades, pendingStart, onSeek, onClipChange }: Props) {
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
      title={t.timelineHelp}
      className="relative h-11 w-full cursor-pointer touch-none select-none overflow-hidden rounded-lg bg-sunken"
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
          data-fade-in={fades[index].videoFade !== 'none' && index > 0}
          data-fade-out={fades[index].videoFade !== 'none'}
          className="group absolute inset-y-1.5 min-w-3 cursor-grab rounded-md bg-accent/70 transition-colors hover:bg-accent active:cursor-grabbing"
          style={{
            left: pct(clip.start - viewStart),
            width: pct(clip.end - clip.start),
            maskImage: fadeMask(
              fades[index].videoFade !== 'none' && index > 0,
              fades[index].videoFade !== 'none',
              (fades[index].fadeSeconds / (clip.end - clip.start)) * 100
            )
          }}
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => startDrag(e, clip, 'move')}
        >
          <span className="pointer-events-none absolute inset-0 grid place-items-center overflow-hidden text-[10px] font-semibold text-on-accent tabular-nums">
            {index + 1}
          </span>
          <div
            data-testid={`clip-handle-start-${index + 1}`}
            className="absolute inset-y-0 -left-1 w-2.5 cursor-ew-resize after:absolute after:inset-y-2 after:left-1 after:w-0.5 after:rounded-full after:bg-transparent group-hover:after:bg-on-accent"
            onPointerDown={(e) => startDrag(e, clip, 'start')}
          />
          <div
            data-testid={`clip-handle-end-${index + 1}`}
            className="absolute inset-y-0 -right-1 w-2.5 cursor-ew-resize after:absolute after:inset-y-2 after:right-1 after:w-0.5 after:rounded-full after:bg-transparent group-hover:after:bg-on-accent"
            onPointerDown={(e) => startDrag(e, clip, 'end')}
          />
        </div>
      ))}
      {pendingStart !== null && (
        <div
          className="pointer-events-none absolute inset-y-1.5 rounded-md border border-dashed border-accent bg-accent-soft"
          style={{ left: pct(pendingStart - viewStart), width: pct(Math.max(0, time - pendingStart)) }}
        />
      )}
      <div className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-ink" style={{ left: pct(time - viewStart) }} />
    </div>
  )
}
