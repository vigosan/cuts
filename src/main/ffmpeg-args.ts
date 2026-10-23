import { FADE_SECONDS } from '../shared/clips'
import { formatSize, type OutputFormat } from '../shared/formats'

export type CutOptions = {
  input: string
  output: string
  start: number
  end: number
  fade: boolean
  format: OutputFormat
}

const num = (n: number) => String(Number(n.toFixed(3)))

function fadeFilters(prefix: string, duration: number): string[] {
  const d = Math.min(FADE_SECONDS, duration / 2)
  return [`${prefix}=t=in:st=0:d=${num(d)}`, `${prefix}=t=out:st=${num(duration - d)}:d=${num(d)}`]
}

function cropFilters(format: OutputFormat): string[] {
  const size = formatSize(format)
  if (!size) return []
  const { width: w, height: h } = size
  return [`crop='min(iw,ih*${w}/${h})':'min(ih,iw*${h}/${w})'`, `scale=${w}:${h}`, 'setsar=1']
}

export function buildFfmpegArgs(o: CutOptions): string[] {
  const duration = o.end - o.start
  const video = [...cropFilters(o.format), ...(o.fade ? fadeFilters('fade', duration) : [])]
  const audio = o.fade ? fadeFilters('afade', duration) : []
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
