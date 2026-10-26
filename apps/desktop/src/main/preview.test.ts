import { describe, expect, it } from 'vitest'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { parseFrameRate, peaksFromSamples, thumbnailArgs, waveformArgs, WAVEFORM_SAMPLE_RATE } from './preview'

const valueAfter = (args: string[], flag: string) => args[args.indexOf(flag) + 1]

describe('thumbnailArgs', () => {
  it('seeks before the input and grabs one small JPEG frame, so a thumbnail is fast anywhere in a long session', () => {
    const args = thumbnailArgs('/Movies/session with spaces.mov', 1234.5, 90)
    expect(args.indexOf('-ss')).toBeLessThan(args.indexOf('-i'))
    expect(valueAfter(args, '-ss')).toBe('1234.5')
    expect(valueAfter(args, '-i')).toBe('/Movies/session with spaces.mov')
    expect(valueAfter(args, '-frames:v')).toBe('1')
    expect(valueAfter(args, '-vf')).toBe('scale=-2:90')
    expect(args.at(-1)).toBe('pipe:1')
  })
})

describe('waveformArgs', () => {
  it('decodes only the audio, mono and at a low rate, which is enough to draw the waveform', () => {
    const args = waveformArgs('/Movies/session.mov')
    expect(args).toContain('-vn')
    expect(valueAfter(args, '-ac')).toBe('1')
    expect(valueAfter(args, '-ar')).toBe(String(WAVEFORM_SAMPLE_RATE))
    expect(valueAfter(args, '-f')).toBe('s16le')
    expect(args.at(-1)).toBe('pipe:1')
  })
})

describe('peaksFromSamples', () => {
  it('keeps the loudest sample of each slice, normalised to 0..1', () => {
    const samplesPerPeak = WAVEFORM_SAMPLE_RATE / PEAKS_PER_SECOND
    const samples = new Int16Array(samplesPerPeak * 2)
    samples[3] = -16384
    samples[samplesPerPeak + 5] = 32767
    const peaks = peaksFromSamples(samples)
    expect(peaks).toHaveLength(2)
    expect(peaks[0]).toBeCloseTo(0.5, 2)
    expect(peaks[1]).toBeCloseTo(1, 2)
  })
})

describe('parseFrameRate', () => {
  it('reads the frame rate from the video stream line ffmpeg prints', () => {
    expect(parseFrameRate('Stream #0:0: Video: h264 (High), yuv420p, 1280x720, 5000 kb/s, 60 fps, 60 tbr, 600 tbn')).toBe(60)
    expect(parseFrameRate('Stream #0:0: Video: h264, 1920x1080, 29.97 fps, 29.97 tbr')).toBe(29.97)
  })

  it('returns null when there is no video stream', () => {
    expect(parseFrameRate('Stream #0:0: Audio: aac, 48000 Hz, stereo')).toBeNull()
  })
})
