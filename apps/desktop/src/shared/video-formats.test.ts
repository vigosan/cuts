import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AUDIO_EXTENSIONS, VIDEO_EXTENSIONS, isSupportedMedia, mediaKind } from './video-formats'

describe('video formats', () => {
  it('offers Cuts in the Finder for exactly the formats it opens, so Open With never hands it a file it refuses', () => {
    const config = readFileSync(resolve('electron-builder.yml'), 'utf8')
    const listed = [...config.matchAll(/- ext: \[(.*)\]/g)].map((match) => match[1].split(', '))
    expect(listed).toEqual([VIDEO_EXTENSIONS, AUDIO_EXTENSIONS])
  })

  it('treats a mixer WAV as an audio recording whatever the case of its extension', () => {
    expect(mediaKind('set.WAV')).toBe('audio')
    expect(['mp3', 'm4a', 'aac', 'flac', 'aif', 'aiff'].map((ext) => mediaKind(`a.${ext}`))).toEqual(Array(6).fill('audio'))
  })

  it('keeps videos as videos so their export does not change', () => {
    expect(mediaKind('a.mov')).toBe('video')
  })

  it('refuses files Cuts cannot play instead of failing later', () => {
    expect(mediaKind('notes.txt')).toBeNull()
    expect(mediaKind('wav')).toBeNull()
    expect(isSupportedMedia('notes.txt')).toBe(false)
    expect(isSupportedMedia('set.flac')).toBe(true)
  })
})
