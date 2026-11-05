import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { loadPreferences, savePreferences } from './preferences'
import { memoryStore } from './memory-store'

describe('preferences', () => {
  it('a fresh install uses DEFAULT_SETTINGS and original, with no overlay', () => {
    expect(loadPreferences(memoryStore())).toEqual({ settings: DEFAULT_SETTINGS, format: 'original', overlay: null })
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
