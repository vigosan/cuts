import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'

type Preferences = { settings: ClipSettings; format: OutputFormat; folder: string | null }

const KEY = 'preferences'

export function loadPreferences(): Preferences {
  const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>
  return { settings: { ...DEFAULT_SETTINGS, ...stored.settings }, format: stored.format ?? 'original', folder: stored.folder ?? null }
}

export function savePreferences(change: Partial<Preferences>): void {
  localStorage.setItem(KEY, JSON.stringify({ ...loadPreferences(), ...change }))
}
