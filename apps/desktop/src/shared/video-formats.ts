export const VIDEO_EXTENSIONS = ['mov', 'mp4', 'm4v', 'mkv', 'webm']

export const AUDIO_EXTENSIONS = ['wav', 'mp3', 'm4a', 'aac', 'flac']

export const BACKGROUND_EXTENSIONS = ['mov', 'mp4', 'm4v', 'png', 'jpg', 'jpeg']

export type MediaKind = 'video' | 'audio'

export function mediaKind(name: string): MediaKind | null {
  const dot = name.lastIndexOf('.')
  if (dot <= 0) return null
  const extension = name.slice(dot + 1).toLowerCase()
  if (VIDEO_EXTENSIONS.includes(extension)) return 'video'
  if (AUDIO_EXTENSIONS.includes(extension)) return 'audio'
  return null
}

export function isSupportedMedia(name: string): boolean {
  return mediaKind(name) !== null
}
