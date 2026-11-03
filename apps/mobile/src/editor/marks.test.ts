import { describe, expect, it } from 'vitest'
import { clipsReducer, initialClipsState } from '@cuts/core/clips-reducer'
import { endHere, startHere } from './marks'

const withClip = { clips: [{ id: 'a', start: 10, end: 20 }], pendingStart: null }

describe('marks', () => {
  it('with nothing selected, Start then End makes a new clip', () => {
    const started = clipsReducer(initialClipsState, startHere(initialClipsState, 5, null))
    const ended = clipsReducer(started, endHere(started, 12, null, 'new'))
    expect(ended.clips).toEqual([{ id: 'new', start: 5, end: 12 }])
  })

  it('with a clip selected, Start here moves its start to the playhead', () => {
    expect(clipsReducer(withClip, startHere(withClip, 8, 'a')).clips).toEqual([{ id: 'a', start: 8, end: 20 }])
  })

  it('End here on a selected clip moves its end, not a new clip', () => {
    expect(clipsReducer(withClip, endHere(withClip, 25, 'a', 'new')).clips).toEqual([{ id: 'a', start: 10, end: 25 }])
  })
})
