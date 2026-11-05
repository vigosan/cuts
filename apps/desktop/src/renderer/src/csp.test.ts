import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function directives(): Map<string, string[]> {
  const html = readFileSync(resolve(__dirname, '../index.html'), 'utf8')
  const content = html.match(/http-equiv="Content-Security-Policy"\s+content="([^"]*)"/)?.[1] ?? ''
  const map = new Map<string, string[]>()
  for (const part of content.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/)
    if (name) map.set(name, sources)
  }
  return map
}

describe('renderer content security policy', () => {
  it('lets images load through the media protocol so overlay PNGs are not blocked and cleared in the real app', () => {
    expect(directives().get('img-src')).toContain('media:')
  })

  it('keeps everything else locked to the app origin', () => {
    expect(directives().get('default-src')).toEqual(["'self'"])
  })
})
