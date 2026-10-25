export const MAX_CLIP_SECONDS = 59
export const FADE_SECONDS = 1
export const FADE_OPTIONS = [0.5, 1, 2]

export type Clip = { id: string; start: number; end: number }

export function clipDuration(clip: Clip): number {
  return clip.end - clip.start
}

export function isOverLimit(clip: Clip): boolean {
  return clipDuration(clip) > MAX_CLIP_SECONDS
}

const pad = (n: number) => String(n).padStart(2, '0')

export function formatTime(seconds: number): string {
  const total = Math.floor(seconds)
  return `${pad(Math.floor(total / 3600))}:${pad(Math.floor((total % 3600) / 60))}:${pad(total % 60)}`
}

export function formatDuration(seconds: number): string {
  const total = Math.ceil(seconds - 1e-6)
  return `${Math.floor(total / 60)}:${pad(total % 60)}`
}

export function safeBaseName(name: string): string {
  return name.trim().replace(/[\\/:*?"<>|]/g, '-')
}

export function outputFileName(base: string, index: number): string {
  return `${base}-${index + 1}.mp4`
}

export function defaultBaseName(path: string): string {
  const name = path.split(/[\\/]/).pop() ?? path
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(0, dot) : name
}
