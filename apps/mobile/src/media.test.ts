import { describe, expect, it, vi } from 'vitest'

const native = vi.hoisted(() => ({ exportClip: vi.fn(async () => 'file:///tmp/set-1.mp4'), saveFrame: vi.fn(async () => {}) }))

vi.mock('../modules/cuts-media', () => ({
  default: {
    overlayDir: 'file:///app-support/overlays/',
    backgroundDir: 'file:///app-support/backgrounds/',
    saveFrame: native.saveFrame,
    readPeaks: async () => [0.1, 0.5, 0.25],
    exportClip: native.exportClip,
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

  it('sends the overlay as the flat fields the native record reads', async () => {
    const { exportClip, saveFrame } = await import('./media')
    const overlay = { path: 'file:///overlays/overlay-1.png', x: 0.1, y: 0.2, width: 0.3 }
    const fields = { overlayPath: overlay.path, overlayX: 0.1, overlayY: 0.2, overlayWidth: 0.3 }
    await exportClip('asset', { fileName: 'set-1.mp4', overlay } as never, () => {})
    await saveFrame('asset', 5, { format: '4:5', framing: 'crop', cropX: 0.5, cropY: 0.5, overlay })
    expect(native.exportClip).toHaveBeenLastCalledWith('asset', { fileName: 'set-1.mp4', ...fields })
    expect(native.saveFrame).toHaveBeenLastCalledWith('asset', 5, { format: '4:5', framing: 'crop', cropX: 0.5, cropY: 0.5, ...fields })
  })

  it('sends the background and layers as the flat fields the native record reads, with the background inside the app folder', async () => {
    const { exportClip } = await import('./media')
    const job = {
      fileName: 'set-1.mp4',
      background: { path: 'background-2.mp4', kind: 'video' },
      wave: { x: 0.1, y: 0.7, width: 0.5, color: '#ff0000', opacity: 0.3 },
      bar: { x: 0, y: 0.99, width: 1, color: '#ffffff', opacity: 0.8 },
      bitrate: 4_000_000
    }
    await exportClip('asset', job as never, () => {})
    expect(native.exportClip).toHaveBeenLastCalledWith('asset', {
      fileName: 'set-1.mp4', bitrate: 4_000_000,
      backgroundPath: 'file:///app-support/backgrounds/background-2.mp4', backgroundKind: 'video',
      waveX: 0.1, waveY: 0.7, waveWidth: 0.5, waveColor: '#ff0000', waveOpacity: 0.3,
      barX: 0, barY: 0.99, barWidth: 1, barColor: '#ffffff', barOpacity: 0.8
    })
  })

  it('without an overlay the native call gets no overlay fields, so it exports as before', async () => {
    const { saveFrame } = await import('./media')
    await saveFrame('asset', 5, { format: '4:5', framing: 'crop', cropX: 0.5, cropY: 0.5 })
    expect(native.saveFrame).toHaveBeenLastCalledWith('asset', 5, { format: '4:5', framing: 'crop', cropX: 0.5, cropY: 0.5 })
  })

  it('a stored bare file name is found in the current overlays folder, which iOS may move on an update', async () => {
    const { exportClip, overlayUri, saveFrame } = await import('./media')
    const overlay = { path: 'overlay-1.png', x: 0.1, y: 0.2, width: 0.3 }
    expect(overlayUri('overlay-1.png')).toBe('file:///app-support/overlays/overlay-1.png')
    await exportClip('asset', { fileName: 'set-1.mp4', overlay } as never, () => {})
    await saveFrame('asset', 5, { format: '4:5', framing: 'crop', cropX: 0.5, cropY: 0.5, overlay })
    expect(native.exportClip).toHaveBeenLastCalledWith('asset', expect.objectContaining({ overlayPath: 'file:///app-support/overlays/overlay-1.png' }))
    expect(native.saveFrame).toHaveBeenLastCalledWith('asset', 5, expect.objectContaining({ overlayPath: 'file:///app-support/overlays/overlay-1.png' }))
  })

  it('a full path or URL is used as it is', async () => {
    const { overlayUri } = await import('./media')
    expect(overlayUri('file:///elsewhere/logo.png')).toBe('file:///elsewhere/logo.png')
    expect(overlayUri('/elsewhere/logo.png')).toBe('/elsewhere/logo.png')
  })

  it('finds a stored background by name inside the app folder, which moves when the app updates', async () => {
    const { backgroundUri } = await import('./media')
    expect(backgroundUri('background-2.mp4')).toBe('file:///app-support/backgrounds/background-2.mp4')
  })
})
