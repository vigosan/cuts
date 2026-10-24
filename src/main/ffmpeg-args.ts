import type { AudioFade, VideoFade } from '../shared/fades'
import { formatSize, type OutputFormat } from '../shared/formats'

export type CutOptions = {
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

function cropFilters(format: OutputFormat): string[] {
  const size = formatSize(format)
  if (!size) return []
  const { width: w, height: h } = size
  return [`crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})'`, `scale=${w}:${h}`, 'setsar=1']
}

export function buildFfmpegArgs(o: CutOptions): string[] {
  const duration = o.end - o.start
  const videoFades =
    o.videoFade === 'none'
      ? []
      : fadeFilters('fade', duration, o.fadeSeconds, o.videoFade === 'white' ? ':color=white' : '').slice(o.videoFadeIn ? 0 : 1)
  const video = [...cropFilters(o.format), ...videoFades]
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
    '-c:v', 'h264_videotoolbox',
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

export function findFfmpeg(exists: (path: string) => boolean): string | null {
  return FFMPEG_CANDIDATES.find(exists) ?? null
}
