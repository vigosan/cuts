import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { loadSession, recents, removeRecent, saveSession, touchRecent, type Session } from './sessions'
import { memoryStore } from './memory-store'

const session: Session = { clips: [{ id: 'a', start: 0, end: 5 }], clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, baseName: 'set' }
const recent = (n: number) => ({ assetId: `id${n}`, name: `set ${n}`, duration: 3600, clips: n, openedAt: n })

describe('sessions', () => {
  it('a saved session comes back for the same set', () => {
    const store = memoryStore()
    saveSession(store, 'id', session)
    expect(loadSession(store, 'id')).toEqual(session)
    expect(loadSession(store, 'other')).toBeNull()
  })

  it('an empty session is deleted, not stored', () => {
    const store = memoryStore()
    saveSession(store, 'id', session)
    saveSession(store, 'id', { ...session, clips: [] })
    expect(loadSession(store, 'id')).toBeNull()
  })

  it('recents are newest first, unique and capped at 10', () => {
    const store = memoryStore()
    for (let n = 1; n <= 12; n++) touchRecent(store, recent(n))
    touchRecent(store, { ...recent(5), openedAt: 99 })
    const list = recents(store)
    expect(list).toHaveLength(10)
    expect(list[0]).toEqual({ ...recent(5), openedAt: 99 })
    expect(list.filter((r) => r.assetId === 'id5')).toHaveLength(1)
  })
  it('removing a recent hides it from Home but keeps its clips for when it is opened again', () => {
    const store = memoryStore()
    saveSession(store, 'id1', session)
    touchRecent(store, recent(1))
    touchRecent(store, recent(2))
    removeRecent(store, 'id1')
    expect(recents(store).map((r) => r.assetId)).toEqual(['id2'])
    expect(loadSession(store, 'id1')).toEqual(session)
  })
})
