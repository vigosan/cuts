import { describe, expect, it } from 'vitest'
import { cropBox, dragCrop, videoBox } from './framing'

describe('videoBox', () => {
  it('finds where a 16:9 video is drawn inside a taller player, centred with bars above and below', () => {
    expect(videoBox(800, 600, 1280, 720)).toEqual({ left: 0, top: 75, width: 800, height: 450 })
  })
})

describe('cropBox', () => {
  const box = { left: 0, top: 75, width: 800, height: 450 }

  it('places a 9:16 crop in the middle of a 16:9 frame by default', () => {
    const crop = cropBox(box, 1080, 1920, 0.5, 0.5)
    expect(crop.height).toBe(450)
    expect(crop.width).toBeCloseTo(253.125)
    expect(crop.left).toBeCloseTo((800 - 253.125) / 2)
    expect(crop.top).toBe(75)
  })

  it('moves the crop to the left edge when the zone is 0', () => {
    expect(cropBox(box, 1080, 1920, 0, 0.5).left).toBe(0)
  })
})

describe('dragCrop', () => {
  const box = { left: 0, top: 75, width: 800, height: 450 }

  it('turns a horizontal drag into a new zone, relative to the room the crop has to move', () => {
    const room = 800 - 253.125
    expect(dragCrop(box, 1080, 1920, { cropX: 0.5, cropY: 0.5 }, room / 4, 0).cropX).toBeCloseTo(0.75)
  })

  it('never lets the crop leave the video', () => {
    expect(dragCrop(box, 1080, 1920, { cropX: 0.9, cropY: 0.5 }, 1000, 0).cropX).toBe(1)
    expect(dragCrop(box, 1080, 1920, { cropX: 0.1, cropY: 0.5 }, -1000, 0).cropX).toBe(0)
  })

  it('keeps the vertical zone when the crop already fills the whole height', () => {
    expect(dragCrop(box, 1080, 1920, { cropX: 0.5, cropY: 0.5 }, 0, 80).cropY).toBe(0.5)
  })
})
