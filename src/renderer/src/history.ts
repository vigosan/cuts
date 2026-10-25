export type History<S> = { past: S[]; present: S; future: S[] }
export type HistoryAction = { type: 'undo' } | { type: 'redo' } | { type: 'checkpoint' }

const LIMIT = 100

export function withHistory<S, A extends { type: string; transient?: boolean; resetHistory?: boolean }>(reducer: (state: S, action: A) => S) {
  return (state: History<S>, action: A | HistoryAction): History<S> => {
    switch (action.type) {
      case 'undo':
        if (state.past.length === 0) return state
        return { past: state.past.slice(0, -1), present: state.past.at(-1)!, future: [state.present, ...state.future] }
      case 'redo':
        if (state.future.length === 0) return state
        return { past: [...state.past, state.present], present: state.future[0], future: state.future.slice(1) }
      case 'checkpoint':
        return { past: [...state.past, state.present].slice(-LIMIT), present: state.present, future: [] }
    }
    const next = reducer(state.present, action as A)
    if ((action as A).resetHistory) return { past: [], present: next, future: [] }
    if (next === state.present) return state
    if ((action as A).transient) return { ...state, present: next }
    return { past: [...state.past, state.present].slice(-LIMIT), present: next, future: [] }
  }
}
