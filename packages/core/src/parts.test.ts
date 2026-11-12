import { describe, expect, it } from 'vitest'
import { confineMoment, joinPeaks, localTime, nextAvailable, orderVideos, partBoundsAt, partStarts, placeClips, removePart } from './parts'

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

describe('placeClips', () => {
  it('moves each clip with its own video when the session is reordered, so a cut never lands on footage from another video', () => {
    const clips = [
      { id: 'a', start: 2, end: 4 },
      { id: 'b', start: 12, end: 15 }
    ]
    const from = [
      { path: '/a.mov', duration: 10 },
      { path: '/c.mov', duration: 20 }
    ]
    const to = [
      { path: '/a.mov', duration: 10 },
      { path: '/b.mov', duration: 5 },
      { path: '/c.mov', duration: 20 }
    ]
    expect(placeClips(clips, from, to)).toEqual([
      { id: 'a', start: 2, end: 4 },
      { id: 'b', start: 17, end: 20 }
    ])
    expect(placeClips(clips, from, [to[2], to[0]])).toEqual([
      { id: 'a', start: 22, end: 24 },
      { id: 'b', start: 2, end: 5 }
    ])
  })

  it('drops a clip whose video is no longer in the session, since its footage is gone', () => {
    expect(placeClips([{ id: 'a', start: 12, end: 14 }], [{ path: '/a.mov', duration: 10 }, { path: '/b.mov', duration: 10 }], [{ path: '/a.mov', duration: 10 }])).toEqual([])
  })
})

describe('joinPeaks', () => {
  it('keeps the waveform lined up with session time even when a file is short or missing', () => {
    const a = new Float32Array([1, 2, 3])
    const b = new Float32Array([1, 2, 3, 4, 5, 6])
    const joined = joinPeaks([a, null, b], [0.1, 0.04, 0.08], 50)
    expect(joined.length).toBe(11)
    expect(Array.from(joined)).toEqual([1, 2, 3, 0, 0, 0, 0, 1, 2, 3, 4])
  })
})

describe('nextAvailable', () => {
  const sources = [{ duration: 1 }, { duration: 1, missing: true }, { duration: 1 }]

  it('skips missing videos so playback never stalls on a file that is gone', () => {
    expect(nextAvailable(sources, 1)).toBe(2)
  })

  it('reports the end of the session when nothing playable remains', () => {
    expect(nextAvailable(sources, 3)).toBeNull()
  })
})
