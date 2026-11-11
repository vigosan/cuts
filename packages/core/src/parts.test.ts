import { describe, expect, it } from 'vitest'
import { confineMoment, localTime, orderVideos, partBoundsAt, partStarts, removePart } from './parts'

const parts = [{ duration: 10 }, { duration: 20 }, { duration: 5 }]
const total = 35

describe('partStarts', () => {
  it('gives where each video begins on the joined timeline', () => {
    expect(partStarts(parts)).toEqual([0, 10, 30])
  })
})

describe('partBoundsAt', () => {
  it('returns the video holding the time so clips can be kept inside it', () => {
    expect(partBoundsAt(parts, 12, total)).toEqual({ start: 10, end: 30 })
  })

  it('gives a clip begun at a join to the next video', () => {
    expect(partBoundsAt(parts, 10, total)).toEqual({ start: 10, end: 30 })
  })

  it('closes the last video so its final instant still belongs to it', () => {
    expect(partBoundsAt(parts, 35, total)).toEqual({ start: 30, end: 35 })
  })

  it('treats a single video as the whole timeline', () => {
    expect(partBoundsAt([{ duration: 35 }], 12, total)).toEqual({ start: 0, end: 35 })
    expect(partBoundsAt([], 12, total)).toEqual({ start: 0, end: 35 })
  })
})

describe('localTime', () => {
  it('maps a joined-timeline time to the time inside its own video', () => {
    expect(localTime(parts, 12)).toEqual({ index: 1, time: 2 })
  })
})

describe('confineMoment', () => {
  it('moves a moment straddling a join fully into the video holding most of it', () => {
    expect(confineMoment(parts, { id: 'a', start: 8, end: 14 })).toEqual({ id: 'a', start: 10, end: 16 })
  })

  it('shortens a moment that is longer than the video it lands in', () => {
    expect(confineMoment(parts, { id: 'a', start: 28, end: 34 })).toEqual({ id: 'a', start: 30, end: 35 })
  })

  it('leaves a moment already inside one video untouched', () => {
    expect(confineMoment(parts, { id: 'a', start: 12, end: 20 })).toEqual({ id: 'a', start: 12, end: 20 })
  })
})

describe('removePart', () => {
  const a = { id: 'a', start: 2, end: 5 }
  const b = { id: 'b', start: 12, end: 15 }
  const c = { id: 'c', start: 31, end: 33 }

  it('drops clips of the removed video and closes the gap for the later ones', () => {
    expect(removePart([a, b, c], parts, 1)).toEqual([a, { id: 'c', start: 11, end: 13 }])
  })

  it('keeps the order the clips were in', () => {
    expect(removePart([c, a], parts, 1)).toEqual([{ id: 'c', start: 11, end: 13 }, a])
  })
})

describe('orderVideos', () => {
  it('appends new videos after the existing ones, in natural filename order, without repeats', () => {
    expect(
      orderVideos(['/a/IMG_0412.mov'], ['/b/IMG_0410.mov', '/a/IMG_0412.mov', '/b/IMG_09.mov']),
    ).toEqual(['/a/IMG_0412.mov', '/b/IMG_09.mov', '/b/IMG_0410.mov'])
  })
})
