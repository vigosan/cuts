import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'

export const WAVEFORM_SAMPLE_RATE = 2000

export function thumbnailArgs(input: string, time: number, height: number): string[] {
  return [
    '-hide_banner',
    '-loglevel', 'error',
    '-ss', String(Number(time.toFixed(3))),
    '-i', input,
    '-frames:v', '1',
    '-vf', `scale=-2:${height}`,
    '-f', 'image2pipe',
    '-c:v', 'mjpeg',
    '-q:v', '5',
    'pipe:1'
  ]
}

export function waveformArgs(input: string): string[] {
  return [
    '-hide_banner',
    '-loglevel', 'error',
    '-i', input,
    '-vn',
    '-ac', '1',
    '-ar', String(WAVEFORM_SAMPLE_RATE),
    '-f', 's16le',
    'pipe:1'
  ]
}

export function peaksFromSamples(samples: Int16Array): Float32Array {
  const samplesPerPeak = WAVEFORM_SAMPLE_RATE / PEAKS_PER_SECOND
  const peaks = new Float32Array(Math.ceil(samples.length / samplesPerPeak))
  for (let i = 0; i < samples.length; i++) {
    const value = Math.abs(samples[i]) / 32768
    const slot = Math.floor(i / samplesPerPeak)
    if (value > peaks[slot]) peaks[slot] = value
  }
  return peaks
}

export function parseFrameRate(ffmpegOutput: string): number | null {
  const match = /Video:.*?(\d+(?:\.\d+)?) fps/.exec(ffmpegOutput)
  return match ? Number(match[1]) : null
}
