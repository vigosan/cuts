import { describe, expect, it, vi } from 'vitest'
import { joinKey } from './join'
import { openVideos, type OpenDeps } from './open-videos'
import type { RecentEntry } from './recents'

const DIR = '/userData/joined'

const info = (seconds: number, size = '1920x1080') => `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'x.mov':
  Duration: 00:00:${String(seconds).padStart(2, '0')}.00, start: 0.000000, bitrate: 15250 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), ${size}, 15006 kb/s, 30 fps, 30 tbr, 600 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706d), 48000 Hz, stereo, fltp, 191 kb/s (default)
`

function fakeDeps(files: Record<string, string>, evicted: RecentEntry[] = []) {
  const fs = new Map(Object.entries(files))
  const deps = {
    dir: DIR,
    exists: (path: string) => fs.has(path),
    info: vi.fn(async (path: string) => fs.get(path) ?? ''),
    run: vi.fn(async (args: string[]) => {
      fs.set(args.at(-1)!, 'joined')
    }),
    read: async (path: string) => fs.get(path) ?? null,
    write: async (path: string, text: string) => {
      fs.set(path, text)
    },
    rename: async (from: string, to: string) => {
      fs.set(to, fs.get(from)!)
      fs.delete(from)
    },
    remove: vi.fn(async (path: string) => {
      fs.delete(path)
    }),
    removeSession: vi.fn(async () => {}),
    forget: vi.fn(async () => {}),
    remember: vi.fn(async () => evicted),
    bookmark: () => undefined,
    now: () => 7
  } satisfies OpenDeps
  return { fs, deps }
}

const A = '/Movies/IMG_0412.MOV'
const B = '/Movies/IMG_0413.MOV'
const key = joinKey([A, B])
const joined = `${DIR}/${key}.mov`

describe('openVideos', () => {
  it('opens a single video as it is, so one video never pays for a join', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12) })
    expect(await openVideos([A], null, deps)).toEqual({ ok: true, path: A, sources: [] })
    expect(deps.run).not.toHaveBeenCalled()
    expect(deps.remember).toHaveBeenCalledWith({ path: A, openedAt: 7, bookmark: undefined })
    expect([...fs.keys()]).toEqual([A])
  })

  it('opens only the first file when the selection has an audio recording, since audio stays single-file', async () => {
    const { deps } = fakeDeps({ '/Music/set.wav': '', [A]: info(12) })
    expect(await openVideos(['/Music/set.wav', A], null, deps)).toEqual({ ok: true, path: '/Music/set.wav', sources: [] })
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('joins several videos once and reuses the joined file next time, so reopening a set is instant', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8) })
    const sources = [
      { path: A, name: 'IMG_0412.MOV', duration: 12 },
      { path: B, name: 'IMG_0413.MOV', duration: 8 }
    ]
    expect(await openVideos([A, B], null, deps)).toEqual({ ok: true, path: joined, sources })
    expect(fs.get(joined)).toBe('joined')
    expect(JSON.parse(fs.get(`${DIR}/${key}.json`)!)).toEqual({ sources })
    expect(deps.remember).toHaveBeenCalledWith({ path: joined, openedAt: 7, sources: [A, B] })
    expect(await openVideos([B, A], null, deps)).toEqual({ ok: true, path: joined, sources })
    expect(deps.run).toHaveBeenCalledTimes(1)
  })

  it('leaves no joined file after a failed join and joins again next time, so a broken file is never reused', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8) })
    deps.run.mockImplementationOnce(async (args: string[]) => {
      fs.set(args.at(-1)!, 'half')
      throw new Error('disk full')
    })
    await expect(openVideos([A, B], null, deps)).rejects.toThrow('disk full')
    expect([...fs.keys()]).toEqual([A, B])
    expect(await openVideos([A, B], null, deps)).toMatchObject({ ok: true, path: joined })
    expect(deps.run).toHaveBeenCalledTimes(2)
  })

  it('names a missing original instead of joining, so the user knows which file to bring back', async () => {
    const { deps } = fakeDeps({ [A]: info(12) })
    expect(await openVideos([A, B], null, deps)).toEqual({ ok: false, problem: 'missing', name: 'IMG_0413.MOV' })
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('names the video that cannot be joined as it is, so nothing is re-encoded behind the user\'s back', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8, '3840x2160') })
    expect(await openVideos([A, B], null, deps)).toEqual({ ok: false, problem: 'mismatch', name: 'IMG_0413.MOV' })
    expect(deps.run).not.toHaveBeenCalled()
  })

  it('keeps the sandbox bookmarks of every original, so the App Store version can rejoin after a relaunch', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) })
    await openVideos([A, B], null, { ...deps, bookmark: (path) => `bm:${path}` })
    expect(deps.remember).toHaveBeenCalledWith({ path: joined, openedAt: 7, sources: [A, B], bookmarks: [`bm:${A}`, `bm:${B}`] })
  })

  it('discards the joined file it replaces, with its manifest, session and recent, so rejoins do not pile up', async () => {
    const old = `${DIR}/old.mov`
    const { deps, fs } = fakeDeps({ [A]: info(12), [old]: 'joined', [`${DIR}/old.json`]: '{}' })
    await openVideos([A], old, deps)
    expect(fs.has(old)).toBe(false)
    expect(fs.has(`${DIR}/old.json`)).toBe(false)
    expect(deps.removeSession).toHaveBeenCalledWith(old)
    expect(deps.forget).toHaveBeenCalledWith(old)
  })

  it('never deletes an original it replaces, since those are the user\'s own videos', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8) })
    await openVideos([B], A, deps)
    expect(fs.has(A)).toBe(true)
    expect(deps.remove).not.toHaveBeenCalled()
    expect(deps.forget).not.toHaveBeenCalled()
  })

  it('deletes the joined file of a session that falls out of Recents, so joined files never pile up on disk', async () => {
    const gone = `${DIR}/gone.mov`
    const { deps, fs } = fakeDeps({ [A]: info(12), [gone]: 'joined', [`${DIR}/gone.json`]: '{}', [B]: info(8) }, [
      { path: gone, openedAt: 1, sources: [B] },
      { path: B, openedAt: 1 }
    ])
    await openVideos([A], null, deps)
    expect(fs.has(gone)).toBe(false)
    expect(fs.has(`${DIR}/gone.json`)).toBe(false)
    expect(fs.has(B)).toBe(true)
  })
})
