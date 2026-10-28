import { FADE_OPTIONS, FADE_SECONDS } from './clips'
import { DEFAULT_FRAMING, type ClipFraming } from './framing'

export type VideoFade = 'black' | 'white' | 'none'
export type AudioFade = 'natural' | 'linear' | 'none'

export const VIDEO_FADES: VideoFade[] = ['black', 'white', 'none']

export const AUDIO_FADES: AudioFade[] = ['natural', 'linear', 'none']

export type ClipFade = { videoFade: VideoFade; audioFade: AudioFade; fadeSeconds: number }

export const DEFAULT_FADE: ClipFade = { videoFade: 'black', audioFade: 'natural', fadeSeconds: FADE_SECONDS }

export type ClipSettings = ClipFade & ClipFraming

export const DEFAULT_SETTINGS: ClipSettings = { ...DEFAULT_FADE, ...DEFAULT_FRAMING }

export function audioGain(fade: ClipFade, clipLength: number, at: number): number {
  if (fade.audioFade === 'none') return 1
  const length = Math.min(fade.fadeSeconds, clipLength / 2)
  const into = Math.min(at, clipLength - at) / length
  if (into >= 1) return 1
  const x = Math.max(0, into)
  return fade.audioFade === 'natural' ? Math.sin((x * Math.PI) / 2) : x
}

export function nearestFadeSeconds(seconds: number): number {
  return FADE_OPTIONS.reduce((best, option) => (Math.abs(option - seconds) < Math.abs(best - seconds) ? option : best))
}
