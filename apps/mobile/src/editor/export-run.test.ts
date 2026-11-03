import { describe, expect, it, vi } from 'vitest'
import { messagesFor } from '@cuts/core/i18n'
import type { ExportJob } from '../media'
import { runExport } from './export-run'

const t = messagesFor('en')
const job = (n: number) => ({ fileName: `set-${n}.mp4`, position: n - 1 }) as ExportJob

const deps = (overrides: Partial<Parameters<typeof runExport>[1]> = {}) => ({
  exportClip: vi.fn(async (j: ExportJob, onProgress: (ratio: number) => void) => {
    onProgress(1)
    return `file:///tmp/${j.fileName}`
  }),
  saveToCutsAlbum: vi.fn(async () => {}),
  cancelled: () => false,
  onProgress: vi.fn(),
  t,
  ...overrides
})

describe('runExport', () => {
  it('saves every clip to the Cuts album in carousel order', async () => {
    const d = deps()
    expect(await runExport([job(1), job(2), job(3)], d)).toEqual({ ok: true, saved: 3 })
    expect(d.saveToCutsAlbum).toHaveBeenCalledWith(['file:///tmp/set-1.mp4', 'file:///tmp/set-2.mp4', 'file:///tmp/set-3.mp4'])
    expect(d.onProgress).toHaveBeenCalledWith(2, 1)
  })

  it('stopping keeps the finished clips and says how many, like the Mac', async () => {
    let stop = false
    const d = deps({
      cancelled: () => stop,
      exportClip: vi.fn(async (j: ExportJob) => {
        if (j.fileName === 'set-2.mp4') {
          stop = true
          throw new Error('cancelled')
        }
        return `file:///tmp/${j.fileName}`
      })
    })
    expect(await runExport([job(1), job(2), job(3)], d)).toEqual({ ok: false, saved: 1, error: t.exportCancelledKept(1) })
    expect(d.saveToCutsAlbum).toHaveBeenCalledWith(['file:///tmp/set-1.mp4'])
  })

  it('stopping before any clip finishes saves nothing', async () => {
    const d = deps({ cancelled: () => true, exportClip: vi.fn(async () => Promise.reject(new Error('cancelled'))) })
    expect(await runExport([job(1)], d)).toEqual({ ok: false, saved: 0, error: t.exportCancelled })
    expect(d.saveToCutsAlbum).not.toHaveBeenCalled()
  })

  it('a failed clip says which one, and the clips before it are kept', async () => {
    const d = deps({ exportClip: vi.fn(async (j: ExportJob) => (j.fileName === 'set-2.mp4' ? Promise.reject(new Error('disk full')) : `file:///tmp/${j.fileName}`)) })
    expect(await runExport([job(1), job(2)], d)).toEqual({ ok: false, saved: 1, error: t.clipFailed(2, 'disk full') })
    expect(d.saveToCutsAlbum).toHaveBeenCalledWith(['file:///tmp/set-1.mp4'])
  })
})
