import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { KeyValue } from './sessions'

export type Preferences = { settings: ClipSettings; format: OutputFormat }

const KEY = 'preferences'

export function loadPreferences(store: KeyValue): Preferences {
  const stored = JSON.parse(store.get(KEY) ?? '{}') as Partial<Preferences>
  return { settings: { ...DEFAULT_SETTINGS, ...stored.settings }, format: stored.format ?? 'original' }
}

export function savePreferences(store: KeyValue, change: Partial<Preferences>): void {
  store.set(KEY, JSON.stringify({ ...loadPreferences(store), ...change }))
}
