import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { Session } from '../shared/api'
import { listSessions, loadSession, removeSession, saveSession } from './sessions'

const snapshot: Session = {
  clips: [{ id: 'a', start: 10, end: 20 }],
  clipSettings: {},
  defaultSettings: { videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5 },
  format: '4:5',
  baseName: 'session'
}

describe('sessions', () => {
  it('brings back the work saved for a video, so closing the app never loses marked clips', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    await saveSession(dir, '/Movies/set with spaces.mov', snapshot)
    expect(await loadSession(dir, '/Movies/set with spaces.mov')).toEqual(snapshot)
  })

  it('keeps each video separate', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    await saveSession(dir, '/Movies/a.mov', snapshot)
    expect(await loadSession(dir, '/Movies/b.mov')).toBeNull()
  })

  it('forgets a video once all its clips are deleted, so nothing is kept for no reason', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    await saveSession(dir, '/Movies/a.mov', snapshot)
    await saveSession(dir, '/Movies/a.mov', { ...snapshot, clips: [] })
    expect(await loadSession(dir, '/Movies/a.mov')).toBeNull()
    expect(readdirSync(dir)).toEqual([])
  })

  it('removes the session of a replaced multi-video session, leaving the others, so X and + never leave orphaned work behind', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    await saveSession(dir, 'session:abc', snapshot)
    await saveSession(dir, '/Movies/b.mov', snapshot)
    await removeSession(dir, 'session:abc')
    expect(await loadSession(dir, 'session:abc')).toBeNull()
    expect(await loadSession(dir, '/Movies/b.mov')).toEqual(snapshot)
  })

  it('fills settings a session saved by an older version lacks, so a new option never breaks reopening old work', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    const old = {
      clips: snapshot.clips,
      clipSettings: { a: { videoFade: 'white', audioFade: 'none', fadeSeconds: 2 } },
      defaultSettings: { videoFade: 'none', audioFade: 'linear', fadeSeconds: 0.5 },
      format: '1:1',
      baseName: 'session'
    }
    await saveSession(dir, '/Movies/a.mov', old as unknown as Session)
    expect(await loadSession(dir, '/Movies/a.mov')).toEqual({
      ...old,
      clipSettings: { a: { videoFade: 'white', audioFade: 'none', fadeSeconds: 2, framing: 'crop', cropX: 0.5, cropY: 0.5 } },
      defaultSettings: { videoFade: 'none', audioFade: 'linear', fadeSeconds: 0.5, framing: 'crop', cropX: 0.5, cropY: 0.5 }
    })
  })

  it('ignores a damaged file instead of failing to open the video', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    await saveSession(dir, '/Movies/a.mov', snapshot)
    const file = join(dir, readdirSync(dir)[0])
    await import('node:fs/promises').then((fs) => fs.writeFile(file, '{ not json'))
    expect(existsSync(file)).toBe(true)
    expect(await loadSession(dir, '/Movies/a.mov')).toBeNull()
  })

  it('lists only the saved multi-video sessions, so a moved folder can be matched by its videos without reading single-video work', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    const sources = [
      { path: '/a.mov', name: 'a.mov', duration: 12, width: 1920, height: 1080, hdr: false, missing: false },
      { path: '/b.mov', name: 'b.mov', duration: 8, width: 1920, height: 1080, hdr: false, missing: false }
    ]
    await saveSession(dir, 'session:abc', { ...snapshot, sources })
    await saveSession(dir, '/Movies/b.mov', snapshot)
    await import('node:fs/promises').then((fs) => fs.writeFile(join(dir, 'broken.json'), '{ not json'))
    expect(await listSessions(dir)).toEqual([{ ...snapshot, sources }])
  })

  it('lists nothing when no session was ever saved, instead of failing to open videos', async () => {
    expect(await listSessions(join(tmpdir(), 'cuts-no-sessions-here'))).toEqual([])
  })

  it('keeps a multi-video session without clips, since it is the only record of its videos\' order and lengths', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-sessions-'))
    const sources = [{ path: '/a.mov', name: 'a.mov', duration: 12, width: 1920, height: 1080, hdr: false, missing: false }]
    await saveSession(dir, 'session:abc', { ...snapshot, clips: [], sources })
    expect(await loadSession(dir, 'session:abc')).toEqual({ ...snapshot, clips: [], sources })
  })
})
