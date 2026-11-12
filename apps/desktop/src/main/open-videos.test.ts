import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { joinKey } from './join'
import { matchesMissing, openVideos, type OpenDeps } from './open-videos'
import type { Session, Source } from '../shared/api'
import { loadSession, saveSession } from './sessions'

const info = (seconds: number, size = '1920x1080') => `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'x.mov':
  Duration: 00:00:${String(seconds).padStart(2, '0')}.00, start: 0.000000, bitrate: 15250 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), ${size}, 15006 kb/s, 30 fps, 30 tbr, 600 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706d), 48000 Hz, stereo, fltp, 191 kb/s (default)
`

const carry: Session = { clips: [{ id: 'c1', start: 1, end: 2 }], clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, format: '9:16', baseName: 'IMG_0412' }

function fakeDeps(files: Record<string, string>, sessions: Record<string, Session> = {}) {
  const fs = new Map(Object.entries(files))
  const saved = new Map(Object.entries(sessions))
  const deps = {
    exists: (path: string) => fs.has(path),
    info: vi.fn(async (path: string) => fs.get(path) ?? ''),
    loadSession: async (id: string) => saved.get(id) ?? null,
    savedSessions: async () => [...saved.values()],
    saveSession: vi.fn(async (id: string, session: Session) => {
      saved.set(id, session)
    }),
    removeSession: vi.fn(async (id: string) => {
      saved.delete(id)
    }),
    forget: vi.fn(async (_path: string) => {}),
    remember: vi.fn(async () => {}),
    bookmark: (_path: string): string | undefined => undefined,
    now: () => 7
  } satisfies OpenDeps
  return { fs, saved, deps }
}

const A = '/Movies/IMG_0412.MOV'
const B = '/Movies/IMG_0413.MOV'
const id = `session:${joinKey([A, B])}`
const source = (path: string, duration: number, extra: Partial<Source> = {}): Source => ({
  path,
  name: path.slice(path.lastIndexOf('/') + 1),
  duration,
  width: 1920,
  height: 1080,
  hdr: false,
  missing: false,
  ...extra
})

describe('openVideos', () => {
  it('opens a single video as it is, so one video never pays for probing or a session id', async () => {
    const { deps } = fakeDeps({ [A]: info(12) })
    expect(await openVideos([A], null, deps)).toEqual({ ok: true, path: A, sources: [] })
    expect(deps.info).not.toHaveBeenCalled()
    expect(deps.remember).toHaveBeenCalledWith({ path: A, openedAt: 7, bookmark: undefined })
  })

  it('still opens a video when Recents cannot be written, since a full disk or locked list must never block editing', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) })
    deps.remember.mockRejectedValue(new Error('EACCES'))
    expect(await openVideos([A], null, deps)).toEqual({ ok: true, path: A, sources: [] })
    expect(await openVideos([A, B], null, deps)).toMatchObject({ ok: true, path: id })
  })

  it('opens only the first file when the selection has an audio recording, since audio stays single-file', async () => {
    const { deps } = fakeDeps({ '/Music/set.wav': '', [A]: info(12) })
    expect(await openVideos(['/Music/set.wav', A], null, deps)).toEqual({ ok: true, path: '/Music/set.wav', sources: [] })
    expect(deps.info).not.toHaveBeenCalled()
  })

  it('opens several videos straight from the originals under one session id, so nothing is joined or copied before editing', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8, '3840x2160') })
    expect(await openVideos([A, B], null, deps)).toEqual({ ok: true, path: id, sources: [source(A, 12), source(B, 8, { width: 3840, height: 2160 })] })
    expect([...fs.keys()]).toEqual([A, B])
    expect(deps.remember).toHaveBeenCalledWith({ path: id, openedAt: 7, sources: [A, B] })
  })

  it('opens the same session whatever order the videos were picked in, keeping the saved order', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) }, { [id]: { ...carry, sources: [source(B, 8), source(A, 12)] } })
    expect(await openVideos([A, B], null, deps)).toMatchObject({ path: id, sources: [{ path: B }, { path: A }] })
  })

  it('keeps the carried order when X, + or Locate lands on a set saved in another order, so clips stay on the videos they were marked on', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) }, { [id]: { ...carry, sources: [source(B, 8), source(A, 12)] } })
    const opened = await openVideos([A, B], null, deps, { ...carry, sources: [source(A, 12), source(B, 8)] })
    expect(opened.sources.map((source) => source.path)).toEqual([A, B])
  })

  it('flags a video that is gone with the length saved for it, so its stretch and clips keep their place on the timeline', async () => {
    const { deps } = fakeDeps({ [A]: info(12) }, { [id]: { ...carry, sources: [source(A, 12), source(B, 8, { width: 1080, height: 1920, hdr: true })] } })
    expect(await openVideos([A, B], null, deps)).toEqual({
      ok: true,
      path: id,
      sources: [source(A, 12), source(B, 8, { width: 1080, height: 1920, hdr: true, missing: true })]
    })
    expect(deps.info).toHaveBeenCalledTimes(1)
  })

  it('still opens a session whose missing video was never saved, with an empty stretch instead of failing', async () => {
    const { deps } = fakeDeps({ [A]: info(12) })
    expect((await openVideos([A, B], null, deps)).sources[1]).toEqual(source(B, 0, { width: 0, height: 0, missing: true }))
  })

  it('keeps the sandbox bookmarks of every original, so the App Store version can reopen the session after a relaunch', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) })
    await openVideos([A, B], null, { ...deps, bookmark: (path) => `bm:${path}` })
    expect(deps.remember).toHaveBeenCalledWith({ path: id, openedAt: 7, sources: [A, B], bookmarks: [`bm:${A}`, `bm:${B}`] })
  })

  it('saves the carried clips under the new session before removing the old one, so a quit right after X or + never loses them', async () => {
    const C = '/Movies/IMG_0414.MOV'
    const old = `session:${joinKey([A, B, C])}`
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) })
    const calls: string[] = []
    deps.saveSession.mockImplementation(async (path: string) => {
      calls.push(`save ${path}`)
    })
    deps.removeSession.mockImplementation(async (path: string) => {
      calls.push(`remove ${path}`)
    })
    await openVideos([A, B], old, deps, carry)
    expect(deps.saveSession).toHaveBeenCalledWith(id, { ...carry, sources: [source(A, 12), source(B, 8)] })
    expect(calls).toEqual([`save ${id}`, `remove ${old}`])
    expect(deps.forget).toHaveBeenCalledWith(old)
  })

  it('saves no session when nothing is carried, so a plain open keeps whatever was saved for that video', async () => {
    const { deps } = fakeDeps({ [A]: info(12), [B]: info(8) })
    await openVideos([A], id, deps)
    expect(deps.saveSession).not.toHaveBeenCalled()
    expect(deps.removeSession).toHaveBeenCalledWith(id)
  })

  it('keeps the stored length and size of another missing video when reopening under a new id, so its clips and Locate still line up', async () => {
    const C = '/Movies/IMG_0414.MOV'
    const located = '/Volumes/Backup/IMG_0412.MOV'
    const stored = [source(A, 12, { missing: true }), source(B, 8, { width: 1080, height: 1920, missing: true }), source(C, 5)]
    const { deps } = fakeDeps({ [located]: info(12), [C]: info(5) })
    const opened = await openVideos([located, B, C], `session:${joinKey([A, B, C])}`, deps, { ...carry, sources: stored })
    expect(opened.sources).toEqual([source(located, 12), source(B, 8, { width: 1080, height: 1920, missing: true }), source(C, 5)])
  })

  it('keeps the stored length of a located video that is slightly longer, so every later clip stays where it was marked', async () => {
    const located = '/Volumes/Backup/IMG_0412.MOV'
    const { deps } = fakeDeps({ [located]: info(12).replace('12.00', '12.30'), [B]: info(8) })
    const stored = [source(located, 12, { missing: true }), source(B, 8)]
    const opened = await openVideos([located, B], `session:${joinKey([A, B])}`, deps, { ...carry, sources: stored })
    expect(opened.sources.map((source) => source.duration)).toEqual([12, 8])
    expect(opened.sources[0].missing).toBe(false)
  })

  it('stores no video list when X leaves a single video, so its session is never mistaken for a moved multi-video one', async () => {
    const { deps, saved } = fakeDeps({ [A]: info(12) })
    await openVideos([A], id, deps, { ...carry, sources: [source(A, 12), source(B, 8)] })
    expect(saved.get(A)).not.toHaveProperty('sources')
  })

  it('never removes the session of a single video it replaces, since that work belongs to the user\'s own file', async () => {
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8) })
    await openVideos([A, B], A, deps, carry)
    expect(fs.has(A)).toBe(true)
    expect(deps.removeSession).not.toHaveBeenCalled()
    expect(deps.forget).not.toHaveBeenCalled()
  })

  it('restores the clips of a session whose folder was moved, matching names and lengths, and drops the old copy', async () => {
    const oldA = '/Volumes/X/IMG_0412.MOV'
    const oldB = '/Volumes/X/IMG_0413.MOV'
    const old = `session:${joinKey([oldA, oldB])}`
    const { deps, saved } = fakeDeps({ [A]: info(12), [B]: info(8) }, { [old]: { ...carry, sources: [source(oldA, 12.3), source(oldB, 7.8)] } })
    const result = await openVideos([A, B], null, deps)
    expect(result).toEqual({ ok: true, path: id, sources: [source(A, 12), source(B, 8)] })
    expect(saved.get(id)).toEqual({ ...carry, sources: [source(A, 12), source(B, 8)] })
    expect(saved.has(old)).toBe(false)
    expect(deps.forget).toHaveBeenCalledWith(old)
  })

  it('does not take over another session whose videos only share names, since clips must stay on the recording they were marked on', async () => {
    const other = `session:${joinKey(['/Volumes/X/IMG_0412.MOV', '/Volumes/X/IMG_0413.MOV'])}`
    const { deps, saved } = fakeDeps(
      { [A]: info(12), [B]: info(8) },
      { [other]: { ...carry, sources: [source('/Volumes/X/IMG_0412.MOV', 12), source('/Volumes/X/IMG_0413.MOV', 30)] } }
    )
    await openVideos([A, B], null, deps)
    expect(saved.has(id)).toBe(false)
    expect(saved.has(other)).toBe(true)
  })

  it('does not adopt another session when none of the chosen videos is there, since names alone like IMG_0001.MOV repeat across sets', async () => {
    const other = `session:${joinKey(['/Volumes/X/IMG_0412.MOV', '/Volumes/X/IMG_0413.MOV'])}`
    const { deps, saved } = fakeDeps({}, { [other]: { ...carry, sources: [source('/Volumes/X/IMG_0412.MOV', 12), source('/Volumes/X/IMG_0413.MOV', 8)] } })
    await openVideos([A, B], null, deps)
    expect(saved.has(id)).toBe(false)
    expect(saved.has(other)).toBe(true)
  })

  it('remembers the length of a missing video in a session without clips, so its stretch keeps its size and Locate can match it', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-open-'))
    const { deps, fs } = fakeDeps({ [A]: info(12), [B]: info(8) })
    const real = { ...deps, loadSession: (key: string) => loadSession(dir, key), saveSession: (key: string, session: Session) => saveSession(dir, key, session) }
    const opened = await openVideos([A, B], null, real)
    await saveSession(dir, opened.path, { ...carry, clips: [], sources: opened.sources })
    fs.delete(B)
    expect((await openVideos([A, B], null, real)).sources[1]).toEqual(source(B, 8, { missing: true }))
  })
})

describe('matchesMissing', () => {
  it('accepts a located video within half a second of the missing one, since re-saving a file can shift its length slightly', () => {
    expect(matchesMissing(B, info(40), 40.5)).toBe(true)
    expect(matchesMissing(B, info(40), 39.5)).toBe(true)
  })

  it('rejects a located file of another length, so clips are never placed on a different recording', () => {
    expect(matchesMissing(B, info(40), 40.6)).toBe(false)
    expect(matchesMissing(B, '', 40)).toBe(false)
  })

  it('rejects an audio file of the same length, since audio would collapse the session into a single file', () => {
    expect(matchesMissing('/Music/IMG_0413.wav', info(40), 40)).toBe(false)
  })
})
