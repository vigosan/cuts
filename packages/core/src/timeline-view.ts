import type { Clip } from './clips'

export type Zoom = number | null

export const ZOOM_LEVELS: Zoom[] = [null, 600, 120, 30]

export function nextViewStart(previous: number, time: number, duration: number, span: Zoom): number {
  if (span === null || span >= duration) return 0
  const inside = time >= previous && time <= previous + span
  const start = inside ? previous : time - span / 2
  return Math.min(Math.max(0, start), duration - span)
}

export function viewStartForClip(clip: Clip, duration: number, span: Zoom): number {
  if (span === null || span >= duration) return 0
  const length = clip.end - clip.start
  const start = length <= span ? clip.start - (span - length) / 2 : clip.start - span / 3
  return Math.min(Math.max(0, start), duration - span)
}
