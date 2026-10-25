import { describe, expect, it } from 'vitest'
import { existingAncestor } from './paths'

describe('existingAncestor', () => {
  it('keeps a folder that exists', () => {
    expect(existingAncestor('/Users/vicent/Movies/Cuts', () => true)).toBe('/Users/vicent/Movies/Cuts')
  })

  it('climbs to the nearest existing parent, since Movies/Cuts is only created on the first export', () => {
    const existing = new Set(['/Users/vicent/Movies', '/Users/vicent', '/Users', '/'])
    expect(existingAncestor('/Users/vicent/Movies/Cuts', (p) => existing.has(p))).toBe('/Users/vicent/Movies')
  })
})
