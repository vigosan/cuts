import { describe, expect, it } from 'vitest'
import { updatesEnabled } from './updates'

describe('updatesEnabled', () => {
  it('updates a packaged download from the website, which nothing else would ever update', () => {
    expect(updatesEnabled({ packaged: true, mas: false, windowsStore: false })).toBe(true)
  })

  it('stays off in development, where there is no signed build to replace', () => {
    expect(updatesEnabled({ packaged: false, mas: false, windowsStore: false })).toBe(false)
  })

  it('leaves App Store and Microsoft Store copies to their store, which forbids apps updating themselves', () => {
    expect(updatesEnabled({ packaged: true, mas: true, windowsStore: false })).toBe(false)
    expect(updatesEnabled({ packaged: true, mas: false, windowsStore: true })).toBe(false)
  })
})
