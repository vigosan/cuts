import { join } from 'node:path'
import type { ExportProgress, ExportRequest, ExportResult, FrameRequest } from '../shared/api'
import { clipDuration, frameFileName, fullFileName, outputFileName, safeBaseName } from '@cuts/core/clips'
import type { Messages } from '@cuts/core/i18n'
import { mediaKind } from '../shared/video-formats'
import { buildAudioArgs, buildFfmpegArgs, buildFrameArgs } from './ffmpeg-args'

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

const NOT_ALLOWED = ['EACCES', 'EPERM', 'EROFS']

function folderProblem(error: Error & { code?: string }, folder: string, deps: ExportDeps): string | null {
  const { t } = deps
  const disk = /^\/Volumes\/([^/]+)/.exec(folder)?.[1]
  if (disk && !deps.exists(`/Volumes/${disk}`)) return t.diskMissing(disk)
  if (error.code === 'ENOSPC' || error.message.includes('No space left on device')) return t.diskFull
  if (NOT_ALLOWED.includes(error.code ?? '') || /Permission denied|Operation not permitted|Read-only file system/.test(error.message)) {
    return t.folderNotWritable
  }
  return null
}

export async function exportClips(request: ExportRequest, deps: ExportDeps): Promise<ExportResult> {
  const { ffmpeg, t } = deps
  if (!ffmpeg) return { ok: false, error: t.ffmpegMissing }
  const { background } = request
  if (!background && mediaKind(request.input) === 'audio') return { ok: false, error: t.backgroundMissing }

  try {
    await deps.ensureDir(request.folder)
  } catch (error) {
    return { ok: false, error: folderProblem(error as Error, request.folder, deps) ?? t.folderFailed((error as Error).message) }
  }
  const base = safeBaseName(request.baseName)
  const names = request.clips.map((clip) => (request.kind === 'full' ? fullFileName(base) : outputFileName(base, clip.position)))
  const files = names.map((name) => join(request.folder, name))
  const existing = names.filter((_, index) => deps.exists(files[index]))
  if (existing.length > 0 && !(await deps.confirmOverwrite(existing))) {
    return { ok: false, error: t.exportCancelled }
  }

  for (const [index, clip] of request.clips.entries()) {
    const cut = { ...request, ...clip, videoFadeIn: request.kind === 'full' || clip.position > 0, output: files[index] }
    const args = background ? buildAudioArgs({ ...cut, background, bitrate: '4M' }) : buildFfmpegArgs(cut)
    const length = clipDuration(clip)
    try {
      await deps.run(ffmpeg, args, (seconds) => deps.onProgress({ index, ratio: Math.min(1, seconds / length) }))
    } catch (error) {
      await deps.remove(files[index]).catch(() => {})
      if (deps.cancelled()) return { ok: false, error: index === 0 ? t.exportCancelled : t.exportCancelledKept(index) }
      return {
        ok: false,
        error: folderProblem(error as Error, request.folder, deps) ?? t.clipFailed(clip.position + 1, (error as Error).message)
      }
    }
    deps.onProgress({ index, ratio: 1 })
  }
  return { ok: true, files }
}

export async function exportFrame(request: FrameRequest, deps: ExportDeps): Promise<ExportResult> {
  const { ffmpeg, t } = deps
  if (!ffmpeg) return { ok: false, error: t.ffmpegMissing }

  try {
    await deps.ensureDir(request.folder)
  } catch (error) {
    return { ok: false, error: folderProblem(error as Error, request.folder, deps) ?? t.folderFailed((error as Error).message) }
  }
  const name = frameFileName(safeBaseName(request.baseName))
  const file = join(request.folder, name)
  if (deps.exists(file) && !(await deps.confirmOverwrite([name]))) return { ok: false, error: t.exportCancelled }

  try {
    const source = request.background ? { input: request.background.path, time: 0 } : {}
    await deps.run(ffmpeg, buildFrameArgs({ ...request, ...source, output: file }), () => {})
  } catch (error) {
    await deps.remove(file).catch(() => {})
    return { ok: false, error: folderProblem(error as Error, request.folder, deps) ?? (error as Error).message }
  }
  return { ok: true, files: [file] }
}
