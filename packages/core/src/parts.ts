export type Part = { duration: number; missing?: boolean }

type Span = { start: number; end: number }

export function partStarts(parts: Part[]): number[] {
  let at = 0
  return parts.map((part) => {
    const start = at
    at += part.duration
    return start
  })
}

function indexAt(parts: Part[], time: number): number {
  const starts = partStarts(parts)
  for (let i = parts.length - 1; i > 0; i--) if (time >= starts[i]) return i
  return 0
}

export function partBoundsAt(parts: Part[], time: number, duration: number): Span {
  if (parts.length < 2) return { start: 0, end: duration }
  const index = indexAt(parts, time)
  const start = partStarts(parts)[index]
  return { start, end: start + parts[index].duration }
}

export function localTime(parts: Part[], time: number): { index: number; time: number } {
  const index = indexAt(parts, time)
  return { index, time: time - (partStarts(parts)[index] ?? 0) }
}

export function confineMoment<T extends Span>(parts: Part[], moment: T): T {
  if (parts.length === 0) return moment
  const starts = partStarts(parts)
  let best = 0
  let bestOverlap = -Infinity
  parts.forEach((part, i) => {
    const overlap = Math.min(moment.end, starts[i] + part.duration) - Math.max(moment.start, starts[i])
    if (overlap > bestOverlap) {
      best = i
      bestOverlap = overlap
    }
  })
  const partStart = starts[best]
  const partEnd = partStart + parts[best].duration
  const length = Math.min(moment.end - moment.start, parts[best].duration)
  const start = Math.min(partEnd - length, Math.max(partStart, moment.start))
  return { ...moment, start, end: start + length }
}

export function removePart<T extends Span>(clips: T[], parts: Part[], index: number): T[] {
  const start = partStarts(parts)[index]
  const end = start + parts[index].duration
  const length = parts[index].duration
  return clips
    .filter((clip) => clip.start < start || clip.start >= end)
    .map((clip) => (clip.start >= end ? { ...clip, start: clip.start - length, end: clip.end - length } : clip))
}

export function orderVideos(existing: string[], added: string[]): string[] {
  const basename = (path: string) => path.slice(path.lastIndexOf('/') + 1)
  const fresh = added
    .filter((path, i) => !existing.includes(path) && added.indexOf(path) === i)
    .sort((a, b) => basename(a).localeCompare(basename(b), undefined, { numeric: true }))
  return [...existing, ...fresh]
}

export function joinPeaks(peaks: (Float32Array | null)[], durations: number[], peaksPerSecond: number): Float32Array {
  const lengths = durations.map((duration) => Math.round(duration * peaksPerSecond))
  const joined = new Float32Array(lengths.reduce((sum, length) => sum + length, 0))
  let at = 0
  peaks.forEach((source, i) => {
    if (source) joined.set(source.subarray(0, lengths[i]), at)
    at += lengths[i]
  })
  return joined
}

export function nextAvailable(parts: Part[], from: number): number | null {
  for (let i = from; i < parts.length; i++) if (!parts[i].missing) return i
  return null
}
