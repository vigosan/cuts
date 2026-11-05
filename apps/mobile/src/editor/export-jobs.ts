import { outputFileName, safeBaseName, type Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import { clampPlacement, outputFrame, type ExportOverlay, type Overlay, type Size } from '@cuts/core/overlay'
import type { ExportJob } from '../media'

export function exportOverlay(overlay: Overlay | null, format: OutputFormat, video: Size): ExportOverlay | undefined {
  if (!overlay) return undefined
  return { path: overlay.path, ...clampPlacement(overlay, overlay.aspect, outputFrame(format, video)) }
}

export function exportJobs(
  clips: Clip[],
  settingsOf: (id: string) => ClipSettings,
  format: OutputFormat,
  baseName: string,
  only?: string,
  overlay?: ExportOverlay
): ExportJob[] {
  const jobs = clips.map((clip, position) => ({
    ...settingsOf(clip.id),
    start: clip.start,
    end: clip.end,
    format,
    videoFadeIn: position > 0,
    fileName: outputFileName(safeBaseName(baseName), position),
    position,
    ...(overlay && { overlay })
  }))
  return only ? jobs.filter((job) => clips[job.position].id === only) : jobs
}
