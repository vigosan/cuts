import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { suggestMoments } from '@cuts/core/suggest'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'

const fixtures = join(import.meta.dirname, '../../fixtures')
const peaks = (name: string) => new Float32Array(JSON.parse(readFileSync(join(fixtures, name), 'utf8')))
const suggest = (values: Float32Array) =>
  suggestMoments({ peaks: values, peaksPerSecond: PEAKS_PER_SECOND, duration: values.length / PEAKS_PER_SECOND, clipLength: 59, existing: [] })

describe('suggest parity', () => {
  it('the iPhone suggests the same moments as the Mac for the same set', () => {
    const mac = suggest(peaks('set-reference-peaks.json'))
    const phone = suggest(peaks('set-swift-peaks.json'))
    expect(mac.length).toBeGreaterThan(0)
    expect(phone).toHaveLength(mac.length)
    phone.forEach((moment, i) => expect(Math.abs(moment.start - mac[i].start)).toBeLessThanOrEqual(0.75))
  })
})
