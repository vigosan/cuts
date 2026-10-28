const CONTEXT_SECONDS = 4
const MIN_BEAT_SECONDS = 0.3
const MAX_BEAT_SECONDS = 0.75
const BEFORE = 4
const PULSE = 3

function onsets(peaks: Float32Array, from: number, to: number): Float32Array {
  const onset = new Float32Array(to - from)
  for (let i = Math.max(from, 1); i < to; i++) {
    const start = Math.max(0, i - BEFORE)
    const previous = peaks.slice(start, i).reduce((sum, peak) => sum + peak, 0) / (i - start)
    onset[i - from] = Math.max(0, peaks[i] - previous)
  }
  return onset
}

function beatLength(onset: Float32Array, min: number, max: number): number {
  let best = 0
  let strongest = 0
  for (let length = min; length <= max; length++) {
    let match = 0
    for (let i = 0; i + length < onset.length; i++) match += onset[i] * onset[i + length]
    if (match > strongest) {
      strongest = match
      best = length
    }
  }
  return best
}

const around = (onset: Float32Array, i: number) => Math.max(onset[i - 1] ?? 0, onset[i] ?? 0, onset[i + 1] ?? 0)

export function snapToBeat(time: number, peaks: Float32Array, peaksPerSecond: number): number {
  const center = Math.round(time * peaksPerSecond)
  const from = Math.max(0, center - CONTEXT_SECONDS * peaksPerSecond)
  const to = Math.min(peaks.length, center + CONTEXT_SECONDS * peaksPerSecond)
  const onset = onsets(peaks, from, to)
  const length = beatLength(onset, Math.round(MIN_BEAT_SECONDS * peaksPerSecond), Math.round(MAX_BEAT_SECONDS * peaksPerSecond))
  if (length === 0) return time

  const here = center - from
  let phase = 0
  let strongest = 0
  let beats = 0
  for (let offset = -Math.floor(length / 2); offset < Math.ceil(length / 2); offset++) {
    let sum = 0
    let count = 0
    for (let i = here + offset - Math.floor((here + offset) / length) * length; i < onset.length; i += length) {
      sum += around(onset, i)
      count++
    }
    if (sum > strongest) {
      strongest = sum
      phase = offset
      beats = count
    }
  }
  const average = onset.reduce((sum, value) => sum + value, 0) / onset.length
  if (strongest / beats < PULSE * average) return time

  const reach = Math.floor(length / 4)
  let hit = here + phase
  for (let i = hit - reach; i <= here + phase + reach; i++) if ((onset[i] ?? 0) > (onset[hit] ?? 0)) hit = i
  return Math.min(peaks.length, Math.max(0, from + hit)) / peaksPerSecond
}
