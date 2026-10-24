import { join } from 'node:path'
import type { ExportProgress, ExportRequest, ExportResult } from '../shared/api'
import { clipDuration, outputFileName } from '../shared/clips'
import { buildFfmpegArgs } from './ffmpeg-args'

export type ExportDeps = {
  ffmpeg: string | null
  exists: (path: string) => boolean
  ensureDir: (path: string) => Promise<void>
  confirmOverwrite: (names: string[]) => Promise<boolean>
  run: (ffmpeg: string, args: string[], onSeconds: (seconds: number) => void) => Promise<void>
  onProgress: (progress: ExportProgress) => void
}

export async function exportClips(request: ExportRequest, deps: ExportDeps): Promise<ExportResult> {
  const { ffmpeg } = deps
  if (!ffmpeg) return { ok: false, error: 'No se encontró ffmpeg. Instálalo con: brew install ffmpeg' }

  await deps.ensureDir(request.folder)
  const names = request.clips.map((_, index) => outputFileName(request.baseName.trim().replaceAll('/', '-'), index))
  const files = names.map((name) => join(request.folder, name))
  const existing = names.filter((_, index) => deps.exists(files[index]))
  if (existing.length > 0 && !(await deps.confirmOverwrite(existing))) {
    return { ok: false, error: 'Exportación cancelada.' }
  }

  for (const [index, clip] of request.clips.entries()) {
    const args = buildFfmpegArgs({ ...request, ...clip, videoFadeIn: index > 0, output: files[index] })
    const length = clipDuration(clip)
    try {
      await deps.run(ffmpeg, args, (seconds) => deps.onProgress({ index, ratio: Math.min(1, seconds / length) }))
    } catch (error) {
      return { ok: false, error: `Falló el trozo ${index + 1}: ${(error as Error).message}` }
    }
    deps.onProgress({ index, ratio: 1 })
  }
  return { ok: true, files }
}
