import { describe, expect, it, vi } from 'vitest'

vi.mock('../modules/cuts-media', () => ({
  default: {
    readPeaks: async () => [0.1, 0.5, 0.25],
    exportClip: async () => 'file:///tmp/set-1.mp4',
    addListener: (_: string, listener: (event: { ratio: number }) => void) => {
      listener({ ratio: 0.5 })
      return { remove: () => {} }
    }
  }
}))

describe('media', () => {
  it('gives peaks as Float32Array so core can read them', async () => {
    const { readPeaks } = await import('./media')
    const peaks = await readPeaks('asset')
    expect(peaks).toBeInstanceOf(Float32Array)
    expect(Array.from(peaks!)).toEqual([Math.fround(0.1), 0.5, 0.25])
  })

  it('reports export progress so the list can fill each clip', async () => {
    const { exportClip } = await import('./media')
    const seen: number[] = []
    await exportClip('asset', {} as never, (ratio) => seen.push(ratio))
    expect(seen).toEqual([0.5])
  })
})
