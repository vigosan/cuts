import type { Messages } from '@cuts/core/i18n'
import type { ExportJob } from '../media'

type Deps = {
  exportClip: (job: ExportJob, onProgress: (ratio: number) => void) => Promise<string>
  saveToCutsAlbum: (uris: string[]) => Promise<void>
  cancelled: () => boolean
  onProgress: (index: number, ratio: number) => void
  t: Messages
}

export type ExportOutcome = { ok: true; saved: number } | { ok: false; saved: number; error: string }

export async function runExport(jobs: ExportJob[], deps: Deps): Promise<ExportOutcome> {
  const done: string[] = []
  const keep = async () => {
    if (done.length > 0) await deps.saveToCutsAlbum(done)
  }
  for (const [index, job] of jobs.entries()) {
    try {
      done.push(await deps.exportClip(job, (ratio) => deps.onProgress(index, ratio)))
      deps.onProgress(index, 1)
    } catch (error) {
      await keep()
      if (deps.cancelled()) return { ok: false, saved: done.length, error: done.length === 0 ? deps.t.exportCancelled : deps.t.exportCancelledKept(done.length) }
      return { ok: false, saved: done.length, error: deps.t.clipFailed(job.position + 1, (error as Error).message) }
    }
    if (deps.cancelled() && index < jobs.length - 1) {
      await keep()
      return { ok: false, saved: done.length, error: deps.t.exportCancelledKept(done.length) }
    }
  }
  await keep()
  return { ok: true, saved: done.length }
}
