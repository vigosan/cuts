import { describe, expect, it } from 'vitest'
import { clipsReducer, initialClipsState, type ClipsState } from './clips-reducer'

const run = (state: ClipsState, ...actions: Parameters<typeof clipsReducer>[1][]) =>
  actions.reduce(clipsReducer, state)

describe('clipsReducer', () => {
  it('adds a clip from the marked start to the marked end', () => {
    const state = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 60 })
    expect(state.clips).toHaveLength(1)
    expect(state.clips[0]).toMatchObject({ start: 10, end: 60 })
    expect(state.pendingStart).toBeNull()
  })

  it('ignores an end without a start so no half-made clip appears', () => {
    const state = run(initialClipsState, { type: 'markEnd', time: 60 })
    expect(state.clips).toHaveLength(0)
  })

  it('ignores an end before the start so a clip never has negative length', () => {
    const state = run(initialClipsState, { type: 'markStart', time: 60 }, { type: 'markEnd', time: 30 })
    expect(state.clips).toHaveLength(0)
    expect(state.pendingStart).toBe(60)
  })

  it('keeps clips in the order they were added, which is the carousel order', () => {
    const state = run(
      initialClipsState,
      { type: 'markStart', time: 500 },
      { type: 'markEnd', time: 550 },
      { type: 'markStart', time: 100 },
      { type: 'markEnd', time: 150 }
    )
    expect(state.clips.map((c) => c.start)).toEqual([500, 100])
  })

  it('removes a clip', () => {
    const added = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 20 })
    const state = clipsReducer(added, { type: 'remove', id: added.clips[0].id })
    expect(state.clips).toHaveLength(0)
  })

  it('re-sets start or end from the playhead to fine-tune a clip', () => {
    const added = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 80 })
    const id = added.clips[0].id
    const state = run(added, { type: 'setStart', id, time: 21 }, { type: 'setEnd', id, time: 79 })
    expect(state.clips[0]).toMatchObject({ start: 21, end: 79 })
  })

  it('refuses adjustments that would put the end before the start', () => {
    const added = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 80 })
    const id = added.clips[0].id
    expect(run(added, { type: 'setStart', id, time: 90 }).clips[0].start).toBe(10)
    expect(run(added, { type: 'setEnd', id, time: 5 }).clips[0].end).toBe(80)
  })

  it('clears everything when a new video is loaded', () => {
    const added = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 80 }, { type: 'markStart', time: 90 })
    expect(clipsReducer(added, { type: 'reset' })).toEqual(initialClipsState)
  })

  it('replaces a clip with its dragged version', () => {
    const added = run(initialClipsState, { type: 'markStart', time: 10 }, { type: 'markEnd', time: 80 })
    const id = added.clips[0].id
    const state = clipsReducer(added, { type: 'replace', clip: { id, start: 40, end: 99 } })
    expect(state.clips[0]).toEqual({ id, start: 40, end: 99 })
  })

  it('reorders clips, because the list order is the carousel order and decides the cover', () => {
    const added = run(
      initialClipsState,
      { type: 'markStart', time: 10 },
      { type: 'markEnd', time: 20 },
      { type: 'markStart', time: 30 },
      { type: 'markEnd', time: 40 },
      { type: 'markStart', time: 50 },
      { type: 'markEnd', time: 60 }
    )
    expect(clipsReducer(added, { type: 'reorder', from: 2, to: 0 }).clips.map((c) => c.start)).toEqual([50, 10, 30])
    expect(clipsReducer(added, { type: 'reorder', from: 0, to: 2 }).clips.map((c) => c.start)).toEqual([30, 50, 10])
  })

  it('restores the clips saved for a video, dropping any half-marked clip', () => {
    const pending = clipsReducer(initialClipsState, { type: 'markStart', time: 5 })
    const clips = [{ id: 'a', start: 10, end: 20 }]
    expect(clipsReducer(pending, { type: 'restore', clips })).toEqual({ clips, pendingStart: null })
  })
})
