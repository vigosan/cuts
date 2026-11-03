import { FADE_OPTIONS } from '@cuts/core/clips'
import { nearestFadeSeconds } from '@cuts/core/fades'

export const fadeSecondsAt = (x: number, width: number, clipLength: number) => nearestFadeSeconds((x / width) * clipLength)

export const fadeHandleX = (seconds: number, width: number, clipLength: number) => (Math.min(seconds, clipLength / 2) / clipLength) * width

export function stepFade(seconds: number, direction: 1 | -1): number {
  const index = FADE_OPTIONS.indexOf(nearestFadeSeconds(seconds))
  return FADE_OPTIONS[Math.min(FADE_OPTIONS.length - 1, Math.max(0, index + direction))]
}
