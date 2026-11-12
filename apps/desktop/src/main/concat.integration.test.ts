import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildConcatArgs, findFfmpeg } from './ffmpeg-args'
import { runFfmpeg } from './ffmpeg'

const ffmpeg = findFfmpeg(existsSync, join(__dirname, '../../resources/ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'))!
const dir = mkdtempSync(join(tmpdir(), 'cuts-concat-'))
const landscape = join(dir, 'landscape with spaces.mov')
const portrait = join(dir, 'portrait.mov')

function pixel(file: string, x: number, y: number) {
  const bytes = execFileSync(ffmpeg, ['-v', 'error', '-ss', '3', '-i', file, '-frames:v', '1', '-vf', `format=rgb24,crop=1:1:${x}:${y}`, '-f', 'rawvideo', '-'], { stdio: 'pipe' })
  return { r: bytes[0], g: bytes[1], b: bytes[2] }
}

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
    duration: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds),
    audio: /Audio: aac/.test(info)
  }
}

describe('joining the videos of a session with real ffmpeg', () => {
  beforeAll(() => {
    execFileSync(ffmpeg, [
      '-y', '-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=2',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
      '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', landscape
    ], { stdio: 'ignore' })
    execFileSync(ffmpeg, ['-y', '-f', 'lavfi', '-i', 'color=red:size=180x320:rate=30:duration=2', '-c:v', 'mpeg4', portrait], { stdio: 'ignore' })
  })

  it('fits a portrait video after a landscape one into the first frame, one after the other (Review Focus 5)', async () => {
    const output = join(dir, 'set-full.mp4')
    await runFfmpeg(
      ffmpeg,
      buildConcatArgs({
        input: landscape,
        output,
        start: 0,
        end: 4,
        videoFade: 'none',
        audioFade: 'none',
        fadeSeconds: 1,
        videoFadeIn: true,
        framing: 'crop',
        cropX: 0.5,
        cropY: 0.5,
        format: 'original',
        frame: { width: 320, height: 180 },
        fps: 30,
        inputs: [
          { path: landscape, duration: 2, audio: true },
          { path: portrait, duration: 2, audio: false }
        ]
      }),
      () => {}
    )
    const result = probe(output)
    expect(result).toMatchObject({ width: 320, height: 180, audio: true })
    expect(Math.abs(result.duration - 4)).toBeLessThanOrEqual(1 / 30)
    const center = pixel(output, 160, 90)
    expect(center.r).toBeGreaterThan(200)
    expect(center.g).toBeLessThan(60)
    const bar = pixel(output, 10, 90)
    expect(Math.max(bar.r, bar.g, bar.b)).toBeLessThan(30)
  })
})
