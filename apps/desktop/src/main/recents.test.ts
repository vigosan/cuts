import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { canRemember, forgetRecent, isListed, loadRecents, MAX_RECENTS, posterFile, posterFrame, posterTime, readPoster, rememberRecent, toRecentVideo } from './recents'

const fileIn = () => join(mkdtempSync(join(tmpdir(), 'cuts-recents-')), 'recent-videos.json')

describe('recents', () => {
  it('lists the last opened video first and only once, so reopening a set moves it to the top instead of repeating it', async () => {
    const file = fileIn()
    await rememberRecent(file, { path: '/Movies/a.mov', openedAt: 1 })
    await rememberRecent(file, { path: '/Movies/b.mov', openedAt: 2 })
    await rememberRecent(file, { path: '/Movies/a.mov', openedAt: 3 })
    expect((await loadRecents(file)).map((entry) => entry.path)).toEqual(['/Movies/a.mov', '/Movies/b.mov'])
  })

  it('keeps only the last few videos, so the start screen stays a short list', async () => {
    const file = fileIn()
    for (let i = 0; i < MAX_RECENTS + 2; i++) await rememberRecent(file, { path: `/Movies/${i}.mov`, openedAt: i })
    const recents = await loadRecents(file)
    expect(recents).toHaveLength(MAX_RECENTS)
    expect(recents[0].path).toBe(`/Movies/${MAX_RECENTS + 1}.mov`)
  })

  it('keeps the sandbox bookmark of a video reopened without one, so the App Store version can still open it next time', async () => {
    const file = fileIn()
    await rememberRecent(file, { path: '/Movies/a.mov', openedAt: 1, bookmark: 'b64' })
    await rememberRecent(file, { path: '/Movies/a.mov', openedAt: 2 })
    expect(await loadRecents(file)).toEqual([{ path: '/Movies/a.mov', openedAt: 2, bookmark: 'b64' }])
  })

  it('remembers a multi-video session in the App Store version only with the bookmarks of its videos, since without them none can be reopened', () => {
    expect(canRemember({ path: 'session:abc', openedAt: 1, sources: ['/a.mov', '/b.mov'] }, true)).toBe(false)
    expect(canRemember({ path: 'session:abc', openedAt: 1, sources: ['/a.mov', '/b.mov'], bookmarks: ['bm1', 'bm2'] }, true)).toBe(true)
    expect(canRemember({ path: 'session:abc', openedAt: 1, sources: ['/a.mov', '/b.mov'] }, false)).toBe(true)
  })

  it('remembers a single video in the App Store version only with its bookmark, since without one it cannot be reopened', () => {
    expect(canRemember({ path: '/a.mov', openedAt: 1 }, true)).toBe(false)
    expect(canRemember({ path: '/a.mov', openedAt: 1, bookmark: 'bm' }, true)).toBe(true)
    expect(canRemember({ path: '/a.mov', openedAt: 1 }, false)).toBe(true)
  })

  it('forgets a video that is gone, so the list never offers a file that cannot open', async () => {
    const file = fileIn()
    await rememberRecent(file, { path: '/Movies/a.mov', openedAt: 1 })
    await rememberRecent(file, { path: '/Movies/b.mov', openedAt: 2 })
    await forgetRecent(file, '/Movies/a.mov')
    expect((await loadRecents(file)).map((entry) => entry.path)).toEqual(['/Movies/b.mov'])
  })

  it('starts with an empty list when there is none yet or it cannot be read, instead of breaking the start screen', async () => {
    const file = fileIn()
    expect(await loadRecents(file)).toEqual([])
    writeFileSync(file, 'not json')
    expect(await loadRecents(file)).toEqual([])
  })

  it('shows each video by its file name and the folder it is in, with its marked clips', () => {
    expect(toRecentVideo({ path: '/Users/vicent/Movies/Sets/halloween.mp4', openedAt: 5, bookmark: 'b64' }, 3, 'data:image/jpeg;base64,AA')).toEqual({
      path: '/Users/vicent/Movies/Sets/halloween.mp4',
      name: 'halloween.mp4',
      folder: 'Sets',
      openedAt: 5,
      clips: 3,
      poster: 'data:image/jpeg;base64,AA'
    })
  })

  it('shows a multi-video session as its first video plus how many more, in the first video\'s folder, so it reads as that set', () => {
    const entry = { path: 'session:abc', openedAt: 5, sources: ['/Users/vicent/Movies/Sets/IMG_0412.mov', '/Volumes/X/IMG_0413.mov', '/Volumes/X/IMG_0414.mov'] }
    expect(toRecentVideo(entry, 2, null)).toEqual({ path: 'session:abc', name: 'IMG_0412.mov +2', folder: 'Sets', openedAt: 5, clips: 2, poster: null })
  })

  it('keeps one poster file per video, so a set is recognised by a frame of it on the start screen', () => {
    const a = posterFile('/posters', '/Users/vicent/Movies/a.mov')
    expect(dirname(a)).toBe(join('/posters'))
    expect(basename(a)).toMatch(/^[0-9a-f]+\.jpg$/)
    expect(posterFile('/posters', '/Users/vicent/Movies/a.mov')).toBe(a)
    expect(posterFile('/posters', '/Users/vicent/Movies/b.mov')).not.toBe(a)
  })

  it('takes the poster from the cover clip, or half a minute in when there are no clips, since the first frames are often black', () => {
    expect(posterTime([{ id: 'a', start: 1405, end: 1450 }, { id: 'b', start: 100, end: 150 }])).toBe(1405)
    expect(posterTime([])).toBe(30)
  })

  it('reads a saved poster as an image the start screen can show, and nothing when there is none yet', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-posters-'))
    const file = join(dir, 'p.jpg')
    expect(await readPoster(file)).toBeNull()
    writeFileSync(file, Buffer.from([1, 2, 3]))
    expect(await readPoster(file)).toBe('data:image/jpeg;base64,AQID')
  })

  it('keeps a multi-video session listed while any of its videos is there, so one unplugged drive never hides the work', () => {
    const entry = { path: 'session:abc', openedAt: 1, sources: ['/a.mov', '/Volumes/X/b.mov'], bookmarks: ['bm-a', 'bm-b'] }
    const seen: [string, string | undefined][] = []
    expect(isListed(entry, (path, bookmark) => (seen.push([path, bookmark]), path === '/Volumes/X/b.mov'))).toBe(true)
    expect(seen).toEqual([['/a.mov', 'bm-a'], ['/Volumes/X/b.mov', 'bm-b']])
    expect(isListed(entry, () => false)).toBe(false)
  })

  it('drops a single video from the list once its file is gone, as before', () => {
    expect(isListed({ path: '/a.mov', openedAt: 1, bookmark: 'bm' }, (path, bookmark) => path === '/a.mov' && bookmark === 'bm')).toBe(true)
    expect(isListed({ path: '/a.mov', openedAt: 1 }, () => false)).toBe(false)
  })

  describe('posterFrame', () => {
    const sources = [
      { path: '/a.mov', name: 'a.mov', duration: 60, width: 1920, height: 1080, hdr: false, missing: false },
      { path: '/b.mov', name: 'b.mov', duration: 40, width: 1920, height: 1080, hdr: false, missing: false }
    ]
    const session = (clips: { id: string; start: number; end: number }[]) => ({ clips, clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, format: '9:16' as const, baseName: 'a', sources })
    const entry = { path: 'session:abc', openedAt: 1, sources: ['/a.mov', '/b.mov'] }

    it('takes a single video\'s poster from its cover clip, as before', () => {
      expect(posterFrame({ path: '/a.mov', openedAt: 1 }, session([{ id: 'x', start: 1405, end: 1450 }]), () => true)).toEqual({ path: '/a.mov', time: 1405 })
    })

    it('takes a session\'s poster from the first clip of its first available video, in that video\'s own time, since the session id is not a file', () => {
      const clips = [{ id: 'x', start: 70, end: 80 }, { id: 'y', start: 10, end: 20 }]
      expect(posterFrame(entry, session(clips), () => true)).toEqual({ path: '/a.mov', time: 10 })
      expect(posterFrame(entry, session(clips), (path) => path === '/b.mov')).toEqual({ path: '/b.mov', time: 10 })
    })

    it('falls back to half a minute into the first available video when it has no clips', () => {
      expect(posterFrame(entry, session([{ id: 'x', start: 70, end: 80 }]), (path) => path === '/a.mov')).toEqual({ path: '/a.mov', time: 30 })
      expect(posterFrame(entry, null, () => true)).toEqual({ path: '/a.mov', time: 30 })
    })

    it('has no poster when every video of the session is gone', () => {
      expect(posterFrame(entry, session([]), () => false)).toBeNull()
    })
  })
})
