import { describe, expect, it } from 'vitest'
import { FORMATS, formatSize } from './formats'

describe('formats', () => {
  it('offers full HD landscape so a whole set can go to YouTube', () => {
    expect(formatSize('16:9')).toEqual({ width: 1920, height: 1080 })
  })

  it('lists 16:9 after the Instagram formats so they stay first in the picker', () => {
    expect(FORMATS.at(-1)?.id).toBe('16:9')
  })
})
