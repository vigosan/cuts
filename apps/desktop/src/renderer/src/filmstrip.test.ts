import { describe, expect, it } from 'vitest'
import { filmstripTiles, uncoveredRanges, waveformColumns } from './filmstrip'

describe('filmstripTiles', () => {
  it('fills the visible width with frames taken at the middle of each tile', () => {
    const tiles = filmstripTiles(0, 100, 500, 100)
    expect(tiles.map((t) => t.time)).toEqual([10, 30, 50, 70, 90])
    expect(tiles.map((t) => t.left)).toEqual([0, 20, 40, 60, 80])
  })

  it('aligns tiles to a fixed grid, so scrolling a zoomed view reuses frames already loaded', () => {
    const before = filmstripTiles(0, 100, 500, 100).map((t) => t.time)
    const after = filmstripTiles(20, 100, 500, 100).map((t) => t.time)
    expect(after.slice(0, 4)).toEqual(before.slice(1))
  })

  it('takes the last frame inside the video, so the filmstrip reaches the end of the timeline', () => {
    const tiles = filmstripTiles(0, 100, 450, 100, 100)
    expect(tiles.at(-1)!.time).toBeLessThan(100)
    expect(tiles).toHaveLength(5)
  })

  it('returns nothing until the timeline has a width and the video a duration', () => {
    expect(filmstripTiles(0, 100, 0, 100)).toEqual([])
    expect(filmstripTiles(0, 0, 500, 100)).toEqual([])
  })
})

describe('waveformColumns', () => {
  it('draws the loudest peak that falls in each pixel column of the visible range', () => {
    const peaks = new Float32Array([0.1, 0.9, 0.2, 0.3, 0.8, 0.1])
    expect(Array.from(waveformColumns(peaks, 2, 0, 3, 3))).toEqual([
      expect.closeTo(0.9),
      expect.closeTo(0.3),
      expect.closeTo(0.8)
    ])
  })

  it('shows silence past the end of the audio', () => {
    expect(Array.from(waveformColumns(new Float32Array([0.5]), 1, 0, 4, 2))).toEqual([expect.closeTo(0.5), 0])
  })
})

describe('uncoveredRanges', () => {
  const clip = (start: number, end: number) => ({ id: `${start}`, start, end })

  it('returns the stretches of the visible range outside every clip, which the timeline dims', () => {
    expect(uncoveredRanges([clip(20, 30), clip(50, 60)], 0, 100)).toEqual([
      { start: 0, end: 20 },
      { start: 30, end: 50 },
      { start: 60, end: 100 }
    ])
  })

  it('merges overlapping clips and ignores clips outside the view', () => {
    expect(uncoveredRanges([clip(40, 70), clip(10, 50), clip(200, 210)], 0, 100)).toEqual([
      { start: 0, end: 10 },
      { start: 70, end: 100 }
    ])
  })

  it('dims nothing while there are no clips, so a fresh video is shown at full brightness', () => {
    expect(uncoveredRanges([], 0, 100)).toEqual([])
  })
})
