import { clampPlacement, overlayHeight, type OverlayPlacement, type Size } from './overlay'

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
