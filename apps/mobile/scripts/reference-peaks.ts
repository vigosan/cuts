import { execFileSync } from 'node:child_process'
import { peaksFromSamples, waveformArgs } from '../../desktop/src/main/preview.ts'

const raw = execFileSync(process.env.FFMPEG ?? 'ffmpeg', waveformArgs(process.argv[2]), { maxBuffer: 1 << 30 })
const even = raw.byteLength - (raw.byteLength % 2)
const peaks = peaksFromSamples(new Int16Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + even)))
process.stdout.write(JSON.stringify(Array.from(peaks)))
