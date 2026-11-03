import type { Clip } from '@cuts/core/clips'
import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'

export type Session = { clips: Clip[]; clipSettings: Record<string, ClipSettings>; defaultSettings: ClipSettings; baseName: string }
export type Recent = { assetId: string; name: string; duration: number; clips: number; openedAt: number }
export type KeyValue = { get(key: string): string | null; set(key: string, value: string): void; remove(key: string): void }

const MAX_RECENTS = 10
const sessionKey = (assetId: string) => `session:${assetId}`

export function loadSession(store: KeyValue, assetId: string): Session | null {
  const stored = store.get(sessionKey(assetId))
  if (!stored) return null
  const session = JSON.parse(stored) as Session
  return {
    ...session,
    clipSettings: Object.fromEntries(Object.entries(session.clipSettings).map(([id, own]) => [id, { ...DEFAULT_SETTINGS, ...own }])),
    defaultSettings: { ...DEFAULT_SETTINGS, ...session.defaultSettings }
  }
}

export function saveSession(store: KeyValue, assetId: string, session: Session): void {
  if (session.clips.length === 0) store.remove(sessionKey(assetId))
  else store.set(sessionKey(assetId), JSON.stringify(session))
}

export function recents(store: KeyValue): Recent[] {
  return JSON.parse(store.get('recents') ?? '[]') as Recent[]
}

export function touchRecent(store: KeyValue, recent: Recent): void {
  const others = recents(store).filter((r) => r.assetId !== recent.assetId)
  store.set('recents', JSON.stringify([recent, ...others].slice(0, MAX_RECENTS)))
}
