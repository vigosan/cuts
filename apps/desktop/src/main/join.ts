import { createHash } from 'node:crypto'

export type MediaInfo = { duration: number; video: string | null; audio: string | null }

export function parseMediaInfo(ffmpegOutput: string): MediaInfo {
  const duration = /Duration: (\d+):(\d+):([\d.]+)/.exec(ffmpegOutput)
  const video = /Video: (\S+).*?, (\d+x\d+)/.exec(ffmpegOutput)
  const audio = /Audio: (\S+).*?, (\d+) Hz, ([^,\n]+)/.exec(ffmpegOutput)
  return {
    duration: duration ? Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) : 0,
    video: video ? `${video[1]} ${video[2]}` : null,
    audio: audio ? `${audio[1]} ${audio[2]} Hz ${audio[3]}` : null
  }
}

export function firstMismatch(infos: MediaInfo[]): number {
  const [first] = infos
  return infos.findIndex((info) => info.video !== first.video || info.audio !== first.audio)
}

export function joinKey(paths: string[]): string {
  return createHash('sha256').update([...paths].sort().join('\n')).digest('hex').slice(0, 32)
}

export function concatList(paths: string[]): string {
  return paths.map((path) => `file '${path.replaceAll("'", "'\\''")}'\n`).join('')
}

export function joinArgs(listFile: string, output: string): string[] {
  return ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-map', '0:v', '-map', '0:a?', '-c', 'copy', output]
}
