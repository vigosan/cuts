import { describe, expect, it } from 'vitest'
import { dragClip, MIN_CLIP_SECONDS } from './drag-clip'

const clip = { id: 'a', start: 100, end: 160 }
const duration = 4880

describe('dragClip', () => {
  it('moves the whole clip keeping its length, to slide it onto a better part of the mix', () => {
    expect(dragClip(clip, 'move', 30, duration)).toEqual({ id: 'a', start: 130, end: 190 })
  })

  it('stops a moved clip at the start of the video', () => {
    expect(dragClip(clip, 'move', -500, duration)).toEqual({ id: 'a', start: 0, end: 60 })
  })

  it('stops a moved clip at the end of the video', () => {
    expect(dragClip(clip, 'move', 10_000, duration)).toEqual({ id: 'a', start: 4820, end: 4880 })
  })

  it('drags the start edge to lengthen or shorten from the front', () => {
    expect(dragClip(clip, 'start', -20, duration)).toEqual({ id: 'a', start: 80, end: 160 })
    expect(dragClip(clip, 'start', 15, duration)).toEqual({ id: 'a', start: 115, end: 160 })
  })

  it('drags the end edge to trim an over-long clip down to 59 s', () => {
    expect(dragClip(clip, 'end', -1, duration)).toEqual({ id: 'a', start: 100, end: 159 })
  })

  it('never lets an edge cross the other one', () => {
    expect(dragClip(clip, 'start', 500, duration).start).toBe(160 - MIN_CLIP_SECONDS)
    expect(dragClip(clip, 'end', -500, duration).end).toBe(100 + MIN_CLIP_SECONDS)
  })

  it('never lets an edge leave the video', () => {
    expect(dragClip(clip, 'start', -500, duration).start).toBe(0)
    expect(dragClip(clip, 'end', 10_000, duration).end).toBe(duration)
  })
})
