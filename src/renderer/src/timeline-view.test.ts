import { describe, expect, it } from 'vitest'
import { nextViewStart } from './timeline-view'

const duration = 4880

describe('nextViewStart', () => {
  it('shows the whole session when not zoomed', () => {
    expect(nextViewStart(1234, 3000, duration, null)).toBe(0)
  })

  it('keeps the window still while the playhead is inside it, so a dragged edge stays under the mouse', () => {
    expect(nextViewStart(2900, 3000, duration, 120)).toBe(2900)
  })

  it('centers the window on the playhead when it leaves the window', () => {
    expect(nextViewStart(0, 3000, duration, 120)).toBe(2940)
  })

  it('never shows time before the start of the video', () => {
    expect(nextViewStart(2900, 10, duration, 120)).toBe(0)
  })

  it('never shows time past the end of the video', () => {
    expect(nextViewStart(0, 4870, duration, 120)).toBe(4760)
  })
})
