import { describe, expect, it } from 'vitest'
import { parseRange } from './range'
import { mediaUrl, pathFromMediaUrl } from '../shared/media-url'

const size = 2_527_766_340

describe('parseRange', () => {
  it('serves the whole file when the player sends no range', () => {
    expect(parseRange(null, size)).toBeNull()
  })

  it('serves an explicit byte window', () => {
    expect(parseRange('bytes=0-99', size)).toEqual({ start: 0, end: 99 })
  })

  it('serves to the end of a multi-GB file for open-ended seeks', () => {
    expect(parseRange('bytes=1000-', size)).toEqual({ start: 1000, end: size - 1 })
  })

  it('serves a suffix range for reading the moov atom at the end of a .mov', () => {
    expect(parseRange('bytes=-500', size)).toEqual({ start: size - 500, end: size - 1 })
  })

  it('clamps an end beyond the file', () => {
    expect(parseRange('bytes=10-99999999999', 100)).toEqual({ start: 10, end: 99 })
  })

  it('rejects a start past the end of the file', () => {
    expect(parseRange('bytes=100-', 100)).toBe('invalid')
  })

  it('rejects garbage headers', () => {
    expect(parseRange('items=1-2', 100)).toBe('invalid')
  })
})

describe('mediaUrl', () => {
  it('round-trips session file names with spaces', () => {
    const path = '/Users/vicent/Movies/2026-10-22 22-33-13.mov'
    expect(pathFromMediaUrl(mediaUrl(path))).toBe(path)
  })
})
