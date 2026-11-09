import { BAR_ASPECT, WAVE_ASPECT, defaultBarPlacement, defaultWavePlacement, type AudioExtras } from '@cuts/core/audio-layers'
import { fullFileName, outputFileName, safeBaseName, type Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import { clampPlacement, outputFrame, type ExportOverlay, type Overlay, type Size } from '@cuts/core/overlay'
import type { AssetInfo, Background, ExportJob, ExportLayer } from '../media'

export type AudioExport = { background: Background; extras: AudioExtras; frame: Size }

const AUDIO_BITRATE = 4_000_000
const SILENT_FRAME = { width: 1920, height: 1080 }

export function exportOverlay(overlay: Overlay | null, format: OutputFormat, video: Size): ExportOverlay | undefined {
  if (!overlay) return undefined
  return { path: overlay.path, ...clampPlacement(overlay, overlay.aspect, outputFrame(format, video)) }
}

export function sourceSize(asset: AssetInfo, background: Background | null): Size {
  const { width, height } = asset.kind !== 'audio' ? asset : (background ?? SILENT_FRAME)
  return { width, height }
}

export function audioExport(asset: AssetInfo, background: Background | null, extras: AudioExtras, format: OutputFormat): AudioExport | undefined {
  if (asset.kind !== 'audio' || !background) return undefined
  return { background, extras, frame: outputFrame(format, background) }
}

function audioFields({ background, extras, frame }: AudioExport): Pick<ExportJob, 'background' | 'wave' | 'bar' | 'bitrate'> {
  const wave: ExportLayer | undefined = extras.waveform
    ? { ...clampPlacement(extras.wave ?? defaultWavePlacement(frame), WAVE_ASPECT, frame), color: extras.color, opacity: extras.opacity }
    : undefined
  const bar: ExportLayer | undefined = extras.progressBar
    ? { ...clampPlacement(extras.bar ?? defaultBarPlacement(frame), BAR_ASPECT, frame), color: extras.barColor, opacity: extras.barOpacity }
    : undefined
  return { background: { path: background.path, kind: background.kind }, ...(wave && { wave }), ...(bar && { bar }), bitrate: AUDIO_BITRATE }
}

export function exportJobs(
  clips: Clip[],
  settingsOf: (id: string) => ClipSettings,
  format: OutputFormat,
  baseName: string,
  only?: string,
  overlay?: ExportOverlay,
  audio?: AudioExport
): ExportJob[] {
  const jobs = clips.map((clip, position) => ({
    ...settingsOf(clip.id),
    start: clip.start,
    end: clip.end,
    format,
    videoFadeIn: position > 0,
    fileName: outputFileName(safeBaseName(baseName), position),
    position,
    ...(overlay && { overlay }),
    ...(audio && audioFields(audio))
  }))
  return only ? jobs.filter((job) => clips[job.position].id === only) : jobs
}

export function fullJob(duration: number, settings: ClipSettings, format: OutputFormat, baseName: string, overlay?: ExportOverlay, audio?: AudioExport): ExportJob {
  return {
    ...settings,
    start: 0,
    end: duration,
    format,
    videoFadeIn: true,
    fileName: fullFileName(safeBaseName(baseName)),
    position: 0,
    ...(overlay && { overlay }),
    ...(audio && audioFields(audio))
  }
}
