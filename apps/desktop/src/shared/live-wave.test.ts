import { describe, expect, it } from 'vitest'
import { LIVE_WAVE_RATE, waveColumns } from './live-wave'

const second = (value: (index: number) => number) => Int16Array.from({ length: LIVE_WAVE_RATE }, (_, i) => value(i))

describe('waveColumns', () => {
  it('draws only the thirtieth of a second at the playhead, like one frame of the exported video', () => {
    const loudFromHalf = second((i) => (i >= LIVE_WAVE_RATE / 2 ? 32767 : 0))
    expect(Math.max(...waveColumns(loudFromHalf, 0.25, 8))).toBe(0)
    expect(Math.min(...waveColumns(loudFromHalf, 0.5, 8))).toBeCloseTo(1, 3)
  })

  it('scales heights by the square root, so quiet passages stay visible as they do in the export', () => {
    const quarter = second(() => 32768 / 4)
    expect(waveColumns(quarter, 0, 4)[0]).toBeCloseTo(0.5, 3)
  })

  it('keeps each column to its own slice of the window, so the shape moves across the wave instead of pulsing as one block', () => {
    const window = LIVE_WAVE_RATE / 30
    const loudAtTheEnd = second((i) => (i >= window / 2 && i < window ? 32767 : 0))
    const columns = waveColumns(loudAtTheEnd, 0, 4)
    expect(columns[0]).toBe(0)
    expect(columns[3]).toBeCloseTo(1, 3)
  })

  it('stays flat past the end of the audio instead of reading outside it', () => {
    expect(Array.from(waveColumns(second(() => 32767), 5, 4))).toEqual([0, 0, 0, 0])
  })
})
