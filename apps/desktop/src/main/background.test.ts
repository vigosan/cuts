import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { BACKGROUND_MAX_BYTES, importBackground, isOwnedBackground, type BackgroundDeps } from './background'

const realDeps = (now: number, size?: number): BackgroundDeps => ({
  size: async (path) => size ?? (await stat(path)).size,
  copy: async (from, to) => {
    await mkdir(join(to, '..'), { recursive: true })
    await copyFile(from, to)
  },
  list: (dir) => readdir(dir).catch(() => []),
  remove: (path) => rm(path, { force: true }),
  now: () => now
})

async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'cuts-background-'))
  const dir = join(root, 'backgrounds')
  const source = (name: string) => {
    const path = join(root, name)
    return writeFile(path, `bytes of ${name}`).then(() => path)
  }
  return { dir, source }
}

describe('importBackground', () => {
  it('keeps its own copy of a looping video so moving the original never breaks the export', async () => {
    const { dir, source } = await setup()
    const result = await importBackground(await source('brand loop.mp4'), dir, realDeps(42))
    expect(result).toEqual({ path: join(dir, 'background-42.mp4'), kind: 'video', name: 'brand loop.mp4' })
    expect(await readFile(join(dir, 'background-42.mp4'), 'utf8')).toBe('bytes of brand loop.mp4')
  })

  it('keeps only the latest background so app data does not grow with every change', async () => {
    const { dir, source } = await setup()
    await importBackground(await source('a.mov'), dir, realDeps(1))
    await importBackground(await source('b.png'), dir, realDeps(2))
    expect(await readdir(dir)).toEqual(['background-2.png'])
  })

  it('treats a JPG as a still image whatever the case of its extension', async () => {
    const { dir, source } = await setup()
    const result = await importBackground(await source('cover.JPG'), dir, realDeps(3))
    expect(result).toMatchObject({ kind: 'image', path: join(dir, 'background-3.jpg') })
  })

  it('refuses a file ffmpeg cannot loop as a background', async () => {
    const { dir, source } = await setup()
    expect(await importBackground(await source('anim.gif'), dir, realDeps(4))).toBe('invalid')
    expect(await readdir(dir).catch(() => [])).toEqual([])
  })

  it('refuses a background over 500 MB instead of filling the disk with a copy', async () => {
    const { dir, source } = await setup()
    expect(BACKGROUND_MAX_BYTES).toBe(500 * 1024 * 1024)
    expect(await importBackground(await source('huge.mov'), dir, realDeps(5, 600 * 1024 * 1024))).toBe('too-big')
    expect(await readdir(dir).catch(() => [])).toEqual([])
  })
})

describe('isOwnedBackground', () => {
  it('only lets the media scheme and exports use the copy Cuts made', () => {
    expect(isOwnedBackground('/data/backgrounds/background-1.mp4', '/data/backgrounds')).toBe(true)
    expect(isOwnedBackground('/data/backgrounds/../secret.mp4', '/data/backgrounds')).toBe(false)
    expect(isOwnedBackground('/Users/me/loop.mp4', '/data/backgrounds')).toBe(false)
  })
})
