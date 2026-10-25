export type ByteRange = { start: number; end: number }

export function parseRange(header: string | null, size: number): ByteRange | 'invalid' | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match || (match[1] === '' && match[2] === '')) return 'invalid'
  if (match[1] === '') {
    const suffix = Math.min(Number(match[2]), size)
    return { start: size - suffix, end: size - 1 }
  }
  const start = Number(match[1])
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  if (start >= size || end < start) return 'invalid'
  return { start, end }
}
