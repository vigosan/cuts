import type { Clip } from './clips'

export type DragMode = 'move' | 'start' | 'end'

export const MIN_CLIP_SECONDS = 1

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function dragClip(clip: Clip, mode: DragMode, delta: number, max: number, min = 0): Clip {
  if (mode === 'start') return { ...clip, start: clamp(clip.start + delta, min, clip.end - MIN_CLIP_SECONDS) }
  if (mode === 'end') return { ...clip, end: clamp(clip.end + delta, clip.start + MIN_CLIP_SECONDS, max) }
  const length = clip.end - clip.start
  const start = clamp(clip.start + delta, min, max - length)
  return { ...clip, start, end: start + length }
}
