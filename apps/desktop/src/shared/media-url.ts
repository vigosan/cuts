export const MEDIA_SCHEME = 'media'

export function mediaUrl(path: string): string {
  return `${MEDIA_SCHEME}://file/${encodeURIComponent(path)}`
}

export function pathFromMediaUrl(url: string): string {
  return decodeURIComponent(new URL(url).pathname.slice(1))
}
