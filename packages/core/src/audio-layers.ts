import { clampPlacement, overlayHeight, type OverlayPlacement, type Size } from './overlay'

export type AudioExtras = {
  waveform: boolean
  progressBar: boolean
  color: string
  opacity: number
  wave: OverlayPlacement | null
  bar: OverlayPlacement | null
  barColor: string
  barOpacity: number
}

export const DEFAULT_EXTRAS: AudioExtras = { waveform: false, progressBar: false, color: '#ffffff', opacity: 0.3, wave: null, bar: null, barColor: '#ffffff', barOpacity: 0.8 }

export const WAVE_OPACITIES = [0.1, 0.3, 0.5, 0.8, 1]

export const WAVE_ASPECT = 80 / 998
export const BAR_ASPECT = 1 / 480

export function defaultWavePlacement(frame: Size): OverlayPlacement {
  const width = 0.52
  const height = overlayHeight({ x: 0, y: 0, width }, WAVE_ASPECT, frame)
  return clampPlacement({ x: (1 - width) / 2, y: 0.86 - height, width }, WAVE_ASPECT, frame)
}

export function defaultBarPlacement(frame: Size): OverlayPlacement {
  const height = overlayHeight({ x: 0, y: 0, width: 1 }, BAR_ASPECT, frame)
  return { x: 0, y: 1 - height, width: 1 }
}
