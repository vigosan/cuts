export const LIVE_WAVE_RATE = 8000
export const LIVE_WAVE_CHUNK_SECONDS = 20
export const LIVE_WAVE_FRAMES_PER_SECOND = 30

export function waveColumns(samples: Int16Array, offsetSeconds: number, columns: number): Float32Array {
  const heights = new Float32Array(columns)
  const start = Math.round(offsetSeconds * LIVE_WAVE_RATE)
  const perColumn = LIVE_WAVE_RATE / LIVE_WAVE_FRAMES_PER_SECOND / columns
  for (let column = 0; column < columns; column++) {
    const from = start + Math.floor(column * perColumn)
    const to = Math.max(from + 1, start + Math.floor((column + 1) * perColumn))
    let peak = 0
    for (let i = from; i < to && i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
    heights[column] = Math.sqrt(peak / 32768)
  }
  return heights
}
