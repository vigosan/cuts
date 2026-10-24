import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildFfmpegArgs, findFfmpeg } from './ffmpeg-args'
import { runFfmpeg } from './ffmpeg'

const ffmpeg = findFfmpeg(existsSync)!
const dir = mkdtempSync(join(tmpdir(), 'carousel-cutter-'))
const input = join(dir, 'session with spaces.mov')

function probe(file: string) {
  const out = execFileSync(ffmpeg.replace(/ffmpeg$/, 'ffprobe'), [
    '-v', 'error', '-select_streams', 'v:0',
    '-show_entries', 'stream=width,height:format=duration', '-of', 'json', file
  ])
  const json = JSON.parse(out.toString())
  return { width: json.streams[0].width, height: json.streams[0].height, duration: Number(json.format.duration) }
}

describe('runFfmpeg with real ffmpeg', () => {
  beforeAll(() => {
    execFileSync(ffmpeg, [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=4',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=4',
      '-c:v', 'libx264', '-c:a', 'aac', '-shortest', input
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
})
