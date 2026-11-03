import { describe, expect, it } from 'vitest'
import { croppedVideoLayout, stepCrop } from './crop-frame'

describe('crop frame', () => {
  it('VoiceOver moves the frame in tenths and never past the edge', () => {
    expect(stepCrop({ cropX: 0.5, cropY: 0.5 }, 1)).toEqual({ cropX: 0.6, cropY: 0.5 })
    expect(stepCrop({ cropX: 0.95, cropY: 0.5 }, 1)).toEqual({ cropX: 1, cropY: 0.5 })
    expect(stepCrop({ cropX: 0.05, cropY: 0.5 }, -1)).toEqual({ cropX: 0, cropY: 0.5 })
  })
})

describe('cropped preview layout', () => {
  it('scales and shifts the video so only the cropped part fills the box', () => {
    const layout = croppedVideoLayout({ width: 1920, height: 1080 }, { width: 1080, height: 1920 }, { left: 0, top: 0, width: 180, height: 320 }, { cropX: 0.5, cropY: 0.5 })
    expect(layout.height).toBeCloseTo(320)
    expect(layout.width).toBeCloseTo(568.9, 0)
    expect(layout.left).toBeCloseTo(-194.4, 0)
    expect(layout.top).toBeCloseTo(0)
  })

  it('cropping from the left edge shows the left of the video', () => {
    expect(croppedVideoLayout({ width: 1920, height: 1080 }, { width: 1080, height: 1920 }, { left: 0, top: 0, width: 180, height: 320 }, { cropX: 0, cropY: 0.5 }).left).toBe(0)
  })
})
