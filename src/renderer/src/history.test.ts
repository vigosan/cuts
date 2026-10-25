import { describe, expect, it } from 'vitest'
import { withHistory } from './history'

type Action = { type: 'set'; value: number; transient?: boolean } | { type: 'undo' } | { type: 'redo' } | { type: 'checkpoint' }
const reducer = withHistory((_state: number, action: { type: 'set'; value: number }) => action.value)
const start = { past: [], present: 0, future: [] }
const run = (...actions: Action[]) => actions.reduce(reducer, start)

describe('withHistory', () => {
  it('undoes and redoes changes in order', () => {
    const state = run({ type: 'set', value: 1 }, { type: 'set', value: 2 }, { type: 'undo' })
    expect(state.present).toBe(1)
    expect(reducer(state, { type: 'redo' }).present).toBe(2)
    expect(reducer(reducer(state, { type: 'undo' }), { type: 'undo' }).present).toBe(0)
  })

  it('drops the redo steps once something new is done', () => {
    const state = run({ type: 'set', value: 1 }, { type: 'undo' }, { type: 'set', value: 5 }, { type: 'redo' })
    expect(state.present).toBe(5)
  })

  it('turns a whole drag into one undo step, so one Command-Z puts the clip back', () => {
    const state = run(
      { type: 'checkpoint' },
      { type: 'set', value: 1, transient: true },
      { type: 'set', value: 2, transient: true },
      { type: 'set', value: 3, transient: true },
      { type: 'undo' }
    )
    expect(state.present).toBe(0)
  })

  it('ignores undo and redo with nothing to undo or redo', () => {
    expect(run({ type: 'undo' }).present).toBe(0)
    expect(run({ type: 'redo' }).present).toBe(0)
  })
})
