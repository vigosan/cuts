import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { openFileBatch } from './open-file-batch'

describe('openFileBatch', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('sends files opened from Finder just before and just after the window loads as one batch, so a launch selection is never split and replaced', () => {
    const send = vi.fn()
    const batch = openFileBatch(300)
    batch.add('/Movies/a.mov')
    batch.ready(send)
    vi.advanceTimersByTime(100)
    batch.add('/Movies/b.mov')
    vi.advanceTimersByTime(299)
    expect(send).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(['/Movies/a.mov', '/Movies/b.mov'])
  })

  it('holds files until the window can receive them, so nothing opened during launch is lost', () => {
    const send = vi.fn()
    const batch = openFileBatch(300)
    batch.add('/Movies/a.mov')
    vi.advanceTimersByTime(1000)
    batch.ready(send)
    vi.advanceTimersByTime(300)
    expect(send).toHaveBeenCalledWith(['/Movies/a.mov'])
  })

  it('sends nothing at load when no file was opened, so an empty launch opens no video', () => {
    const send = vi.fn()
    openFileBatch(300).ready(send)
    vi.advanceTimersByTime(1000)
    expect(send).not.toHaveBeenCalled()
  })

  it('sends separate Finder opens after launch as separate batches, so each later selection opens on its own', () => {
    const send = vi.fn()
    const batch = openFileBatch(300)
    batch.ready(send)
    batch.add('/Movies/a.mov')
    vi.advanceTimersByTime(300)
    batch.add('/Movies/b.mov')
    vi.advanceTimersByTime(300)
    expect(send.mock.calls).toEqual([[['/Movies/a.mov']], [['/Movies/b.mov']]])
  })
})
