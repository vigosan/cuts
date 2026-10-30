import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { forgetRecent, loadRecents, MAX_RECENTS, rememberRecent, toRecentVideo } from './recents'

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
    expect(toRecentVideo({ path: '/Users/vicent/Movies/Sets/halloween.mp4', openedAt: 5, bookmark: 'b64' }, 3)).toEqual({
      path: '/Users/vicent/Movies/Sets/halloween.mp4',
      name: 'halloween.mp4',
      folder: 'Sets',
      openedAt: 5,
      clips: 3
    })
  })
})
