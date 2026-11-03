import { clipsReducer, initialClipsState, type ClipsAction, type ClipsState } from '@cuts/core/clips-reducer'
import { DEFAULT_SETTINGS, type ClipSettings } from '@cuts/core/fades'
import { withHistory, type History, type HistoryAction } from '@cuts/core/history'
import type { Session } from './sessions'

export type EditorState = {
  history: History<ClipsState>
  clipSettings: Record<string, ClipSettings>
  defaultSettings: ClipSettings
  selectedId: string | null
  picked: string[] | null
  magnet: boolean
}

export type EditorAction =
  | ClipsAction
  | HistoryAction
  | { type: 'select'; id: string | null }
  | { type: 'settings'; change: Partial<ClipSettings> }
  | { type: 'magnet' }
  | { type: 'cancelMark' }
  | { type: 'pickMode'; on: boolean }
  | { type: 'pick'; id: string }
  | { type: 'load'; session: Session | null; defaults: ClipSettings }

const clipsHistory = withHistory(clipsReducer)

export const initialEditor = (defaults: ClipSettings): EditorState => ({
  history: { past: [], present: initialClipsState, future: [] },
  clipSettings: {},
  defaultSettings: defaults,
  selectedId: null,
  picked: null,
  magnet: true
})

export const settingsOf = (state: EditorState, id: string): ClipSettings => state.clipSettings[id] ?? state.defaultSettings

function changeSettings(state: EditorState, change: Partial<ClipSettings>): EditorState {
  const { selectedId } = state
  if (selectedId) return { ...state, clipSettings: { ...state.clipSettings, [selectedId]: { ...settingsOf(state, selectedId), ...change } } }
  return {
    ...state,
    defaultSettings: { ...state.defaultSettings, ...change },
    clipSettings: Object.fromEntries(Object.entries(state.clipSettings).map(([id, own]) => [id, { ...own, ...change }]))
  }
}

function keepValid(state: EditorState): EditorState {
  const ids = state.history.present.clips.map((clip) => clip.id)
  return {
    ...state,
    selectedId: state.selectedId && ids.includes(state.selectedId) ? state.selectedId : null,
    picked: state.picked && state.picked.filter((id) => ids.includes(id))
  }
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selectedId: action.id }
    case 'settings':
      return changeSettings(state, action.change)
    case 'magnet':
      return { ...state, magnet: !state.magnet }
    case 'cancelMark':
      return { ...state, history: { ...state.history, present: { ...state.history.present, pendingStart: null } } }
    case 'pickMode':
      return { ...state, picked: action.on ? [] : null }
    case 'pick': {
      const picked = state.picked ?? []
      return { ...state, picked: picked.includes(action.id) ? picked.filter((id) => id !== action.id) : [...picked, action.id] }
    }
    case 'load': {
      if (!action.session) return initialEditor(action.defaults)
      const { session } = action
      const empty = initialEditor({ ...DEFAULT_SETTINGS, ...session.defaultSettings })
      return {
        ...empty,
        history: clipsHistory(empty.history, { type: 'restore', clips: session.clips, resetHistory: true }),
        clipSettings: Object.fromEntries(Object.entries(session.clipSettings).map(([id, own]) => [id, { ...DEFAULT_SETTINGS, ...own }]))
      }
    }
    case 'split': {
      const own = state.clipSettings[action.id]
      const next = { ...state, history: clipsHistory(state.history, action) }
      return keepValid(own ? { ...next, clipSettings: { ...next.clipSettings, [action.newId]: own } } : next)
    }
    default:
      return keepValid({ ...state, history: clipsHistory(state.history, action) })
  }
}
