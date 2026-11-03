import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { editorReducer, initialEditor, settingsOf, type EditorAction, type EditorState } from './editor'

const run = (...actions: EditorAction[]) => actions.reduce(editorReducer, initialEditor(DEFAULT_SETTINGS))
const twoClips = (): EditorState =>
  run({ type: 'markStart', time: 0 }, { type: 'markEnd', time: 10, id: 'a' }, { type: 'markStart', time: 20 }, { type: 'markEnd', time: 30, id: 'b' })

describe('editor', () => {
  it('changing settings with a clip selected only touches that clip', () => {
    const state = [{ type: 'select', id: 'a' } as const, { type: 'settings', change: { videoFade: 'white' } } as const].reduce(editorReducer, twoClips())
    expect(settingsOf(state, 'a').videoFade).toBe('white')
    expect(settingsOf(state, 'b').videoFade).toBe('black')
  })

  it('with nothing selected, settings change the defaults and every clip', () => {
    const own = [{ type: 'select', id: 'a' } as const, { type: 'settings', change: { framing: 'fit' } } as const, { type: 'select', id: null } as const]
    const state = [...own, { type: 'settings', change: { videoFade: 'none' } } as const].reduce(editorReducer, twoClips())
    expect(state.defaultSettings.videoFade).toBe('none')
    expect(settingsOf(state, 'a')).toMatchObject({ videoFade: 'none', framing: 'fit' })
    expect(settingsOf(state, 'b').videoFade).toBe('none')
  })

  it('split copies the clip settings to the new half', () => {
    const state = [
      { type: 'select', id: 'a' } as const,
      { type: 'settings', change: { framing: 'fit' } } as const,
      { type: 'split', id: 'a', time: 5, newId: 'a2' } as const
    ].reduce(editorReducer, twoClips())
    expect(settingsOf(state, 'a2').framing).toBe('fit')
  })

  it('undo restores clips but keeps the selection valid', () => {
    const state = [{ type: 'select', id: 'b' } as const, { type: 'undo' } as const].reduce(editorReducer, twoClips())
    expect(state.history.present.clips.map((c) => c.id)).toEqual(['a'])
    expect(state.selectedId).toBeNull()
  })

  it('load merges stored settings over DEFAULT_SETTINGS so old sessions keep working', () => {
    const state = editorReducer(initialEditor(DEFAULT_SETTINGS), {
      type: 'load',
      defaults: DEFAULT_SETTINGS,
      session: { clips: [{ id: 'a', start: 0, end: 5 }], clipSettings: { a: { videoFade: 'white' } as never }, defaultSettings: {} as never, baseName: 'set' }
    })
    expect(settingsOf(state, 'a')).toEqual({ ...DEFAULT_SETTINGS, videoFade: 'white' })
    expect(state.history.past).toEqual([])
  })

  it('a half-marked clip can be cancelled without touching the others', () => {
    const state = [{ type: 'markStart', time: 40 } as const, { type: 'cancelMark' } as const].reduce(editorReducer, twoClips())
    expect(state.history.present.pendingStart).toBeNull()
    expect(state.history.present.clips.map((c) => c.id)).toEqual(['a', 'b'])
  })
})
