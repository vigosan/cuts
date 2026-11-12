import { createHash } from 'node:crypto'

export type MediaInfo = { duration: number; width: number; height: number; rotation: number; hdr: boolean; video: string | null; audio: string | null }

export function parseMediaInfo(ffmpegOutput: string): MediaInfo {
  const duration = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpegOutput)
  const video = /Video: (\S+)[^,\n]*, (\w+(?:\([^)\n]*\))?).*?, (\d+)x(\d+)/.exec(ffmpegOutput)
  const videoStream = video ? ffmpegOutput.slice(video.index).split(/\n\s*Stream #/)[0] : ''
  const rotation = Number(/(?:displaymatrix|Display Matrix): rotation of (-?[\d.]+) degrees/i.exec(videoStream)?.[1] ?? 0)
  const audio = /Audio: (\S+).*?, (\d+) Hz, ([^,\n]+)/.exec(ffmpegOutput)
  const stored = { width: Number(video?.[3] ?? 0), height: Number(video?.[4] ?? 0) }
  const sideways = Math.abs(rotation) === 90 || Math.abs(rotation) === 270
  return {
    duration: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0,
    width: sideways ? stored.height : stored.width,
    height: sideways ? stored.width : stored.height,
    rotation,
    hdr: /bt2020|smpte2084|arib-std-b67/.test(video?.[2] ?? ''),
    video: video ? `${video[1]} ${video[2]} ${video[3]}x${video[4]} rotated ${rotation}` : null,
    audio: audio ? `${audio[1]} ${audio[2]} Hz ${audio[3]}` : null
  }
}

export function joinKey(paths: string[]): string {
  return createHash('sha256').update([...paths].sort().join('\n')).digest('hex').slice(0, 32)
}
