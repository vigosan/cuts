import type { Clip } from '@cuts/core/clips'
import { dragClip, type DragMode } from '@cuts/core/drag-clip'
import { hitClip, type View } from './timeline-geometry'

export type Drag = { kind: 'clip'; clip: Clip; mode: DragMode } | { kind: 'scrub' }

export function beginDrag(clips: Clip[], view: View, x: number, edgeSlop: number, { moveClips = true } = {}): Drag {
  const hit = hitClip(clips, view, x, edgeSlop)
  const clip = hit && clips.find((candidate) => candidate.id === hit.id)
  if (!hit || !clip || (hit.mode === 'move' && !moveClips)) return { kind: 'scrub' }
  return { kind: 'clip', clip, mode: hit.mode }
}

export function dragTo(drag: Drag, dx: number, view: View, duration: number, snap: (time: number) => number): Clip | null {
  if (drag.kind === 'scrub') return null
  const { clip, mode } = drag
  const moved = dragClip(clip, mode, (dx / view.width) * view.span, duration)
  const edge = mode === 'end' ? moved.end : moved.start
  return dragClip(moved, mode, snap(edge) - edge, duration)
}
