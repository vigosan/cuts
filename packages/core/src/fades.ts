import { FADE_SECONDS } from './clips'
import { DEFAULT_FRAMING, type ClipFraming } from './framing'

export type VideoFade = 'black' | 'white' | 'none'
export type AudioFade = 'natural' | 'linear' | 'none'

export const VIDEO_FADES: VideoFade[] = ['black', 'white', 'none']

export const AUDIO_FADES: AudioFade[] = ['natural', 'linear', 'none']

export type ClipFade = { videoFade: VideoFade; audioFade: AudioFade; fadeSeconds: number }

export const DEFAULT_FADE: ClipFade = { videoFade: 'black', audioFade: 'natural', fadeSeconds: FADE_SECONDS }

export type ClipSettings = ClipFade & ClipFraming

export const DEFAULT_SETTINGS: ClipSettings = { ...DEFAULT_FADE, ...DEFAULT_FRAMING }
