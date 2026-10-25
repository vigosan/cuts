import { describe, expect, it } from 'vitest'
import { suggestMoments } from './suggest'

const PPS = 50

function envelope(seconds: number, level: (second: number) => number): Float32Array {
  const peaks = new Float32Array(seconds * PPS)
  for (let i = 0; i < peaks.length; i++) peaks[i] = level(Math.floor(i / PPS))
  return peaks
}

function withDrops(seconds: number, drops: number[]) {
  return envelope(seconds, (s) => {
    const drop = drops.find((d) => s >= d - 20 && s < d + 30)
    if (drop === undefined) return 0.2
    return s < drop ? 0.02 : 0.3
  })
}

const suggest = (peaks: Float32Array, duration: number, existing: { id: string; start: number; end: number }[] = []) =>
  suggestMoments({ peaks, peaksPerSecond: PPS, duration, clipLength: 59, existing })

describe('suggestMoments', () => {
  it('splits the minute around the drop: 30 s of build-up before it and 29 s of the mix after it', () => {
    expect(suggest(withDrops(600, [315]), 600)).toEqual([{ start: 285, end: 344 }])
  })

  it('waits until the mix is back to its level before the breakdown, not the first hit of the build-up', () => {
    const peaks = envelope(600, (s) => {
      if (s >= 300 && s < 320) return 0.02
      if (s === 321) return 0.3
      if (s >= 320 && s < 340) return 0.12
      if (s >= 340 && s < 380) return 0.25
      return 0.2
    })
    expect(suggest(peaks, 600)).toEqual([{ start: 310, end: 369 }])
  })

  it('waits through a long breakdown with a bump in the middle until the full mix is back', () => {
    const peaks = envelope(700, (s) => {
      if (s >= 180 && s < 240) return 0.13
      if (s >= 240 && s < 380) return s >= 330 && s < 345 ? 0.13 : 0.04
      if (s >= 380 && s < 430) return 0.3
      return 0.2
    })
    expect(suggest(peaks, 700)).toEqual([{ start: 350, end: 409 }])
  })

  it('ignores a stretch that just gets louder, because without a breakdown there is no drop', () => {
    expect(suggest(envelope(900, (s) => (s >= 100 && s < 200 ? 0.3 : 0.15)), 900)).toEqual([])
  })

  it('finds drops in quiet parts of the session too, because a drop is about the jump, not the volume', () => {
    const peaks = envelope(900, (s) => {
      if (s >= 280 && s < 297) return 0.005
      if (s >= 297 && s < 400) return 0.06
      if (s < 400) return 0.03
      if (s >= 680 && s < 700) return 0.02
      if (s >= 700 && s < 730) return 0.4
      return 0.25
    })
    expect(suggest(peaks, 900)).toEqual([
      { start: 267, end: 326 },
      { start: 670, end: 729 }
    ])
  })

  it('recommends at most 10 moments, the best drop of each part of the session, so the carousel covers the whole set', () => {
    const drops = [
      { at: 100, valley: 0.02 },
      { at: 170, valley: 0.08 },
      { at: 450, valley: 0.08 },
      { at: 1250, valley: 0.02 },
      { at: 1330, valley: 0.02 }
    ]
    const peaks = envelope(2000, (s) => {
      const drop = drops.find(({ at }) => s >= at - 20 && s < at + 30)
      if (drop === undefined) return 0.2
      return s >= drop.at ? 0.3 : drop.valley
    })
    expect(suggest(peaks, 2000).map((m) => m.start + 30)).toEqual([100, 450, 1250])
    const many = Array.from({ length: 12 }, (_, i) => 100 + i * 150)
    expect(suggest(withDrops(1900, many), 1900)).toHaveLength(10)
  })

  it('leaves alone the parts the user already marked, and lists suggestions in video order', () => {
    const moments = suggest(withDrops(1500, [200, 500, 800, 1100]), 1500, [{ id: 'mine', start: 790, end: 849 }])
    expect(moments.map((m) => m.start)).toEqual([170, 470, 1070])
  })

  it('never suggests two clips that share the same moment, keeping the stronger drop', () => {
    const peaks = envelope(600, (s) => {
      if (s >= 280 && s < 300) return 0.08
      if (s >= 320 && s < 340) return 0.02
      if (s >= 300 && s < 370) return 0.3
      return 0.2
    })
    expect(suggest(peaks, 600)).toEqual([{ start: 310, end: 369 }])
  })

  it('keeps a drop near the start of the video inside it', () => {
    expect(suggest(withDrops(600, [25]), 600)).toEqual([{ start: 0, end: 59 }])
  })

  it('keeps a drop near the end of the video inside it', () => {
    expect(suggest(withDrops(600, [590]), 600)).toEqual([{ start: 541, end: 600 }])
  })

  it('suggests the whole video when it is shorter than one clip', () => {
    expect(suggest(withDrops(40, [25]), 40)).toEqual([{ start: 0, end: 40 }])
  })

  it('suggests nothing when there is no room left between the marked clips', () => {
    expect(suggest(withDrops(100, [50]), 100, [{ id: 'all', start: 0, end: 100 }])).toEqual([])
  })
})
