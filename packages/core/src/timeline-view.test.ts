import { describe, expect, it } from 'vitest'
import { anchoredViewStart, nextViewStart, spacedLabels, steppedZoom, viewStartForClip } from './timeline-view'

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

describe('viewStartForClip', () => {
  it('centers a clip that fits in the zoomed window, so both edges are in sight', () => {
    expect(viewStartForClip({ id: 'a', start: 1000, end: 1060 }, duration, 120)).toBe(970)
  })

  it('puts the start of a clip longer than the window a third of the way in, so what comes before it is still in sight', () => {
    expect(viewStartForClip({ id: 'a', start: 1000, end: 1059 }, duration, 30)).toBe(990)
  })

  it('keeps the window inside the video', () => {
    expect(viewStartForClip({ id: 'a', start: 5, end: 30 }, duration, 120)).toBe(0)
    expect(viewStartForClip({ id: 'a', start: 4860, end: 4880 }, duration, 120)).toBe(4760)
  })

  it('shows the whole session when not zoomed', () => {
    expect(viewStartForClip({ id: 'a', start: 1000, end: 1060 }, duration, null)).toBe(0)
  })
})

describe('spacedLabels', () => {
  it('drops a clip number that would sit on top of the one before it in time, so the numbers never print over each other', () => {
    expect(spacedLabels([0, 100, 110, 125], 20)).toEqual([true, true, false, true])
  })

  it('spaces the numbers by position on screen, not by carousel order, since a reordered clip can sit anywhere', () => {
    expect(spacedLabels([300, 0, 10], 20)).toEqual([true, true, false])
  })
})

describe('steppedZoom', () => {
  it('moves one level closer or further per pinch step, through the same levels as the zoom buttons', () => {
    expect(steppedZoom(null, 1, 4880)).toBe(600)
    expect(steppedZoom(120, 1, 4880)).toBe(30)
    expect(steppedZoom(120, -1, 4880)).toBe(600)
    expect(steppedZoom(600, -1, 4880)).toBe(null)
  })

  it('stays put at the closest and furthest levels', () => {
    expect(steppedZoom(30, 1, 4880)).toBe(30)
    expect(steppedZoom(null, -1, 4880)).toBe(null)
  })

  it('skips levels longer than the video, since they would look the same as the whole video', () => {
    expect(steppedZoom(null, 1, 300)).toBe(120)
    expect(steppedZoom(120, -1, 300)).toBe(null)
  })
})

describe('anchoredViewStart', () => {
  it('keeps the moment under the pointer at the same spot, so a pinch zooms into what you point at', () => {
    expect(anchoredViewStart(1220, 0.25, 600, 4880)).toBe(1070)
  })

  it('stays inside the video', () => {
    expect(anchoredViewStart(10, 0.5, 600, 4880)).toBe(0)
    expect(anchoredViewStart(4870, 0.5, 600, 4880)).toBe(4280)
  })

  it('starts at the beginning when showing the whole video', () => {
    expect(anchoredViewStart(1220, 0.25, null, 4880)).toBe(0)
  })
})
