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

export function steppedZoom(zoom: Zoom, steps: 1 | -1, duration: number): Zoom {
  const levels = ZOOM_LEVELS.filter((level) => level === null || level < duration)
  const index = Math.max(0, levels.indexOf(zoom))
  return levels[Math.min(Math.max(0, index + steps), levels.length - 1)]
}

export function anchoredViewStart(anchor: number, fraction: number, span: Zoom, duration: number): number {
  if (span === null || span >= duration) return 0
  return Math.min(Math.max(0, anchor - fraction * span), duration - span)
}

export function spacedLabels(positions: number[], minGap: number): boolean[] {
  const shown = positions.map(() => false)
  let last = -Infinity
  for (const index of positions.map((_, i) => i).sort((a, b) => positions[a] - positions[b])) {
    if (positions[index] - last < minGap) continue
    shown[index] = true
    last = positions[index]
  }
  return shown
}
