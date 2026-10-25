import { describe, expect, it } from 'vitest'
import {
  clipDuration,
  defaultBaseName,
  formatDuration,
  formatTime,
  isOverLimit,
  outputFileName
} from './clips'

describe('clip limit', () => {
  it('allows a clip of exactly 59 s because that is what Instagram already accepts from him', () => {
    expect(isOverLimit({ id: 'a', start: 100, end: 159 })).toBe(false)
  })

  it('flags anything past 59 s so a failed upload is caught before exporting', () => {
    expect(isOverLimit({ id: 'a', start: 100, end: 159.01 })).toBe(true)
  })

  it('measures duration from start to end', () => {
    expect(clipDuration({ id: 'a', start: 10.5, end: 40 })).toBe(29.5)
  })
})

describe('time display', () => {
  it('shows playhead positions in a long session as HH:MM:SS', () => {
    expect(formatTime(584)).toBe('00:09:44')
    expect(formatTime(4880.9)).toBe('01:21:20')
  })

  it('shows clip durations compactly as M:SS', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(59)).toBe('0:59')
  })

  it('rounds durations up so a clip just over the limit never reads as 0:59', () => {
    expect(formatDuration(59.3)).toBe('1:00')
    expect(formatDuration(159.0000001 - 100)).toBe('0:59')
  })
})

describe('output naming', () => {
  it('numbers clips from 1 so they upload in carousel order', () => {
    expect(outputFileName('sesion', 0)).toBe('sesion-1.mp4')
    expect(outputFileName('sesion', 5)).toBe('sesion-6.mp4')
  })

  it('defaults the base name to the source file name without extension', () => {
    expect(defaultBaseName('/Users/x/Movies/2026-10-22 22-33-13.mov')).toBe('2026-10-22 22-33-13')
  })

  it('reads the file name from a Windows path too, or the exported clips would be named after the whole path', () => {
    expect(defaultBaseName('C:\\Users\\x\\Videos\\set.mov')).toBe('set')
  })
})
