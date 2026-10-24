import { FADE_SECONDS } from './clips'

export type VideoFade = 'black' | 'white' | 'none'
export type AudioFade = 'natural' | 'linear' | 'none'

export const VIDEO_FADES: VideoFade[] = ['black', 'white', 'none']

export const AUDIO_FADES: AudioFade[] = ['natural', 'linear', 'none']

export type ClipFade = { videoFade: VideoFade; audioFade: AudioFade; fadeSeconds: number }

export const DEFAULT_FADE: ClipFade = { videoFade: 'black', audioFade: 'natural', fadeSeconds: FADE_SECONDS }
