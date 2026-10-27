export const VIDEO_EXTENSIONS = ['mov', 'mp4', 'm4v', 'mkv', 'webm']

export function isSupportedVideo(name: string): boolean {
  const dot = name.lastIndexOf('.')
  return dot > 0 && VIDEO_EXTENSIONS.includes(name.slice(dot + 1).toLowerCase())
}
