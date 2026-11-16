import { describe, expect, it } from 'vitest'
import { dragOffset, reorderTarget, rowShift, rubberband, settleOffset } from './reorder'

const rows = [40, 40, 40, 40]

describe('rubberband', () => {
  it('follows less and less the further past the edge, so a boundary feels soft instead of frozen', () => {
    const near = rubberband(10, 40)
    const far = rubberband(100, 40)
    expect(near).toBeGreaterThan(0)
    expect(near).toBeLessThan(10)
    expect(far).toBeLessThan(40)
    expect(far - near).toBeLessThan(90)
  })

  it('pulls the same way the pointer went, above or below', () => {
    expect(rubberband(-30, 40)).toBe(-rubberband(30, 40))
  })
})

describe('reorderTarget', () => {
  it('keeps the row in place until it has passed half of its neighbour', () => {
    expect(reorderTarget(rows, 1, 19)).toBe(1)
    expect(reorderTarget(rows, 1, 21)).toBe(2)
  })

  it('moves the row up past several neighbours', () => {
    expect(reorderTarget(rows, 3, -100)).toBe(1)
  })

  it('stops at the ends of the list', () => {
    expect(reorderTarget(rows, 1, 1000)).toBe(3)
    expect(reorderTarget(rows, 1, -1000)).toBe(0)
  })

  it('counts each neighbour by its own height, since a row with a video name is taller', () => {
    expect(reorderTarget([40, 60, 40], 0, 31)).toBe(1)
    expect(reorderTarget([40, 60, 40], 0, 29)).toBe(0)
  })
})

describe('rowShift', () => {
  it('slides the rows between the old and new place out of the way by the dragged row height', () => {
    expect(rowShift([40, 60, 40, 40], 1, 3, 2)).toBe(-60)
    expect(rowShift([40, 60, 40, 40], 1, 3, 3)).toBe(-60)
    expect(rowShift([40, 60, 40, 40], 3, 1, 1)).toBe(40)
  })

  it('leaves the other rows where they are', () => {
    expect(rowShift(rows, 1, 3, 0)).toBe(0)
    expect(rowShift(rows, 3, 1, 0)).toBe(0)
    expect(rowShift(rows, 1, 3, 1)).toBe(0)
  })
})

describe('dragOffset', () => {
  it('tracks the pointer one to one inside the list', () => {
    expect(dragOffset(rows, 1, 50)).toBe(50)
    expect(dragOffset(rows, 1, -40)).toBe(-40)
  })

  it('resists past the first and last rows instead of leaving the list', () => {
    expect(dragOffset(rows, 1, -40 - 30)).toBe(-40 + rubberband(-30, 40))
    expect(dragOffset(rows, 1, 80 + 30)).toBe(80 + rubberband(30, 40))
  })
})

describe('settleOffset', () => {
  it('starts the dropped row from where the pointer left it, so it glides into its slot instead of jumping', () => {
    expect(settleOffset([40, 60, 40, 40], 1, 3, 90)).toBe(10)
    expect(settleOffset(rows, 3, 1, -70)).toBe(10)
    expect(settleOffset(rows, 1, 1, 12)).toBe(12)
  })
})
