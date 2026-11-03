const DECELERATION = 0.998
const RUBBER = 0.55

export const project = (velocity: number, rate = DECELERATION) => ((velocity / 1000) * rate) / (1 - rate)

export const rubberband = (overshoot: number, dimension: number) => (overshoot * dimension * RUBBER) / (dimension + RUBBER * Math.abs(overshoot))

export function elasticSpan(span: number, min: number, max: number): number {
  if (span < min) return min - rubberband(min - span, min)
  if (span > max) return max + rubberband(span - max, max)
  return span
}

export const reorderTarget = (index: number, translation: number, height: number, count: number) =>
  Math.min(count - 1, Math.max(0, index + Math.round(translation / height)))

export function rowShift(index: number, from: number, to: number, height: number): number {
  if (from < to && index > from && index <= to) return -height
  if (to < from && index >= to && index < from) return height
  return 0
}

const SCROLL_EDGE = 56
const SCROLL_MAX = 14

export function autoScrollSpeed(position: number, height: number): number {
  const clamped = Math.min(height, Math.max(0, position))
  if (clamped < SCROLL_EDGE) return -SCROLL_MAX * (1 - clamped / SCROLL_EDGE)
  if (clamped > height - SCROLL_EDGE) return SCROLL_MAX * (1 - (height - clamped) / SCROLL_EDGE)
  return 0
}

const FLICK = 500
const DRAG = 40

export function panelExpanded(expanded: boolean, translationY: number, velocityY: number): boolean {
  if (Math.abs(velocityY) > FLICK) return velocityY < 0
  if (translationY < -DRAG) return true
  if (translationY > DRAG) return false
  return expanded
}
