import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { importOverlay, isOwnedOverlay, pngSize, type OverlayDeps } from './overlay'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]

function png(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24)
  bytes.set(SIGNATURE)
  const view = new DataView(bytes.buffer)
  view.setUint32(8, 13)
  bytes.set([0x49, 0x48, 0x44, 0x52], 12)
  view.setUint32(16, width)
  view.setUint32(20, height)
  return bytes
}

const realDeps = (now: number): OverlayDeps => ({
  read: async (path) => new Uint8Array(await readFile(path)),
  write: async (path, bytes) => {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
  },
  list: (dir) => readdir(dir),
  remove: (path) => rm(path, { force: true }),
  now: () => now
})

describe('pngSize', () => {
  it('reads the real dimensions so the overlay keeps its aspect ratio', () => {
    expect(pngSize(png(200, 100))).toEqual({ width: 200, height: 100 })
  })

  it('rejects a JPEG renamed to .png so ffmpeg never gets a file it cannot overlay', () => {
    const jpeg = new Uint8Array(24)
    jpeg.set([0xff, 0xd8, 0xff, 0xe0])
    expect(pngSize(jpeg)).toBeNull()
  })

  it('rejects a truncated file', () => {
    expect(pngSize(new Uint8Array(SIGNATURE))).toBeNull()
  })
})

describe('importOverlay', () => {
  it('replaces the previous copy so only one overlay lives in the app data', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cuts-overlay-'))
    const dir = join(root, 'overlays')
    const source = join(root, 'logo.png')
    await writeFile(source, png(200, 100))
    const first = await importOverlay(source, dir, realDeps(1))
    const second = await importOverlay(source, dir, realDeps(2))
    expect(second).toEqual({ path: join(dir, 'overlay-2.png'), aspect: 0.5, name: 'logo.png' })
    expect(first?.path).toBe(join(dir, 'overlay-1.png'))
    expect(await readdir(dir)).toEqual(['overlay-2.png'])
  })

  it('keeps the overlay you already had when the new file is not a PNG', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cuts-overlay-'))
    const dir = join(root, 'overlays')
    const good = join(root, 'logo.png')
    const bad = join(root, 'notes.png')
    await writeFile(good, png(200, 100))
    await writeFile(bad, 'plain text')
    await importOverlay(good, dir, realDeps(1))
    expect(await importOverlay(bad, dir, realDeps(2))).toBeNull()
    expect(await readdir(dir)).toEqual(['overlay-1.png'])
  })
})

describe('isOwnedOverlay', () => {
  it('accepts a file directly inside the overlays folder', () => {
    expect(isOwnedOverlay('/data/overlays/overlay-1.png', '/data/overlays')).toBe(true)
  })

  it('refuses paths that escape the folder so a renderer cannot feed ffmpeg arbitrary files', () => {
    expect(isOwnedOverlay('/data/overlays/../secret.png', '/data/overlays')).toBe(false)
    expect(isOwnedOverlay('/data/overlays/nested/a.png', '/data/overlays')).toBe(false)
    expect(isOwnedOverlay('/etc/passwd', '/data/overlays')).toBe(false)
  })
})
