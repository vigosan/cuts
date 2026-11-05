import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('App Store build', () => {
  it('declares no non-exempt encryption, so each upload reaches TestFlight without answering export compliance by hand', () => {
    const config = readFileSync(resolve('electron-builder.yml'), 'utf8')
    const mas = config.split(/^mas:$/m)[1].split(/^\S/m)[0]
    expect(mas).toMatch(/extendInfo:\r?\n\s+ITSAppUsesNonExemptEncryption: false\r?\n/)
  })
})
