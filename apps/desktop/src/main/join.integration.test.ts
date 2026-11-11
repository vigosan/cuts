import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { findFfmpeg } from './ffmpeg-args'
import { runFfmpeg } from './ffmpeg'
import { concatList, joinArgs, parseMediaInfo } from './join'

const ffmpeg = findFfmpeg(existsSync, join(__dirname, '../../resources/ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg'))!
const dir = mkdtempSync(join(tmpdir(), 'cuts-join-'))
const clips = [
  { file: join(dir, "one's.mov"), color: 'red', seconds: 1.37 },
  { file: join(dir, 'two.mov'), color: 'green', seconds: 2.11 },
  { file: join(dir, 'three.mov'), color: 'blue', seconds: 1.53 }
]
const joined = join(dir, 'joined.mov')

function pixel(file: string, time: number) {
  const bytes = execFileSync(ffmpeg, ['-v', 'error', '-ss', String(time), '-i', file, '-frames:v', '1', '-vf', 'format=rgb24,crop=1:1:100:50', '-f', 'rawvideo', '-'], { stdio: 'pipe' })
  return { r: bytes[0], g: bytes[1], b: bytes[2] }
}

function info(file: string) {
  try {
    execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' })
  } catch (error) {
    return String((error as { stderr: Buffer }).stderr)
  }
  return ''
}

describe('joining videos with real ffmpeg', () => {
  beforeAll(async () => {
    for (const { file, color, seconds } of clips) {
      execFileSync(ffmpeg, [
        '-y', '-f', 'lavfi', '-i', `color=${color}:s=320x180:r=30:d=${seconds}`,
        '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
        '-t', String(seconds), '-c:v', 'mpeg4', '-c:a', 'aac', file
      ], { stdio: 'ignore' })
    }
    const list = join(dir, 'list.txt')
    writeFileSync(list, concatList(clips.map((clip) => clip.file)))
    await runFfmpeg(ffmpeg, joinArgs(list, joined), () => {})
  })

  it('the joined file lasts as long as the videos together, so no part is lost', () => {
    const total = clips.reduce((sum, clip) => sum + clip.seconds, 0)
    expect(Math.abs(parseMediaInfo(info(joined)).duration - total)).toBeLessThan(1 / 30 + 0.05)
  })

  it('the last video follows the others without re-encoding', () => {
    const { r, g, b } = pixel(joined, 1.37 + 2.11 + 0.1)
    expect(b).toBeGreaterThan(150)
    expect(r).toBeLessThan(80)
    expect(g).toBeLessThan(80)
  })

  it('the middle video keeps its own colour', () => {
    const { r, g, b } = pixel(joined, 1.37 + 0.5)
    expect(g).toBeGreaterThan(100)
    expect(r).toBeLessThan(80)
    expect(b).toBeLessThan(80)
  })
})
