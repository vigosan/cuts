import { describe, expect, it } from 'vitest'
import { DEFAULT_EXTRAS } from '@cuts/core/audio-layers'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { loadPreferences, savePreferences } from './preferences'
import { memoryStore } from './memory-store'

describe('preferences', () => {
  it('a fresh install uses DEFAULT_SETTINGS and original, with no overlay, no background and the audio layers off', () => {
    expect(loadPreferences(memoryStore())).toEqual({ settings: DEFAULT_SETTINGS, format: 'original', overlay: null, background: null, extras: DEFAULT_EXTRAS })
  })

  it('remembers the background and audio layers for the next recording, like the Mac', () => {
    const store = memoryStore()
    const background = { path: 'background-1.mp4', kind: 'video' as const, name: 'loop.mp4', width: 1920, height: 1080 }
    savePreferences(store, { background, extras: { ...DEFAULT_EXTRAS, waveform: true, color: '#ff0000' } })
    expect(loadPreferences(store)).toMatchObject({ background, extras: { ...DEFAULT_EXTRAS, waveform: true, color: '#ff0000' } })
  })

  it('audio layers saved by an older version get the newer defaults filled in', () => {
    const store = memoryStore()
    store.set('preferences', JSON.stringify({ extras: { waveform: true } }))
    expect(loadPreferences(store).extras).toEqual({ ...DEFAULT_EXTRAS, waveform: true })
  })

  it('remembers the format and fades for the next set, like the Mac', () => {
    const store = memoryStore()
    savePreferences(store, { format: '4:5' })
    savePreferences(store, { settings: { ...DEFAULT_SETTINGS, videoFade: 'white' } })
    expect(loadPreferences(store)).toMatchObject({ settings: { ...DEFAULT_SETTINGS, videoFade: 'white' }, format: '4:5' })
  })

  it('remembers the overlay for the next video, like the Mac, and forgets it when removed', () => {
    const store = memoryStore()
    const overlay = { path: 'file:///overlays/overlay-1.png', aspect: 0.5, name: 'logo.png', x: 0.1, y: 0.2, width: 0.3 }
    savePreferences(store, { overlay })
    savePreferences(store, { format: '1:1' })
    expect(loadPreferences(store).overlay).toEqual(overlay)
    savePreferences(store, { overlay: null })
    expect(loadPreferences(store).overlay).toBeNull()
  })
})
