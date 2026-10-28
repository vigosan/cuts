import { describe, expect, it } from 'vitest'
import { snapToBeat } from './beats'

const RATE = 50

function kicks(seconds: number, every: number, offset = 0): Float32Array {
  const peaks = new Float32Array(seconds * RATE).fill(0.2)
  for (let beat = offset; beat < seconds; beat += every) {
    const at = Math.round(beat * RATE)
    for (let i = 0; i < 5 && at + i < peaks.length; i++) peaks[at + i] = 0.9 - i * 0.1
  }
  return peaks
}

describe('snapToBeat', () => {
  it('lands on the kick and not on a louder offbeat hit, because it follows the pulse that repeats', () => {
    const peaks = kicks(20, 0.4)
    peaks[Math.round(10.2 * RATE)] = 1
    expect(snapToBeat(10.15, peaks, RATE)).toBe(10)
  })

  it('moves a mark pressed a little late back onto the kick, so the clip starts on the beat', () => {
    expect(snapToBeat(10.18, kicks(20, 0.5), RATE)).toBe(10)
  })

  it('moves a mark pressed a little early forward onto the kick', () => {
    expect(snapToBeat(10.4, kicks(20, 0.5), RATE)).toBe(10.5)
  })

  it('follows the kicks of the track playing at that moment, since a set changes tempo with every mix', () => {
    const peaks = kicks(40, 0.5)
    peaks.set(kicks(20, 0.47, 0.26), 20 * RATE)
    expect(snapToBeat(30.6, peaks, RATE)).toBe(30.6)
    expect(snapToBeat(30.55, peaks, RATE)).toBe(30.6)
  })

  it('leaves the mark where it is in a passage without kicks, like a breakdown', () => {
    expect(snapToBeat(10.18, new Float32Array(20 * RATE).fill(0.4), RATE)).toBe(10.18)
  })

  it('leaves the mark where it is in noise without a pulse, like crowd sound between tracks', () => {
    let seed = 7
    const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647
    const noise = new Float32Array(20 * RATE).map(() => 0.1 + 0.8 * random())
    expect(snapToBeat(10.18, noise, RATE)).toBe(10.18)
  })

  it('leaves the mark where it is in silence', () => {
    expect(snapToBeat(10.18, new Float32Array(20 * RATE), RATE)).toBe(10.18)
  })

  it('ignores hits slower than any dance tempo, which are not a beat to cut on', () => {
    expect(snapToBeat(10.8, kicks(20, 2), RATE)).toBe(10.8)
  })

  it('stays inside the recording at its edges', () => {
    expect(snapToBeat(0.05, kicks(20, 0.5), RATE)).toBe(0)
    expect(snapToBeat(19.99, kicks(20, 0.5, 0.01), RATE)).toBeLessThanOrEqual(20)
  })
})
