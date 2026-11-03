import { describe, expect, it } from 'vitest'
import { hitClip, pinch, thumbnailTime, timeAt, xAt } from './timeline-geometry'

const view = { start: 0, span: 600, width: 300 }

describe('timeline geometry', () => {
  it('maps time and x both ways', () => {
    expect(timeAt(view, 150)).toBe(300)
    expect(xAt(view, 300)).toBe(150)
  })

  it('pinch keeps the time under the fingers fixed', () => {
    const zoomed = pinch(view, 3600, 4, 100)
    expect(zoomed.span).toBe(150)
    expect(timeAt(zoomed, 100)).toBeCloseTo(200)
  })

  it('pinch never zooms past 30 s or out past the whole set', () => {
    expect(pinch(view, 3600, 1000, 150).span).toBe(30)
    expect(pinch(view, 3600, 0.001, 150)).toEqual({ start: 0, span: 3600, width: 300 })
  })

  it('pinch keeps the view inside the set', () => {
    expect(pinch({ start: 3000, span: 600, width: 300 }, 3600, 0.5, 300).start).toBe(2400)
  })

  it('a touch near a clip edge grabs the edge, inside grabs the clip', () => {
    const clips = [{ id: 'a', start: 100, end: 200 }]
    expect(hitClip(clips, view, 52, 16)).toEqual({ id: 'a', mode: 'start' })
    expect(hitClip(clips, view, 98, 16)).toEqual({ id: 'a', mode: 'end' })
    expect(hitClip(clips, view, 75, 16)).toEqual({ id: 'a', mode: 'move' })
    expect(hitClip(clips, view, 200, 16)).toBeNull()
  })

  it('zooming reuses the same thumbnails instead of decoding new frames every step', () => {
    expect(thumbnailTime(12.3, 9)).toBe(thumbnailTime(12.9, 10))
    expect(thumbnailTime(301, 140)).toBe(300)
    expect(thumbnailTime(0.4, 0.5)).toBe(0)
  })
})
