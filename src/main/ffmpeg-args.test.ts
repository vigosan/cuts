import { describe, expect, it } from 'vitest'
import { buildFfmpegArgs, findFfmpeg, parseProgressSeconds } from './ffmpeg-args'

const base = {
  input: '/Users/vicent/Movies/2026-10-22 22-33-13.mov',
  output: '/out/sesion-1.mp4',
  start: 584,
  end: 643,
  fade: false,
  format: 'original' as const
}

const valueAfter = (args: string[], flag: string) => args[args.indexOf(flag) + 1]

describe('buildFfmpegArgs', () => {
  it('seeks before the input so an 80-minute file is not decoded from the start', () => {
    const args = buildFfmpegArgs(base)
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(valueAfter(args, '-ss')).toBe('584')
  })

  it('cuts exactly the marked length', () => {
    expect(valueAfter(buildFfmpegArgs(base), '-t')).toBe('59')
  })

  it('keeps a path with spaces as a single argument', () => {
    expect(valueAfter(buildFfmpegArgs(base), '-i')).toBe(base.input)
  })

  it('leaves image and audio untouched in original format without fades', () => {
    const args = buildFfmpegArgs(base)
    expect(args).not.toContain('-vf')
    expect(args).not.toContain('-af')
  })

  it('fades image and audio in over 1 s and out over the last second', () => {
    const args = buildFfmpegArgs({ ...base, fade: true })
    expect(valueAfter(args, '-vf')).toBe('fade=t=in:st=0:d=1,fade=t=out:st=58:d=1')
    expect(valueAfter(args, '-af')).toBe('afade=t=in:st=0:d=1,afade=t=out:st=58:d=1')
  })

  it('shortens fades on very short clips so in and out never overlap', () => {
    const args = buildFfmpegArgs({ ...base, end: base.start + 1.5, fade: true })
    expect(valueAfter(args, '-vf')).toBe('fade=t=in:st=0:d=0.75,fade=t=out:st=0.75:d=0.75')
  })

  it('center-crops and scales to the Instagram size before fading', () => {
    const args = buildFfmpegArgs({ ...base, fade: true, format: '4:5' })
    expect(valueAfter(args, '-vf')).toBe(
      "crop='min(iw,ih*1080/1350)':'min(ih,iw*1350/1080)',scale=1080:1350,setsar=1,fade=t=in:st=0:d=1,fade=t=out:st=58:d=1"
    )
  })

  it('writes an H.264/AAC mp4 that starts playing immediately on Instagram', () => {
    const args = buildFfmpegArgs(base)
    expect(valueAfter(args, '-c:v')).toBe('h264_videotoolbox')
    expect(valueAfter(args, '-c:a')).toBe('aac')
    expect(valueAfter(args, '-movflags')).toBe('+faststart')
    expect(args.at(-1)).toBe(base.output)
  })
})

describe('parseProgressSeconds', () => {
  it('reads encoded time from ffmpeg progress output', () => {
    expect(parseProgressSeconds('frame=10\nout_time_us=12500000\nprogress=continue\n')).toBe(12.5)
  })

  it('ignores chunks without a time', () => {
    expect(parseProgressSeconds('frame=10\n')).toBeNull()
  })
})

describe('findFfmpeg', () => {
  it('finds Homebrew ffmpeg even when the Dock gives the app no PATH', () => {
    expect(findFfmpeg((p) => p === '/opt/homebrew/bin/ffmpeg')).toBe('/opt/homebrew/bin/ffmpeg')
    expect(findFfmpeg((p) => p === '/usr/local/bin/ffmpeg')).toBe('/usr/local/bin/ffmpeg')
  })

  it('reports missing ffmpeg instead of failing mid-export', () => {
    expect(findFfmpeg(() => false)).toBeNull()
  })
})
