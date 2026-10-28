import { describe, expect, it } from 'vitest'
import { audioGain, nearestFadeSeconds, type ClipFade } from './fades'

const fade = (audioFade: ClipFade['audioFade'], fadeSeconds = 2): ClipFade => ({ videoFade: 'black', audioFade, fadeSeconds })

describe('audioGain', () => {
  it('plays at full volume outside the fades', () => {
    expect(audioGain(fade('natural'), 30, 15)).toBe(1)
  })

  it('starts and ends in silence, as the exported clip does', () => {
    expect(audioGain(fade('natural'), 30, 0)).toBe(0)
    expect(audioGain(fade('natural'), 30, 30)).toBe(0)
  })

  it('follows the equal-power curve FFmpeg uses for the natural fade, so the line shows what will be heard', () => {
    expect(audioGain(fade('natural'), 30, 1)).toBeCloseTo(Math.sin(Math.PI / 4))
    expect(audioGain(fade('natural'), 30, 29)).toBeCloseTo(Math.sin(Math.PI / 4))
  })

  it('rises in a straight line for the linear fade', () => {
    expect(audioGain(fade('linear'), 30, 0.5)).toBeCloseTo(0.25)
  })

  it('stays at full volume edge to edge without a fade, so a hard cut is visible', () => {
    expect(audioGain(fade('none'), 30, 0)).toBe(1)
  })

  it('shortens the fades of a short clip to half its length, like the export does', () => {
    expect(audioGain(fade('linear'), 2, 0.5)).toBeCloseTo(0.5)
    expect(audioGain(fade('linear'), 2, 1)).toBe(1)
  })
})

describe('nearestFadeSeconds', () => {
  it('snaps a dragged fade to the lengths the fade menu offers', () => {
    expect(nearestFadeSeconds(0.2)).toBe(0.5)
    expect(nearestFadeSeconds(1.4)).toBe(1)
    expect(nearestFadeSeconds(1.6)).toBe(2)
    expect(nearestFadeSeconds(9)).toBe(2)
  })
})
