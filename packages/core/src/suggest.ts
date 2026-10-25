import type { Clip } from './clips'

type Moment = { start: number; end: number }

type Options = {
  peaks: Float32Array
  peaksPerSecond: number
  duration: number
  clipLength: number
  existing: Clip[]
}

const LEVEL_FROM = 120
const LEVEL_PERCENTILE = 0.75
const LEVEL_TO = 5
const BREAKDOWN = 0.5
const BACK = 0.9
const STAYS = 0.81
const STAYS_SECONDS = 8
const MAX_WAIT_SECONDS = 180
const MIX_SECONDS = 29
const MAX_MOMENTS = 10
const SILENCE = 0.01

const overlaps = (a: Moment, b: Moment) => a.start < b.end && b.start < a.end
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length
const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.floor(values.length * p)]

function secondsOf(peaks: Float32Array, peaksPerSecond: number): number[] {
  const seconds: number[] = []
  for (let start = 0; start + peaksPerSecond <= peaks.length; start += peaksPerSecond)
    seconds.push(mean(Array.from(peaks.subarray(start, start + peaksPerSecond))))
  return seconds
}

type Drop = { second: number; strength: number }

function findDrops(energy: number[]): Drop[] {
  const smooth = energy.map((_, i) => mean(energy.slice(Math.max(0, i - 1), i + 2)))
  const drops: Drop[] = []
  let second = LEVEL_TO + 1
  while (second < energy.length - STAYS_SECONDS) {
    const level = percentile(energy.slice(Math.max(0, second - LEVEL_FROM), second - LEVEL_TO), LEVEL_PERCENTILE)
    const drop = smooth[second] < BREAKDOWN * level ? breakAfter(energy, smooth, second, level) : null
    if (drop === null) {
      second++
      continue
    }
    const valley = Math.min(...smooth.slice(second, drop))
    const after = mean(energy.slice(drop, drop + STAYS_SECONDS))
    drops.push({ second: drop, strength: Math.log((after + SILENCE) / (valley + SILENCE)) })
    second = drop + 1
  }
  return drops
}

function breakAfter(energy: number[], smooth: number[], breakdown: number, level: number): number | null {
  const last = Math.min(energy.length - STAYS_SECONDS, breakdown + MAX_WAIT_SECONDS)
  for (let t = breakdown + 1; t <= last; t++)
    if (smooth[t] >= BACK * level && mean(energy.slice(t, t + STAYS_SECONDS)) >= STAYS * level) return t
  return null
}

function clipAround(drop: number, clipLength: number, duration: number): Moment {
  const length = Math.min(clipLength, duration)
  const start = Math.min(Math.max(0, drop + MIX_SECONDS - length), duration - length)
  return { start, end: start + length }
}

export function suggestMoments({ peaks, peaksPerSecond, duration, clipLength, existing }: Options): Moment[] {
  const drops = findDrops(secondsOf(peaks, peaksPerSecond)).sort((a, b) => b.strength - a.strength)
  const partLength = duration / MAX_MOMENTS
  const usedParts = new Set<number>()
  const chosen: Moment[] = []
  for (const drop of drops) {
    const part = Math.floor(drop.second / partLength)
    const moment = clipAround(drop.second, clipLength, duration)
    if (usedParts.has(part) || [...existing, ...chosen].some((other) => overlaps(moment, other))) continue
    usedParts.add(part)
    chosen.push(moment)
  }
  return chosen.sort((a, b) => a.start - b.start)
}
