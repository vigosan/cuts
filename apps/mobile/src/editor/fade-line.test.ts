import { describe, expect, it } from 'vitest'
import { fadeHandleX, fadeSecondsAt, stepFade } from './fade-line'

describe('audio fade line', () => {
  it('handles snap to 0.5, 1, 2, 3 or 5 s, like the Mac', () => {
    expect(fadeSecondsAt(13, 300, 59)).toBe(3)
    expect(fadeSecondsAt(2, 300, 59)).toBe(0.5)
    expect(fadeSecondsAt(80, 300, 59)).toBe(5)
  })

  it('a short clip never draws the handle past its middle', () => {
    expect(fadeHandleX(5, 300, 4)).toBe(150)
  })

  it('VoiceOver steps through the same lengths', () => {
    expect(stepFade(1, 1)).toBe(2)
    expect(stepFade(5, 1)).toBe(5)
    expect(stepFade(0.5, -1)).toBe(0.5)
  })
})
