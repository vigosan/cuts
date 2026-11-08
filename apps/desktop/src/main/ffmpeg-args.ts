import { posix, win32 } from 'node:path'
import type { AudioFade, VideoFade } from '@cuts/core/fades'
import type { ClipFraming } from '@cuts/core/framing'
import type { ExportOverlay, Size } from '@cuts/core/overlay'
import type { ExportBackground } from '../shared/api'
import { formatSize, type OutputFormat } from '@cuts/core/formats'

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
  overlay?: ExportOverlay | null
  bitrate?: string
}

export type AudioExtras = { waveform: boolean; progressBar: boolean }

export type AudioCutOptions = CutOptions & { background: ExportBackground; extras: AudioExtras; bitrate: string; frame: Size }

const num = (n: number) => String(Number(n.toFixed(3)))

function fadeFilters(prefix: string, duration: number, seconds: number, options = ''): string[] {
  const d = Math.min(seconds, duration / 2)
  return [
    `${prefix}=t=in:st=0:d=${num(d)}${options}`,
    `${prefix}=t=out:st=${num(duration - d)}:d=${num(d)}${options}`
  ]
}

export type FrameOptions = ClipFraming & { input: string; output: string; time: number; format: OutputFormat; overlay?: ExportOverlay | null }

const quarter = (size: number) => Math.round(size / 8) * 2

function framingFilters(o: ClipFraming & { format: OutputFormat }): string[] {
  const size = formatSize(o.format)
  if (!size) return []
  const { width: w, height: h } = size
  if (o.framing === 'fit') {
    const bw = quarter(w)
    const bh = quarter(h)
    return [
      'split=2[bg][fg];' +
        `[bg]scale=${bw}:${bh}:force_original_aspect_ratio=increase,crop=${bw}:${bh},gblur=sigma=10,colorlevels=romax=0.7:gomax=0.7:bomax=0.7,scale=${w}:${h}[b];` +
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

function overlayInput(overlay: ExportOverlay | null | undefined): string[] {
  return overlay ? ['-i', overlay.path] : []
}

function videoOutputArgs(framing: string[], fades: string[], overlay: ExportOverlay | null | undefined): string[] {
  if (!overlay) {
    const video = [...framing, ...fades]
    return video.length ? ['-vf', video.join(',')] : []
  }
  const graph =
    `[0:v]${framing.length ? `${framing.join(',')},` : ''}split[base][ref];` +
    `[1:v][ref]scale=w='rw*${num(overlay.width)}':h=-1[ov];` +
    `[base][ov]overlay=x='main_w*${num(overlay.x)}':y='main_h*${num(overlay.y)}'` +
    `${fades.map((f) => `,${f}`).join('')}[v]`
  return ['-filter_complex', graph, '-map', '[v]']
}

const VIDEO_ENCODERS: Partial<Record<NodeJS.Platform, string[]>> = {
  darwin: ['-c:v', 'h264_videotoolbox', '-allow_sw', '1'],
  win32: ['-c:v', 'h264_mf'],
  linux: ['-c:v', 'libopenh264']
}

export function buildFrameArgs(o: FrameOptions): string[] {
  return [
    '-hide_banner',
    '-y',
    '-ss', num(o.time),
    '-i', o.input,
    ...overlayInput(o.overlay),
    '-frames:v', '1',
    ...videoOutputArgs(framingFilters(o), [], o.overlay),
    '-q:v', '1',
    '-progress', 'pipe:1',
    '-nostats',
    o.output
  ]
}

export function buildFfmpegArgs(o: CutOptions, platform: NodeJS.Platform = process.platform): string[] {
  const duration = o.end - o.start
  const videoFades =
    o.videoFade === 'none'
      ? []
      : fadeFilters('fade', duration, o.fadeSeconds, o.videoFade === 'white' ? ':color=white' : '').slice(o.videoFadeIn ? 0 : 1)
  const audio =
    o.audioFade === 'none' ? [] : fadeFilters('afade', duration, o.fadeSeconds, o.audioFade === 'natural' ? ':curve=qsin' : '')
  return [
    '-hide_banner',
    '-y',
    '-ss', num(o.start),
    '-i', o.input,
    ...overlayInput(o.overlay),
    '-t', num(duration),
    ...videoOutputArgs(framingFilters(o), videoFades, o.overlay),
    ...(o.overlay ? ['-map', '0:a?'] : []),
    ...(audio.length ? ['-af', audio.join(',')] : []),
    ...VIDEO_ENCODERS[platform]!,
    '-b:v', o.bitrate ?? '12M',
    '-c:a', 'aac',
    '-b:a', '320k',
    '-movflags', '+faststart',
    '-progress', 'pipe:1',
    '-nostats',
    o.output
  ]
}

const even = (n: number) => Math.round(n / 2) * 2

function backgroundInput(background: ExportBackground): string[] {
  return background.kind === 'image'
    ? ['-loop', '1', '-framerate', '30', '-i', background.path]
    : ['-stream_loop', '-1', '-i', background.path]
}

export function buildAudioArgs(o: AudioCutOptions, platform: NodeJS.Platform = process.platform): string[] {
  const duration = o.end - o.start
  const { width, height } = formatSize(o.format) ?? o.frame
  const framing = framingFilters(o)
  const videoFades =
    o.videoFade === 'none'
      ? []
      : fadeFilters('fade', duration, o.fadeSeconds, o.videoFade === 'white' ? ':color=white' : '').slice(o.videoFadeIn ? 0 : 1)
  const audioFades =
    o.audioFade === 'none' ? [] : fadeFilters('afade', duration, o.fadeSeconds, o.audioFade === 'natural' ? ':curve=qsin' : '')
  const parts = [`[0:v]${[...framing, 'fps=30'].join(',')}[c0]`]
  let current = 'c0'
  const next = (label: string, chain: string) => {
    parts.push(chain.replace('$in', `[${current}]`).replace('$out', `[${label}]`))
    current = label
  }
  if (o.overlay) {
    next(
      'c1',
      `$insplit[base][ref];[2:v][ref]scale=w='rw*${num(o.overlay.width)}':h=-1[ov];[base][ov]overlay=x='main_w*${num(o.overlay.x)}':y='main_h*${num(o.overlay.y)}'$out`
    )
  }
  const audio = audioFades.length ? audioFades.join(',') : 'anull'
  if (o.extras.waveform) {
    parts.push(
      `[1:a]${audio},asplit[a][aw]`,
      `[aw]aformat=channel_layouts=mono,showwaves=s=${even(width * 0.52)}x${even(height * 0.074)}:mode=cline:rate=30:scale=sqrt:draw=full:colors=white,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='alpha(X,Y)*0.3*min(1,min(X,W-X)/(0.22*W))'[w]`
    )
    next('c2', '$in[w]overlay=x=(W-w)/2:y=0.86*H-h$out')
  } else {
    parts.push(`[1:a]${audio}[a]`)
  }
  if (o.extras.progressBar) {
    parts.push(`color=c=white@0.8:s=${width}x${Math.max(2, Math.round(height * 0.0037))}:r=30[p]`)
    next('c3', `$in[p]overlay=x='-w+w*t/${num(duration)}':y=H-h:eval=frame:shortest=0$out`)
  }
  next('v', `$in${[...videoFades, 'format=yuv420p'].join(',')}$out`)
  return [
    '-hide_banner',
    '-y',
    ...backgroundInput(o.background),
    '-ss', num(o.start),
    '-i', o.input,
    ...overlayInput(o.overlay),
    '-t', num(duration),
    '-filter_complex', parts.join(';'),
    '-map', '[v]',
    '-map', '[a]',
    ...VIDEO_ENCODERS[platform]!,
    '-b:v', o.bitrate,
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
