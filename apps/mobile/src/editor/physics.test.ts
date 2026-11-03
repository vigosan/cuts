import { describe, expect, it } from 'vitest'
import { autoScrollSpeed, elasticSpan, project, reorderTarget, rowShift, rubberband } from './physics'

describe('physics', () => {
  it('a flick keeps travelling like iOS scrolling (Apple projection, 0.998)', () => {
    expect(project(1000)).toBeCloseTo(499, 0)
    expect(project(-500)).toBeCloseTo(-249.5, 0)
    expect(project(0)).toBe(0)
  })

  it('past an edge the motion resists more the further you pull', () => {
    const near = rubberband(10, 300)
    const far = rubberband(100, 300)
    expect(near).toBeLessThan(10)
    expect(far).toBeLessThan(100)
    expect(far / 100).toBeLessThan(near / 10)
  })

  it('pinching past the limits stretches a little instead of stopping dead', () => {
    expect(elasticSpan(20, 30, 600)).toBeGreaterThan(20)
    expect(elasticSpan(20, 30, 600)).toBeLessThan(30)
    expect(elasticSpan(700, 30, 600)).toBeGreaterThan(600)
    expect(elasticSpan(700, 30, 600)).toBeLessThan(700)
    expect(elasticSpan(120, 30, 600)).toBe(120)
  })

  it('the dragged row lands on the slot nearest where it is dropped', () => {
    expect(reorderTarget(0, 100, 48, 4)).toBe(2)
    expect(reorderTarget(3, -500, 48, 4)).toBe(0)
  })

  it('rows between the old and new slot step aside for the dragged one', () => {
    expect(rowShift(1, 0, 2, 48)).toBe(-48)
    expect(rowShift(2, 0, 2, 48)).toBe(-48)
    expect(rowShift(3, 0, 2, 48)).toBe(0)
    expect(rowShift(0, 3, 1, 48)).toBe(0)
    expect(rowShift(1, 3, 1, 48)).toBe(48)
  })

  it('dragging a row near the edge of the list scrolls it, faster the closer you get', () => {
    expect(autoScrollSpeed(150, 300)).toBe(0)
    expect(autoScrollSpeed(30, 300)).toBeLessThan(0)
    expect(autoScrollSpeed(0, 300)).toBeLessThan(autoScrollSpeed(30, 300))
    expect(autoScrollSpeed(280, 300)).toBeGreaterThan(0)
    expect(autoScrollSpeed(320, 300)).toBe(autoScrollSpeed(300, 300))
  })
})
