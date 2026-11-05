import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { Overlay } from '@cuts/core/overlay'
import type { KeyValue } from './sessions'

export type Preferences = { settings: ClipSettings; format: OutputFormat; overlay: Overlay | null }

const KEY = 'preferences'

export function loadPreferences(store: KeyValue): Preferences {
  const stored = JSON.parse(store.get(KEY) ?? '{}') as Partial<Preferences>
  return { settings: { ...DEFAULT_SETTINGS, ...stored.settings }, format: stored.format ?? 'original', overlay: stored.overlay ?? null }
}

export function savePreferences(store: KeyValue, change: Partial<Preferences>): void {
  store.set(KEY, JSON.stringify({ ...loadPreferences(store), ...change }))
}
