import { join } from 'node:path'
import type { ExportProgress, ExportRequest, ExportResult } from '../shared/api'
import { clipDuration, outputFileName, safeBaseName } from '@cuts/core/clips'
import type { Messages } from '@cuts/core/i18n'
import { buildFfmpegArgs } from './ffmpeg-args'

export type ExportDeps = {
  ffmpeg: string | null
  exists: (path: string) => boolean
  ensureDir: (path: string) => Promise<void>
  cancelled: () => boolean
  remove: (path: string) => Promise<void>
  confirmOverwrite: (names: string[]) => Promise<boolean>
  run: (ffmpeg: string, args: string[], onSeconds: (seconds: number) => void) => Promise<void>
  onProgress: (progress: ExportProgress) => void
  t: Messages
}

export async function exportClips(request: ExportRequest, deps: ExportDeps): Promise<ExportResult> {
  const { ffmpeg, t } = deps
  if (!ffmpeg) return { ok: false, error: t.ffmpegMissing }

  try {
    await deps.ensureDir(request.folder)
  } catch (error) {
    return { ok: false, error: t.folderFailed((error as Error).message) }
  }
  const names = request.clips.map((_, index) => outputFileName(safeBaseName(request.baseName), index))
  const files = names.map((name) => join(request.folder, name))
  const existing = names.filter((_, index) => deps.exists(files[index]))
  if (existing.length > 0 && !(await deps.confirmOverwrite(existing))) {
    return { ok: false, error: t.exportCancelled }
  }

  for (const [index, clip] of request.clips.entries()) {
    const args = buildFfmpegArgs({ ...request, ...clip, videoFadeIn: index > 0, output: files[index] })
    const length = clipDuration(clip)
    try {
      await deps.run(ffmpeg, args, (seconds) => deps.onProgress({ index, ratio: Math.min(1, seconds / length) }))
    } catch (error) {
      await deps.remove(files[index]).catch(() => {})
      if (deps.cancelled()) return { ok: false, error: t.exportCancelled }
      return { ok: false, error: t.clipFailed(index + 1, (error as Error).message) }
    }
    deps.onProgress({ index, ratio: 1 })
  }
  return { ok: true, files }
}
