import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { editorReducer, initialEditor } from './editor'
import { beginDrag, dragTo } from './timeline-drag'

const view = { start: 0, span: 100, width: 100 }
const clips = [{ id: 'a', start: 20, end: 40 }]
const onTheBeat = (time: number) => Math.round(time / 0.5) * 0.5

describe('timeline drag', () => {
  it('dragging a clip edge trims it and snaps to the beat', () => {
    const drag = beginDrag(clips, view, 41, 4)
    expect(drag).toEqual({ kind: 'clip', clip: clips[0], mode: 'end' })
    expect(dragTo(drag, 7.3, view, 100, onTheBeat)).toEqual({ id: 'a', start: 20, end: 47.5 })
  })

  it('moving a clip keeps its length and snaps its start', () => {
    const drag = beginDrag(clips, view, 30, 4)
    expect(dragTo(drag, 10.2, view, 100, onTheBeat)).toEqual({ id: 'a', start: 30, end: 50 })
  })

  it('without the magnet the edge follows the finger exactly', () => {
    expect(dragTo(beginDrag(clips, view, 20, 4), -5.25, view, 100, (time) => time)).toEqual({ id: 'a', start: 14.75, end: 40 })
  })

  it('touching empty timeline scrubs instead of grabbing a clip', () => {
    expect(beginDrag(clips, view, 70, 4)).toEqual({ kind: 'scrub' })
  })

  it('a whole drag is a single undo step, like on the Mac', () => {
    const marked = [
      { type: 'markStart', time: 20 } as const,
      { type: 'markEnd', time: 40, id: 'a' } as const
    ].reduce(editorReducer, initialEditor(DEFAULT_SETTINGS))
    const dragged = [
      { type: 'checkpoint' } as const,
      { type: 'replace', clip: { id: 'a', start: 20, end: 42 }, transient: true } as const,
      { type: 'replace', clip: { id: 'a', start: 20, end: 45 }, transient: true } as const
    ].reduce(editorReducer, marked)
    expect(editorReducer(dragged, { type: 'undo' }).history.present.clips).toEqual([{ id: 'a', start: 20, end: 40 }])
  })
  it('dragging inside a clip scrubs, so you never move a clip by accident', () => {
    expect(beginDrag(clips, view, 30, 4)).toEqual({ kind: 'clip', clip: clips[0], mode: 'move' })
    expect(beginDrag(clips, view, 30, 4, { moveClips: false })).toEqual({ kind: 'scrub' })
    expect(beginDrag(clips, view, 41, 4, { moveClips: false })).toEqual({ kind: 'clip', clip: clips[0], mode: 'end' })
  })
})
