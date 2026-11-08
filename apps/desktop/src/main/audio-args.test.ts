import { describe, expect, it } from 'vitest'
import { buildAudioArgs, buildFfmpegArgs, type AudioCutOptions } from './ffmpeg-args'

const audio: AudioCutOptions = {
  input: '/Users/vicent/Downloads/set.wav',
  output: '/out/set-1.mp4',
  start: 600,
  end: 660,
  videoFade: 'none',
  audioFade: 'none',
  fadeSeconds: 1,
  videoFadeIn: true,
  framing: 'crop',
  cropX: 0.5,
  cropY: 0.5,
  format: '16:9',
  background: { path: '/data/backgrounds/background-1.mp4', kind: 'video' },
  extras: { waveform: false, progressBar: false },
  bitrate: '4M',
  frame: { width: 1280, height: 720 }
}

const valueAfter = (args: string[], flag: string) => args[args.indexOf(flag) + 1]
const inputs = (args: string[]) => args.flatMap((a, i) => (a === '-i' ? [args[i + 1]] : []))
const graph = (args: string[]) => valueAfter(args, '-filter_complex')

describe('buildAudioArgs', () => {
  it('loops a background video forever so -t, not the loop, sets the length', () => {
    const args = buildAudioArgs(audio)
    expect(args.slice(args.indexOf('-stream_loop'), args.indexOf('-stream_loop') + 4)).toEqual(['-stream_loop', '-1', '-i', audio.background.path])
  })

  it('repeats a still image at 30 fps so the export is a real video', () => {
    const args = buildAudioArgs({ ...audio, background: { path: '/data/backgrounds/background-1.jpg', kind: 'image' } })
    const at = args.indexOf('-loop')
    expect(args.slice(at, at + 6)).toEqual(['-loop', '1', '-framerate', '30', '-i', '/data/backgrounds/background-1.jpg'])
    expect(args).not.toContain('-stream_loop')
  })

  it('seeks the audio, not the background, so each clip plays its own part of the set', () => {
    const args = buildAudioArgs(audio)
    expect(inputs(args)).toEqual([audio.background.path, audio.input])
    expect(args[args.indexOf(audio.input) - 3]).toBe('-ss')
    expect(args[args.indexOf(audio.input) - 2]).toBe('600')
  })

  it('cuts the output to the clip length so it ends with the audio', () => {
    expect(valueAfter(buildAudioArgs(audio), '-t')).toBe('60')
  })

  it('draws nothing extra when waveform and progress bar are off', () => {
    const args = buildAudioArgs(audio)
    expect(graph(args)).not.toContain('showwaves')
    expect(graph(args)).not.toContain('color=')
    expect(args.slice(args.indexOf('-map'), args.indexOf('-map') + 4)).toEqual(['-map', '[v]', '-map', '[a]'])
  })

  it('draws the real waveform centred near the bottom at the spec size', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { waveform: true, progressBar: false } }))
    expect(g).toContain('asplit[a][aw]')
    expect(g).toContain('showwaves=s=998x80:mode=cline:rate=30:scale=sqrt:draw=full:colors=white')
    expect(g).toContain("a='alpha(X,Y)*0.3*min(1,min(X,W-X)/(0.22*W))'")
    expect(g).toContain('overlay=x=(W-w)/2:y=0.86*H-h')
  })

  it('grows the progress bar over the clip so it reaches the end with the audio', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { waveform: false, progressBar: true } }))
    expect(g).toContain('color=c=white@0.8:s=1920x4:r=30')
    expect(g).toContain("overlay=x='-w+w*t/60':y=H-h:eval=frame")
  })

  it('reads the overlay PNG as the third input so the background and audio keep their indexes', () => {
    const args = buildAudioArgs({ ...audio, overlay: { path: '/o.png', x: 0.5, y: 0.1, width: 0.25 } })
    expect(inputs(args)).toEqual([audio.background.path, audio.input, '/o.png'])
    expect(graph(args)).toContain("[2:v][ref]scale=w='rw*0.25':h=-1[ov]")
  })

  it('fades picture and audio like a clip from a video', () => {
    const g = graph(buildAudioArgs({ ...audio, videoFade: 'black', audioFade: 'natural' }))
    expect(g).toContain('fade=t=in:st=0:d=1,fade=t=out:st=59:d=1')
    expect(g).toContain('afade=t=in:st=0:d=1:curve=qsin,afade=t=out:st=59:d=1:curve=qsin')
  })

  it('uses the background size when the format is Original', () => {
    const g = graph(buildAudioArgs({ ...audio, format: 'original', extras: { waveform: true, progressBar: true } }))
    expect(g).toContain('showwaves=s=666x54')
    expect(g).toContain('s=1280x3')
  })

  it('encodes at the requested bitrate so a long set stays a reasonable size', () => {
    expect(valueAfter(buildAudioArgs(audio), '-b:v')).toBe('4M')
  })
})

describe('bitrate in buildFfmpegArgs', () => {
  it('keeps 12 Mb/s for video clips unless told otherwise', () => {
    const { background: _b, extras: _e, frame: _f, bitrate: _r, ...video } = audio
    expect(valueAfter(buildFfmpegArgs(video), '-b:v')).toBe('12M')
    expect(valueAfter(buildFfmpegArgs({ ...video, bitrate: '4M' }), '-b:v')).toBe('4M')
  })
})
