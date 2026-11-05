import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ExportRequest } from '../shared/api'
import { messagesFor } from '@cuts/core/i18n'
import { exportClips, exportFrame, type ExportDeps } from './export'

const t = messagesFor('en')

const request: ExportRequest = {
  input: '/Movies/session.mov',
  folder: '/Movies/Instagram',
  baseName: 'sesion',
  format: 'original',
  overlay: null,
  clips: [
    { id: 'a', start: 100, end: 150, videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5, position: 0 },
    { id: 'b', start: 300, end: 340, videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5, position: 1 }
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
    expect(result).toEqual({ ok: true, files: [join('/Movies/Instagram', 'sesion-1.mp4'), join('/Movies/Instagram', 'sesion-2.mp4')] })
    const outputs = vi.mocked(d.run).mock.calls.map(([, args]) => args.at(-1))
    expect(outputs).toEqual([join('/Movies/Instagram', 'sesion-1.mp4'), join('/Movies/Instagram', 'sesion-2.mp4')])
  })

  it('names each clip by its place in the carousel, so exporting only clip 3 replaces sesion-3.mp4', async () => {
    const result = await exportClips({ ...request, clips: [{ ...request.clips[1], position: 2 }] }, deps())
    expect(result).toEqual({ ok: true, files: [join('/Movies/Instagram', 'sesion-3.mp4')] })
  })

  it('keeps the image fade-in of a clip exported alone unless it opens the carousel', async () => {
    const d = deps()
    await exportClips({ ...request, clips: [{ ...request.clips[1], videoFade: 'black', position: 2 }] }, d)
    const args = vi.mocked(d.run).mock.calls[0][1]
    expect(args[args.indexOf('-vf') + 1]).toContain('fade=t=in')
  })

  it('puts the chosen PNG into every clip, so the logo is on the whole carousel', async () => {
    const d = deps()
    await exportClips({ ...request, overlay: { path: '/data/overlays/logo.png', x: 0.1, y: 0.2, width: 0.3 } }, d)
    for (const [, args] of vi.mocked(d.run).mock.calls) expect(args).toContain('/data/overlays/logo.png')
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
    expect(result).toEqual({ ok: true, files: [join('/Movies/Instagram', 'sesion 22-10-1.mp4'), join('/Movies/Instagram', 'sesion 22-10-2.mp4')] })
  })

  it('names the files without characters Windows forbids, so a time in the name never fails the export', async () => {
    const result = await exportClips({ ...request, baseName: 'set 22:30' }, deps())
    expect(result).toEqual({ ok: true, files: [join('/Movies/Instagram', 'set 22-30-1.mp4'), join('/Movies/Instagram', 'set 22-30-2.mp4')] })
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
    const d = deps({ ensureDir: vi.fn(async () => Promise.reject(new Error('ENAMETOOLONG: name too long'))) })
    const result = await exportClips(request, d)
    expect(result).toEqual({ ok: false, error: t.folderFailed('ENAMETOOLONG: name too long') })
    expect(d.run).not.toHaveBeenCalled()
  })

  it('asks for another folder when Cuts may not write there, instead of showing the system error code', async () => {
    for (const code of ['EACCES', 'EPERM', 'EROFS']) {
      const error = Object.assign(new Error(`${code}: operation not permitted, mkdir '/System/Cuts'`), { code })
      const result = await exportClips(request, deps({ ensureDir: vi.fn(async () => Promise.reject(error)) }))
      expect(result).toEqual({ ok: false, error: t.folderNotWritable })
    }
  })

  it('asks for another folder when FFmpeg is denied writing a clip, instead of showing its raw output', async () => {
    const run = vi.fn(async () => {
      throw new Error("[out#0/mp4 @ 0xb85024a80] Error opening output /Movies/Instagram/sesion-1.mp4: Permission denied\nError opening output files: Permission denied")
    })
    const result = await exportClips(request, deps({ run }))
    expect(result).toEqual({ ok: false, error: t.folderNotWritable })
  })

  it('names the disconnected disk when the folder is on a disk that is not mounted, so the fix is to plug it in', async () => {
    const error = Object.assign(new Error("EACCES: permission denied, mkdir '/Volumes/Archivo'"), { code: 'EACCES' })
    const d = deps({ ensureDir: vi.fn(async () => Promise.reject(error)) })
    const result = await exportClips({ ...request, folder: '/Volumes/Archivo/Cuts/set' }, d)
    expect(result).toEqual({ ok: false, error: t.diskMissing('Archivo') })
    expect(d.run).not.toHaveBeenCalled()
  })

  it('says the disk is full when a clip runs out of space, since retrying the same folder would fail again', async () => {
    const run = vi.fn(async () => {
      throw new Error('Error writing trailer: No space left on device')
    })
    const result = await exportClips(request, deps({ run }))
    expect(result).toEqual({ ok: false, error: t.diskFull })
  })

  it('deletes the half-written clip when a cut fails, so a broken file is never uploaded by mistake', async () => {
    const run = vi.fn(async () => {
      throw new Error('No space left on device')
    })
    const d = deps({ run })
    await exportClips(request, d)
    expect(d.remove).toHaveBeenCalledWith(join('/Movies/Instagram', 'sesion-1.mp4'))
  })

  it('still reports the failed clip when the half-written file cannot be deleted', async () => {
    const run = vi.fn(async () => {
      throw new Error('Invalid data found')
    })
    const remove = vi.fn(async () => Promise.reject(new Error('EPERM')))
    const result = await exportClips(request, deps({ run, remove }))
    expect(result).toEqual({ ok: false, error: t.clipFailed(1, 'Invalid data found') })
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

  it('says how many clips were kept when cancelled after some finished, since those files stay in the folder', async () => {
    let cancelled = false
    const run = vi.fn(async () => {
      if (run.mock.calls.length < 2) return
      cancelled = true
      throw new Error('killed')
    })
    const result = await exportClips(request, deps({ run, cancelled: () => cancelled }))
    expect(result).toEqual({ ok: false, error: t.exportCancelledKept(1) })
  })
})

describe('exportFrame', () => {
  const frame = { input: '/Movies/session.mov', folder: '/Movies/Instagram', baseName: 'sesion', format: '4:5' as const, time: 120, framing: 'crop' as const, cropX: 0.5, cropY: 0.5, overlay: null }

  it('puts the chosen PNG on the saved frame, so the cover matches the clips', async () => {
    const d = deps()
    await exportFrame({ ...frame, overlay: { path: '/data/overlays/logo.png', x: 0.1, y: 0.2, width: 0.3 } }, d)
    expect(vi.mocked(d.run).mock.calls[0][1]).toContain('/data/overlays/logo.png')
  })

  it('writes the still as name-0.jpg next to the clips', async () => {
    const d = deps()
    const result = await exportFrame(frame, d)
    const file = join('/Movies/Instagram', 'sesion-0.jpg')
    expect(result).toEqual({ ok: true, files: [file] })
    expect(d.ensureDir).toHaveBeenCalledWith('/Movies/Instagram')
    expect(vi.mocked(d.run).mock.calls[0][1].at(-1)).toBe(file)
  })

  it('asks before replacing a still that is already there', async () => {
    const d = deps({ exists: () => true, confirmOverwrite: vi.fn(async () => false) })
    expect(await exportFrame(frame, d)).toEqual({ ok: false, error: t.exportCancelled })
    expect(d.confirmOverwrite).toHaveBeenCalledWith(['sesion-0.jpg'])
    expect(d.run).not.toHaveBeenCalled()
  })

  it('reports a missing FFmpeg instead of failing silently', async () => {
    expect(await exportFrame(frame, deps({ ffmpeg: null }))).toEqual({ ok: false, error: t.ffmpegMissing })
  })

  it('asks for another folder when the still cannot be written there, as the clips do', async () => {
    const denied = Object.assign(new Error("EPERM: operation not permitted, mkdir '/System/Cuts'"), { code: 'EPERM' })
    expect(await exportFrame(frame, deps({ ensureDir: vi.fn(async () => Promise.reject(denied)) }))).toEqual({ ok: false, error: t.folderNotWritable })
    const run = vi.fn(async () => {
      throw new Error('Error opening output /Movies/Instagram/sesion-0.jpg: Permission denied')
    })
    expect(await exportFrame(frame, deps({ run }))).toEqual({ ok: false, error: t.folderNotWritable })
  })
})
