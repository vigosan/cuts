import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { buildAudioArgs, findFfmpeg, type AudioCutOptions } from './ffmpeg-args'
import { runFfmpeg } from './ffmpeg'

const ffmpeg = findFfmpeg(existsSync, join(__dirname, '../../resources/ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'))!
const dir = mkdtempSync(join(tmpdir(), 'cuts-audio-'))
const wav = join(dir, 'set.wav')
const loop = join(dir, 'loop.mp4')
const black = join(dir, 'black.mp4')
const still = join(dir, 'still.png')

function make(args: string[]) {
  execFileSync(ffmpeg, ['-y', ...args], { stdio: 'ignore' })
}

function frame(file: string, time: number): Buffer {
  return execFileSync(ffmpeg, ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'scale=64:36,format=gray', '-f', 'rawvideo', '-'], { stdio: 'pipe' })
}

function brightness(file: string, time: number, x: number, y: number): number {
  const bytes = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', `format=gray,crop=1:1:${x}:${y}`, '-f', 'rawvideo', '-'], { stdio: 'pipe' })
  return bytes[0]
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
  const [, fps] = /, ([\d.]+) fps/.exec(info)!
  return { width: Number(width), height: Number(height), fps: Number(fps), duration: Number(hours) * 3600 + Number(minutes) * 60 + Number(seconds) }
}

const options = (output: string, change: Partial<AudioCutOptions>): AudioCutOptions => ({
  input: wav,
  output,
  start: 0,
  end: 10,
  videoFade: 'none',
  audioFade: 'none',
  fadeSeconds: 1,
  videoFadeIn: true,
  framing: 'crop',
  cropX: 0.5,
  cropY: 0.5,
  format: '16:9',
  background: { path: loop, kind: 'video' },
  extras: { waveform: false, progressBar: false, color: '#ffffff', opacity: 0.3 },
  bitrate: '4M',
  frame: { width: 320, height: 180 },
  ...change
})

describe('audio recordings with real ffmpeg', () => {
  beforeAll(() => {
    make(['-f', 'lavfi', '-i', 'sine=frequency=440:duration=12', wav])
    make(['-f', 'lavfi', '-i', 'testsrc=size=320x180:rate=30:duration=2', '-c:v', 'mpeg4', loop])
    make(['-f', 'lavfi', '-i', 'color=black:s=320x180:rate=30:duration=2', '-c:v', 'mpeg4', black])
    make(['-f', 'lavfi', '-i', 'color=0x203060:s=320x180', '-frames:v', '1', still])
  })

  it('a short loop under a long clip gives a file as long as the clip that keeps moving', async () => {
    const output = join(dir, 'loop-1.mp4')
    await runFfmpeg(ffmpeg, buildAudioArgs(options(output, {})), () => {})
    const result = probe(output)
    expect(result.width).toBe(1920)
    expect(result.height).toBe(1080)
    expect(result.fps).toBe(30)
    expect(Math.abs(result.duration - 10)).toBeLessThan(0.1)
    expect(frame(output, 4.5).equals(frame(output, 5))).toBe(false)
  })

  it('a still image background still exports a 30 fps video exactly as long as the audio span', async () => {
    const output = join(dir, 'still-1.mp4')
    await runFfmpeg(ffmpeg, buildAudioArgs(options(output, { start: 2, end: 8, background: { path: still, kind: 'image' } })), () => {})
    const result = probe(output)
    expect(result.fps).toBe(30)
    expect(Math.abs(result.duration - 6)).toBeLessThan(0.1)
    expect(frame(output, 5.5).length).toBe(64 * 36)
  })

  it('draws the waveform where the spec puts it while the music plays', async () => {
    const output = join(dir, 'wave-1.mp4')
    await runFfmpeg(ffmpeg, buildAudioArgs(options(output, { end: 4, background: { path: black, kind: 'video' }, extras: { waveform: true, progressBar: false, color: '#ffffff', opacity: 0.3 } })), () => {})
    expect(brightness(output, 2, 960, Math.round(1080 * 0.82))).toBeGreaterThan(brightness(output, 2, 960, 300) + 30)
  })

  it('fills the progress bar halfway at the middle of the file', async () => {
    const output = join(dir, 'progress-1.mp4')
    await runFfmpeg(ffmpeg, buildAudioArgs(options(output, { end: 6, background: { path: black, kind: 'video' }, extras: { waveform: false, progressBar: true, color: '#ffffff', opacity: 0.3 } })), () => {})
    expect(brightness(output, 3, 480, 1078)).toBeGreaterThan(150)
    expect(brightness(output, 3, 1440, 1078)).toBeLessThan(40)
  })
})
