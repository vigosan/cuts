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
  extras: { waveform: false, progressBar: false, color: '#ffffff', opacity: 0.3, wave: null, bar: null, barColor: '#ffffff', barOpacity: 0.8 },
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
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true } }))
    expect(g).toContain('asplit[a][aw]')
    expect(g).toContain('showwaves=s=998x80:mode=cline:rate=30:scale=sqrt:draw=full:colors=0xffffff')
    expect(g).toContain("a='alpha(X,Y)*0.3*min(1,min(X,W-X)/(0.22*W))'")
    expect(g).toContain('[w]overlay=x=461:y=849')
  })

  it('grows the progress bar over the clip so it reaches the end with the audio', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, progressBar: true } }))
    expect(g).toContain('color=c=0xffffff:s=1920x4:r=30')
    expect(g).toContain("a='if(lt(X,W*T/60),204,0)'")
    expect(g).toContain('[p]overlay=x=0:y=1076')
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
    const g = graph(buildAudioArgs({ ...audio, format: 'original', extras: { ...audio.extras, waveform: true, progressBar: true } }))
    expect(g).toContain('showwaves=s=666x54')
    expect(g).toContain('s=1280x3')
  })

  it('encodes at the requested bitrate so a long set stays a reasonable size', () => {
    expect(valueAfter(buildAudioArgs(audio), '-b:v')).toBe('4M')
  })
})

describe('waveform colour and opacity', () => {
  const both = (color: string, opacity: number) =>
    graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true, progressBar: true, color, opacity } }))

  it('draws the waveform in the chosen colour so it matches the brand', () => {
    const g = both('#4DA8FF', 0.5)
    expect(g).toContain('colors=0x4da8ff')
    expect(g).toContain("a='alpha(X,Y)*0.5*")
  })

  it('draws the progress bar in its own colour and opacity, so it can stay visible on a light background', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, progressBar: true, color: '#ffffff', barColor: '#1C1C1E', barOpacity: 0.5 } }))
    expect(g).toContain('color=c=0x1c1c1e:s=')
    expect(g).toContain("a='if(lt(X,W*T/60),128,0)'")
  })

  it('keeps the bar colour to #rrggbb and its opacity within 10–100 %', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, progressBar: true, barColor: 'red;x', barOpacity: 7 } }))
    expect(g).toContain('color=c=0xffffff:s=')
    expect(g).toContain("a='if(lt(X,W*T/60),255,0)'")
  })

  it('falls back to white for anything that is not #rrggbb, so nothing else reaches the filter graph', () => {
    const g = both("red;drawtext=text='x'", 0.5)
    expect(g).not.toContain('drawtext')
    expect(g).toContain('colors=0xffffff')
  })

  it('keeps the opacity between 10 % and 100 %', () => {
    expect(both('#ffffff', 5)).toContain("a='alpha(X,Y)*1*")
    expect(both('#ffffff', 0)).toContain("a='alpha(X,Y)*0.1*")
  })
})

describe('placing the waveform and the bar', () => {
  it('draws the waveform where it was placed on the preview, keeping its shape', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true, wave: { x: 0.1, y: 0.2, width: 0.25 } } }))
    expect(g).toContain('showwaves=s=480x38')
    expect(g).toContain('[w]overlay=x=192:y=216')
  })

  it('grows the progress bar from where it was placed, never left of it', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, progressBar: true, bar: { x: 0.25, y: 0.5, width: 0.5 } } }))
    expect(g).toContain('s=960x2:r=30')
    expect(g).toContain('[p]overlay=x=480:y=540')
  })

  it('pulls a placement that came out of the frame back inside', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true, wave: { x: 0.9, y: 0.99, width: 0.5 } } }))
    expect(g).toContain('[w]overlay=x=960:y=1003')
  })
})

describe('values that come from the renderer', () => {
  it('ignores a forged placement instead of putting it in the filter graph', () => {
    const forged = { x: '0;movie=/etc/passwd' as unknown as number, y: 0.2, width: 0.25 }
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true, wave: forged } }))
    expect(g).not.toContain('movie')
    expect(g).toContain('[w]overlay=x=461:y=849')
  })

  it('never lets a forged frame size reach the filter graph', () => {
    const forged = { width: "2[p];movie=/etc/passwd" as unknown as number, height: 720 }
    const g = graph(buildAudioArgs({ ...audio, format: 'original', frame: forged, extras: { ...audio.extras, waveform: true, progressBar: true } }))
    expect(g).not.toContain('movie')
    expect(g).not.toContain('NaN')
  })

  it('uses the default opacity when the renderer sends something that is not a number', () => {
    const g = graph(buildAudioArgs({ ...audio, extras: { ...audio.extras, waveform: true, opacity: 'x' as unknown as number } }))
    expect(g).toContain("a='alpha(X,Y)*0.3*")
  })
})

describe('bitrate in buildFfmpegArgs', () => {
  it('keeps 12 Mb/s for video clips unless told otherwise', () => {
    const { background: _b, extras: _e, frame: _f, bitrate: _r, ...video } = audio
    expect(valueAfter(buildFfmpegArgs(video), '-b:v')).toBe('12M')
    expect(valueAfter(buildFfmpegArgs({ ...video, bitrate: '4M' }), '-b:v')).toBe('4M')
  })
})
