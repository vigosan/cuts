import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { Overlay } from '@cuts/core/overlay'
import type { AudioExtras, ImportedBackground } from '@shared/api'

type Preferences = {
  settings: ClipSettings
  format: OutputFormat
  folder: string | null
  overlay: Overlay | null
  background: ImportedBackground | null
  extras: AudioExtras
}

const DEFAULT_EXTRAS: AudioExtras = { waveform: true, progressBar: false, color: '#ffffff', opacity: 0.3, wave: null, bar: null }

const KEY = 'preferences'

export function loadPreferences(): Preferences {
  const stored = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<Preferences>
  return { settings: { ...DEFAULT_SETTINGS, ...stored.settings }, format: stored.format ?? 'original', folder: stored.folder ?? null, overlay: stored.overlay ?? null, background: stored.background ?? null, extras: { ...DEFAULT_EXTRAS, ...stored.extras } }
}

export function savePreferences(change: Partial<Preferences>): void {
  localStorage.setItem(KEY, JSON.stringify({ ...loadPreferences(), ...change }))
}
