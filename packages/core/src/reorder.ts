const RUBBERBAND = 0.55

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

export function rubberband(overshoot: number, dimension: number): number {
  return (overshoot * dimension * RUBBERBAND) / (dimension + RUBBERBAND * Math.abs(overshoot))
}

export function reorderTarget(heights: number[], from: number, dy: number): number {
  let to = from
  let passed = 0
  while (to + 1 < heights.length && dy > passed + heights[to + 1] / 2) passed += heights[++to]
  while (to > 0 && -dy > passed + heights[to - 1] / 2) passed += heights[--to]
  return to
}

export function rowShift(heights: number[], from: number, to: number, index: number): number {
  if (to > from && index > from && index <= to) return -heights[from]
  if (to < from && index >= to && index < from) return heights[from]
  return 0
}

export function dragOffset(heights: number[], from: number, dy: number): number {
  const min = -sum(heights.slice(0, from))
  const max = sum(heights.slice(from + 1))
  if (dy < min) return min + rubberband(dy - min, heights[from])
  if (dy > max) return max + rubberband(dy - max, heights[from])
  return dy
}

export function settleOffset(heights: number[], from: number, to: number, dy: number): number {
  if (to > from) return dy - sum(heights.slice(from + 1, to + 1))
  if (to < from) return dy + sum(heights.slice(to, from))
  return dy
}
