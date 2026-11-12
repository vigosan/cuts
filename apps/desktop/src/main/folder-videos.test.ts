import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { videosInFolder } from './folder-videos'

describe('videosInFolder', () => {
  it('finds the videos of a dropped session folder and nothing else, so a folder opens like selecting all its videos', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'cuts-folder-'))
    for (const name of ['0039190a.mp4', 'IMG_0412.MOV', 'set.wav', 'notes.txt', '._IMG_0412.MOV', '.hidden.mp4']) writeFileSync(join(dir, name), '')
    mkdirSync(join(dir, 'old.mov'))
    mkdirSync(join(dir, 'extras'))
    writeFileSync(join(dir, 'extras', 'IMG_0500.MOV'), '')
    expect((await videosInFolder(dir)).sort()).toEqual([join(dir, '0039190a.mp4'), join(dir, 'IMG_0412.MOV')])
  })
})
