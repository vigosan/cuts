export type Tile = { time: number; left: number }

const LAST_FRAME_MARGIN = 0.5

export function filmstripTiles(
  viewStart: number,
  viewSpan: number,
  width: number,
  tileWidth: number,
  duration = Infinity
): Tile[] {
  if (width <= 0 || viewSpan <= 0) return []
  const tileSpan = (viewSpan * tileWidth) / width
  const tiles: Tile[] = []
  for (let i = Math.floor(viewStart / tileSpan); i * tileSpan < viewStart + viewSpan; i++) {
    tiles.push({ time: Math.min((i + 0.5) * tileSpan, duration - LAST_FRAME_MARGIN), left: ((i * tileSpan - viewStart) / viewSpan) * 100 })
  }
  return tiles
}

export function waveformColumns(
  peaks: Float32Array,
  peaksPerSecond: number,
  viewStart: number,
  viewSpan: number,
  columns: number
): Float32Array {
  const result = new Float32Array(columns)
  for (let column = 0; column < columns; column++) {
    const from = Math.floor((viewStart + (column * viewSpan) / columns) * peaksPerSecond)
    const to = Math.floor((viewStart + ((column + 1) * viewSpan) / columns) * peaksPerSecond)
    for (let i = Math.max(0, from); i < Math.min(to, peaks.length); i++) {
      if (peaks[i] > result[column]) result[column] = peaks[i]
    }
  }
  return result
}

export type Range = { start: number; end: number }

export function uncoveredRanges(clips: Range[], viewStart: number, viewEnd: number): Range[] {
  if (clips.length === 0) return []
  const ranges: Range[] = []
  let cursor = viewStart
  for (const clip of [...clips].sort((a, b) => a.start - b.start)) {
    if (clip.end <= cursor || clip.start >= viewEnd) continue
    if (clip.start > cursor) ranges.push({ start: cursor, end: clip.start })
    cursor = Math.max(cursor, clip.end)
  }
  if (cursor < viewEnd) ranges.push({ start: cursor, end: viewEnd })
  return ranges
}
