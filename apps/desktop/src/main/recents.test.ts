import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { forgetRecent, loadRecents, MAX_RECENTS, posterFile, posterTime, readPoster, rememberRecent, toRecentVideo } from './recents'

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

  it('keeps one poster file per video, so a set is recognised by a frame of it on the start screen', () => {
    const a = posterFile('/posters', '/Users/vicent/Movies/a.mov')
    expect(a).toMatch(/^\/posters\/[0-9a-f]+\.jpg$/)
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
})
