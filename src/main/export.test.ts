import { describe, expect, it, vi } from 'vitest'
import type { ExportRequest } from '../shared/api'
import { messagesFor } from '../shared/i18n'
import { exportClips, type ExportDeps } from './export'

const t = messagesFor('en')

const request: ExportRequest = {
  input: '/Movies/session.mov',
  folder: '/Movies/Instagram',
  baseName: 'sesion',
  format: 'original',
  clips: [
    { id: 'a', start: 100, end: 150, videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5 },
    { id: 'b', start: 300, end: 340, videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5 }
  ]
}

function deps(overrides: Partial<ExportDeps> = {}): ExportDeps {
  return {
    ffmpeg: '/opt/homebrew/bin/ffmpeg',
    exists: () => false,
    ensureDir: vi.fn(async () => {}),
    cancelled: () => false,
    remove: vi.fn(async () => {}),
    t,
    confirmOverwrite: vi.fn(async () => true),
    run: vi.fn(async (_ffmpeg: string, _args: string[], onSeconds: (s: number) => void) => onSeconds(25)),
    onProgress: vi.fn(),
    ...overrides
  }
}

describe('exportClips', () => {
  it('writes one numbered file per clip, in order', async () => {
    const d = deps()
    const result = await exportClips(request, d)
    expect(result).toEqual({ ok: true, files: ['/Movies/Instagram/sesion-1.mp4', '/Movies/Instagram/sesion-2.mp4'] })
    const outputs = vi.mocked(d.run).mock.calls.map(([, args]) => args.at(-1))
    expect(outputs).toEqual(['/Movies/Instagram/sesion-1.mp4', '/Movies/Instagram/sesion-2.mp4'])
  })

  it('reports progress per clip as a fraction of its length', async () => {
    const d = deps()
    await exportClips(request, d)
    expect(d.onProgress).toHaveBeenCalledWith({ index: 0, ratio: 0.5 })
    expect(d.onProgress).toHaveBeenCalledWith({ index: 1, ratio: 25 / 40 })
    expect(d.onProgress).toHaveBeenCalledWith({ index: 1, ratio: 1 })
  })

  it('asks before overwriting clips exported earlier', async () => {
    const d = deps({ exists: (p) => p.endsWith('sesion-2.mp4'), confirmOverwrite: vi.fn(async () => false) })
    const result = await exportClips(request, d)
    expect(d.confirmOverwrite).toHaveBeenCalledWith(['sesion-2.mp4'])
    expect(result).toEqual({ ok: false, error: t.exportCancelled })
    expect(d.run).not.toHaveBeenCalled()
  })

  it('explains that a missing ffmpeg is fixed by reinstalling, never by installing third-party tools', async () => {
    const result = await exportClips(request, deps({ ffmpeg: null }))
    expect(result).toEqual({ ok: false, error: t.ffmpegMissing })
  })

  it('stops and reports which clip failed', async () => {
    const run = vi.fn(async () => {
      throw new Error('Invalid data found')
    })
    const result = await exportClips(request, deps({ run }))
    expect(result).toEqual({ ok: false, error: t.clipFailed(1, 'Invalid data found') })
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('turns slashes in a date-like name into dashes instead of writing into a missing subfolder', async () => {
    const result = await exportClips({ ...request, baseName: 'sesion 22/10' }, deps())
    expect(result).toEqual({ ok: true, files: ['/Movies/Instagram/sesion 22-10-1.mp4', '/Movies/Instagram/sesion 22-10-2.mp4'] })
  })

  it('skips the image fade-in only on the first clip, because Instagram uses its first frame as the carousel cover', async () => {
    const d = deps()
    await exportClips(request, d)
    const [first, second] = vi.mocked(d.run).mock.calls.map(([, args]) => args[args.indexOf('-vf') + 1])
    expect(first).not.toContain('fade=t=in')
    expect(first).toContain('fade=t=out')
    expect(second).toContain('fade=t=in')
  })

  it('applies each clip its own fades', async () => {
    const d = deps()
    await exportClips(
      { ...request, clips: [request.clips[0], { ...request.clips[1], videoFade: 'white', audioFade: 'none' }] },
      d
    )
    const [first, second] = vi.mocked(d.run).mock.calls.map(([, args]) => args)
    expect(first).toContain('-af')
    expect(second[second.indexOf('-vf') + 1]).toContain('color=white')
    expect(second).not.toContain('-af')
  })

  it('creates the destination folder first, because the default per-video folder does not exist yet', async () => {
    const d = deps()
    await exportClips(request, d)
    expect(d.ensureDir).toHaveBeenCalledWith('/Movies/Instagram')
  })

  it('reports a folder that cannot be created instead of leaving the export hanging', async () => {
    const d = deps({ ensureDir: vi.fn(async () => Promise.reject(new Error('EACCES: permission denied'))) })
    const result = await exportClips(request, d)
    expect(result).toEqual({ ok: false, error: t.folderFailed('EACCES: permission denied') })
    expect(d.run).not.toHaveBeenCalled()
  })

  it('deletes the half-written clip when a cut fails, so a broken file is never uploaded by mistake', async () => {
    const run = vi.fn(async () => {
      throw new Error('No space left on device')
    })
    const d = deps({ run })
    await exportClips(request, d)
    expect(d.remove).toHaveBeenCalledWith('/Movies/Instagram/sesion-1.mp4')
  })

  it('still reports the failed clip when the half-written file cannot be deleted', async () => {
    const run = vi.fn(async () => {
      throw new Error('No space left on device')
    })
    const remove = vi.fn(async () => Promise.reject(new Error('EPERM')))
    const result = await exportClips(request, deps({ run, remove }))
    expect(result).toEqual({ ok: false, error: t.clipFailed(1, 'No space left on device') })
  })

  it('reports a cancelled export as cancelled and never starts the next clip', async () => {
    let cancelled = false
    const run = vi.fn(async () => {
      cancelled = true
      throw new Error('killed')
    })
    const result = await exportClips(request, deps({ run, cancelled: () => cancelled }))
    expect(result).toEqual({ ok: false, error: t.exportCancelled })
    expect(run).toHaveBeenCalledTimes(1)
  })
})
