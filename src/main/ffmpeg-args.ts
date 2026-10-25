import { posix, win32 } from 'node:path'
import type { AudioFade, VideoFade } from '../shared/fades'
import type { ClipFraming } from '../shared/framing'
import { formatSize, type OutputFormat } from '../shared/formats'

export type CutOptions = ClipFraming & {
  input: string
  output: string
  start: number
  end: number
  videoFade: VideoFade
  audioFade: AudioFade
  fadeSeconds: number
  videoFadeIn: boolean
  format: OutputFormat
}

const num = (n: number) => String(Number(n.toFixed(3)))

function fadeFilters(prefix: string, duration: number, seconds: number, options = ''): string[] {
  const d = Math.min(seconds, duration / 2)
  return [
    `${prefix}=t=in:st=0:d=${num(d)}${options}`,
    `${prefix}=t=out:st=${num(duration - d)}:d=${num(d)}${options}`
  ]
}

function framingFilters(o: CutOptions): string[] {
  const size = formatSize(o.format)
  if (!size) return []
  const { width: w, height: h } = size
  if (o.framing === 'fit') {
    return [
      'split=2[bg][fg];' +
        `[bg]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},gblur=sigma=40,colorlevels=romax=0.7:gomax=0.7:bomax=0.7[b];` +
        `[fg]scale=${w}:${h}:force_original_aspect_ratio=decrease[f];` +
        '[b][f]overlay=(W-w)/2:(H-h)/2',
      'setsar=1'
    ]
  }
  return [
    `crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})':'(iw-ow)*${num(o.cropX)}':'(ih-oh)*${num(o.cropY)}'`,
    `scale=${w}:${h}`,
    'setsar=1'
  ]
}

const VIDEO_ENCODERS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: ['-c:v', 'h264_videotoolbox', '-allow_sw', '1'],
  win32: ['-c:v', 'h264_mf'],
  linux: ['-c:v', 'libopenh264']
}

export function buildFfmpegArgs(o: CutOptions, platform: NodeJS.Platform = process.platform): string[] {
  const duration = o.end - o.start
  const videoFades =
    o.videoFade === 'none'
      ? []
      : fadeFilters('fade', duration, o.fadeSeconds, o.videoFade === 'white' ? ':color=white' : '').slice(o.videoFadeIn ? 0 : 1)
  const video = [...framingFilters(o), ...videoFades]
  const audio =
    o.audioFade === 'none' ? [] : fadeFilters('afade', duration, o.fadeSeconds, o.audioFade === 'natural' ? ':curve=qsin' : '')
  return [
    '-hide_banner',
    '-y',
    '-ss', num(o.start),
    '-i', o.input,
    '-t', num(duration),
    ...(video.length ? ['-vf', video.join(',')] : []),
    ...(audio.length ? ['-af', audio.join(',')] : []),
    ...VIDEO_ENCODERS[platform]!,
    '-b:v', '12M',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    '-nostats',
    o.output
  ]
}

export function parseProgressSeconds(chunk: string): number | null {
  const matches = [...chunk.matchAll(/out_time_us=(\d+)/g)]
  const last = matches.at(-1)
  return last ? Number(last[1]) / 1_000_000 : null
}

const FFMPEG_CANDIDATES = ['/opt/homebrew/bin/ffmpeg', '/usr/local/bin/ffmpeg']

export function findFfmpeg(exists: (path: string) => boolean, bundled?: string, allowSystem = true): string | null {
  return [...(bundled ? [bundled] : []), ...(allowSystem ? FFMPEG_CANDIDATES : [])].find(exists) ?? null
}

export function bundledFfmpegPath(platform: NodeJS.Platform, resourcesPath: string, execPath: string): string {
  if (platform === 'darwin') return posix.join(resourcesPath, '..', 'Helpers', 'ffmpeg')
  if (platform === 'win32') return win32.join(win32.dirname(execPath), 'ffmpeg.exe')
  return posix.join(posix.dirname(execPath), 'ffmpeg')
}
