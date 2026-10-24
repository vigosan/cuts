import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildFfmpegArgs, findFfmpeg } from './ffmpeg-args'
import { captureFfmpeg, runFfmpeg, stopAllFfmpeg } from './ffmpeg'
import { peaksFromSamples, thumbnailArgs, waveformArgs, PEAKS_PER_SECOND } from './preview'

const ffmpeg = findFfmpeg(existsSync, join(__dirname, '../../resources/ffmpeg/ffmpeg'))!
const dir = mkdtempSync(join(tmpdir(), 'cuts-'))
const input = join(dir, 'session with spaces.mov')

function probe(file: string) {
  let info = ''
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' })
  } catch (error) {
    info = String((error as { stderr: Buffer }).stderr)
  }
  const [, hours, minutes, seconds] = /Duration: (\d+):(\d+):([\d.]+)/.exec(info)!
  const [, width, height] = /Video: .*?, (\d+)x(\d+)/.exec(info)!
  return {
    width: Number(width),
    height: Number(height),
    duration: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds)
  }
}

describe('runFfmpeg with real ffmpeg', () => {
  beforeAll(() => {
    execFileSync(ffmpeg, [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=4',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
      '-c:v', 'h264_videotoolbox', '-c:a', 'aac', '-shortest', input
    ], { stdio: 'ignore' })
  })

  it('exports the marked span at the chosen Instagram size with fades, reporting progress', async () => {
    const output = join(dir, 'clip-1.mp4')
    const progress: number[] = []
    await runFfmpeg(ffmpeg, buildFfmpegArgs({ input, output, start: 1, end: 3, videoFade: 'black', audioFade: 'natural', fadeSeconds: 1, videoFadeIn: true, format: '4:5' }), (s) =>
      progress.push(s)
    )
    const result = probe(output)
    expect(result.width).toBe(1080)
    expect(result.height).toBe(1350)
    expect(result.duration).toBeGreaterThan(1.9)
    expect(result.duration).toBeLessThan(2.1)
    expect(progress.length).toBeGreaterThan(0)
  })

  it('keeps the original resolution when no format is chosen', async () => {
    const output = join(dir, 'clip-2.mp4')
    await runFfmpeg(ffmpeg, buildFfmpegArgs({ input, output, start: 0, end: 2, videoFade: 'none', audioFade: 'none', fadeSeconds: 1, videoFadeIn: true, format: 'original' }), () => {})
    expect(probe(output)).toMatchObject({ width: 320, height: 180 })
  })

  it('rejects with ffmpeg error output when the cut fails', async () => {
    await expect(
      runFfmpeg(ffmpeg, buildFfmpegArgs({ input: join(dir, 'missing.mov'), output: join(dir, 'x.mp4'), start: 0, end: 1, videoFade: 'none', audioFade: 'none', fadeSeconds: 1, videoFadeIn: true, format: 'original' }), () => {})
    ).rejects.toThrow(/No such file/)
  })

  it('grabs a JPEG thumbnail of a frame for the timeline filmstrip', async () => {
    const jpeg = await captureFfmpeg(ffmpeg, thumbnailArgs(input, 2, 90))
    expect(jpeg.subarray(0, 2).toString('hex')).toBe('ffd8')
  })

  it('reads the whole audio track into waveform peaks, one slice per 1/50 s', async () => {
    const raw = await captureFfmpeg(ffmpeg, waveformArgs(input))
    const peaks = peaksFromSamples(new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2))
    expect(peaks.length).toBeGreaterThan(4 * PEAKS_PER_SECOND - 5)
    expect(Math.max(...peaks)).toBeGreaterThan(0.1)
  })

  it('stops running exports when the app quits and removes the half-written clip, so nothing broken is left behind', async () => {
    const output = join(dir, 'long.mp4')
    const args = ['-y', '-re', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=60', '-progress', 'pipe:1', output]
    let started: () => void
    const running = new Promise<void>((resolve) => (started = resolve))
    const exporting = runFfmpeg(ffmpeg, args, () => started())
    await running
    stopAllFfmpeg()
    await expect(exporting).rejects.toThrow()
    expect(existsSync(output)).toBe(false)
  })

  it('refuses to start new cuts once the app is quitting, so the next clip of a running export never begins', async () => {
    stopAllFfmpeg()
    const output = join(dir, 'after-quit.mp4')
    await expect(
      runFfmpeg(ffmpeg, buildFfmpegArgs({ input, output, start: 0, end: 1, videoFade: 'none', audioFade: 'none', fadeSeconds: 1, videoFadeIn: true, format: 'original' }), () => {})
    ).rejects.toThrow()
    expect(existsSync(output)).toBe(false)
  })
})
