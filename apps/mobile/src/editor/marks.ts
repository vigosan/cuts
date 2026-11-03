import type { ClipsAction, ClipsState } from '@cuts/core/clips-reducer'

export function startHere(_state: ClipsState, time: number, selectedId: string | null): ClipsAction {
  return selectedId ? { type: 'setStart', id: selectedId, time } : { type: 'markStart', time }
}

export function endHere(_state: ClipsState, time: number, selectedId: string | null, newId: string): ClipsAction {
  return selectedId ? { type: 'setEnd', id: selectedId, time } : { type: 'markEnd', time, id: newId }
}
