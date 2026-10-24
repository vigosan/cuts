import { FADE_SECONDS } from './clips'

export type VideoFade = 'black' | 'white' | 'none'
export type AudioFade = 'natural' | 'linear' | 'none'

export const VIDEO_FADES: { id: VideoFade; label: string }[] = [
  { id: 'black', label: 'Negro' },
  { id: 'white', label: 'Blanco' },
  { id: 'none', label: 'Ninguno' }
]

export const AUDIO_FADES: { id: AudioFade; label: string }[] = [
  { id: 'natural', label: 'Natural' },
  { id: 'linear', label: 'Lineal' },
  { id: 'none', label: 'Ninguno' }
]

export type ClipFade = { videoFade: VideoFade; audioFade: AudioFade; fadeSeconds: number }

export const DEFAULT_FADE: ClipFade = { videoFade: 'black', audioFade: 'natural', fadeSeconds: FADE_SECONDS }
