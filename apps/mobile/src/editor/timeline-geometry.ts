import type { Clip } from '@cuts/core/clips'
import type { DragMode } from '@cuts/core/drag-clip'

export type View = { start: number; span: number; width: number }

const MIN_SPAN = 30

export const timeAt = (view: View, x: number) => view.start + (x / view.width) * view.span

export const xAt = (view: View, time: number) => ((time - view.start) / view.span) * view.width

export function pinch(view: View, duration: number, scale: number, focusX: number): View {
  const focus = timeAt(view, focusX)
  const span = Math.min(duration, Math.max(Math.min(MIN_SPAN, duration), view.span / scale))
  const start = Math.min(duration - span, Math.max(0, focus - (focusX / view.width) * span))
  return { start, span, width: view.width }
}

export function hitClip(clips: Clip[], view: View, x: number, edgeSlop: number): { id: string; mode: DragMode } | null {
  let best: { id: string; mode: DragMode; distance: number } | null = null
  for (const clip of clips) {
    for (const [mode, edge] of [['start', clip.start], ['end', clip.end]] as const) {
      const distance = Math.abs(xAt(view, edge) - x)
      if (distance <= edgeSlop && (!best || distance < best.distance)) best = { id: clip.id, mode, distance }
    }
  }
  if (best) return { id: best.id, mode: best.mode }
  const inside = clips.find((clip) => xAt(view, clip.start) < x && x < xAt(view, clip.end))
  return inside ? { id: inside.id, mode: 'move' } : null
}
