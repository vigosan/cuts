import { outputFileName, safeBaseName, type Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { ExportJob } from '../media'

export function exportJobs(
  clips: Clip[],
  settingsOf: (id: string) => ClipSettings,
  format: OutputFormat,
  baseName: string
): ExportJob[] {
  return clips.map((clip, position) => ({
    ...settingsOf(clip.id),
    start: clip.start,
    end: clip.end,
    format,
    videoFadeIn: position > 0,
    fileName: outputFileName(safeBaseName(baseName), position),
    position
  }))
}
