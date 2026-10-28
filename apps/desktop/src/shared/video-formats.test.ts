import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { VIDEO_EXTENSIONS } from './video-formats'

describe('video formats', () => {
  it('offers Cuts in the Finder for exactly the formats it opens, so Open With never hands it a file it refuses', () => {
    const config = readFileSync(resolve('electron-builder.yml'), 'utf8')
    const listed = config.match(/- ext: \[(.*)\]/)![1].split(', ')
    expect(listed).toEqual(VIDEO_EXTENSIONS)
  })
})
