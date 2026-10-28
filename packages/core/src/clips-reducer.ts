import type { Clip } from './clips'

export type ClipsState = { clips: Clip[]; pendingStart: number | null }

type Meta = { transient?: boolean; resetHistory?: boolean }

export type ClipsAction = Meta &
  (  | { type: 'markStart'; time: number }
  | { type: 'markEnd'; time: number; id: string }
  | { type: 'remove'; id: string }
  | { type: 'setStart'; id: string; time: number }
  | { type: 'setEnd'; id: string; time: number }
  | { type: 'replace'; clip: Clip }
  | { type: 'reorder'; from: number; to: number }
  | { type: 'split'; id: string; time: number; newId: string }
  | { type: 'restore'; clips: Clip[] }
  | { type: 'add'; clips: Clip[] }
  | { type: 'reset' }
  )

export const initialClipsState: ClipsState = { clips: [], pendingStart: null }

function updateClip(state: ClipsState, id: string, change: (clip: Clip) => Clip): ClipsState {
  return {
    ...state,
    clips: state.clips.map((clip) => {
      if (clip.id !== id) return clip
      const next = change(clip)
      return next.end > next.start ? next : clip
    })
  }
}

const overlaps = (a: Clip, b: Clip) => a.start < b.end && b.start < a.end

export function clipsReducer(state: ClipsState, action: ClipsAction): ClipsState {
  switch (action.type) {
    case 'markStart':
      return { ...state, pendingStart: action.time }
    case 'markEnd':
      if (state.pendingStart === null || action.time <= state.pendingStart) return state
      return {
        clips: [...state.clips, { id: action.id, start: state.pendingStart, end: action.time }],
        pendingStart: null
      }
    case 'remove':
      return { ...state, clips: state.clips.filter((clip) => clip.id !== action.id) }
    case 'setStart':
      return updateClip(state, action.id, (clip) => ({ ...clip, start: action.time }))
    case 'setEnd':
      return updateClip(state, action.id, (clip) => ({ ...clip, end: action.time }))
    case 'replace':
      return updateClip(state, action.clip.id, () => action.clip)
    case 'reorder': {
      const clips = [...state.clips]
      const [moved] = clips.splice(action.from, 1)
      clips.splice(action.to, 0, moved)
      return { ...state, clips }
    }
    case 'split': {
      const index = state.clips.findIndex((clip) => clip.id === action.id)
      const clip = state.clips[index]
      if (!clip || action.time <= clip.start || action.time >= clip.end) return state
      const clips = [...state.clips]
      clips.splice(index, 1, { ...clip, end: action.time }, { id: action.newId, start: action.time, end: clip.end })
      return { ...state, clips }
    }
    case 'restore':
      return { clips: action.clips, pendingStart: null }
    case 'add':
      return {
        ...state,
        clips: [...state.clips, ...action.clips.filter((clip) => !state.clips.some((other) => overlaps(clip, other)))]
      }
    case 'reset':
      return initialClipsState
  }
}
