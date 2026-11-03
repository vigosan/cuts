import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { loadPreferences, savePreferences } from './preferences'
import { memoryStore } from './memory-store'

describe('preferences', () => {
  it('a fresh install uses DEFAULT_SETTINGS and original', () => {
    expect(loadPreferences(memoryStore())).toEqual({ settings: DEFAULT_SETTINGS, format: 'original' })
  })

  it('remembers the format and fades for the next set, like the Mac', () => {
    const store = memoryStore()
    savePreferences(store, { format: '4:5' })
    savePreferences(store, { settings: { ...DEFAULT_SETTINGS, videoFade: 'white' } })
    expect(loadPreferences(store)).toEqual({ settings: { ...DEFAULT_SETTINGS, videoFade: 'white' }, format: '4:5' })
  })
})
