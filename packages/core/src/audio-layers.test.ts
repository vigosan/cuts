import { describe, expect, it } from 'vitest'
import { overlayHeight } from './overlay'
import { BAR_ASPECT, WAVE_ASPECT, defaultBarPlacement, defaultWavePlacement } from './audio-layers'

const HD = { width: 1920, height: 1080 }

describe('audio layers', () => {
  it('keeps the waveform as wide and flat as the one in the XTV Remember video', () => {
    expect(WAVE_ASPECT).toBeCloseTo(80 / 998, 3)
  })

  it('starts the waveform centred with its bottom at 86 % of the frame, where it sits in the brand video', () => {
    const wave = defaultWavePlacement(HD)
    expect(wave.width).toBe(0.52)
    expect(wave.x).toBeCloseTo(0.24)
    expect(wave.y + overlayHeight(wave, WAVE_ASPECT, HD)).toBeCloseTo(0.86)
  })

  it('starts the progress bar across the whole bottom edge, 4 px tall in full HD', () => {
    const bar = defaultBarPlacement(HD)
    expect(bar).toMatchObject({ x: 0, width: 1 })
    expect(overlayHeight(bar, BAR_ASPECT, HD) * HD.height).toBeCloseTo(4)
    expect(bar.y + overlayHeight(bar, BAR_ASPECT, HD)).toBeCloseTo(1)
  })

  it('keeps the waveform inside a portrait frame too', () => {
    const portrait = { width: 1080, height: 1920 }
    const wave = defaultWavePlacement(portrait)
    expect(wave.y + overlayHeight(wave, WAVE_ASPECT, portrait)).toBeCloseTo(0.86)
  })
})
