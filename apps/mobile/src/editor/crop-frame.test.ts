import { describe, expect, it } from 'vitest'
import { stepCrop } from './crop-frame'

describe('crop frame', () => {
  it('VoiceOver moves the frame in tenths and never past the edge', () => {
    expect(stepCrop({ cropX: 0.5, cropY: 0.5 }, 1)).toEqual({ cropX: 0.6, cropY: 0.5 })
    expect(stepCrop({ cropX: 0.95, cropY: 0.5 }, 1)).toEqual({ cropX: 1, cropY: 0.5 })
    expect(stepCrop({ cropX: 0.05, cropY: 0.5 }, -1)).toEqual({ cropX: 0, cropY: 0.5 })
  })
})
