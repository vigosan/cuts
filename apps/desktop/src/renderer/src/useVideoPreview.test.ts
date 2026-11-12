import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '@shared/api'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { useThumbnails, useWaveform } from './useVideoPreview'

const VIDEO = '/Movies/session.mov'
let finishers: (() => void)[]
let thumbnail: ReturnType<typeof vi.fn>

beforeEach(() => {
  finishers = []
  thumbnail = vi.fn(
    (_path: string, time: number) => new Promise<string>((resolve) => finishers.push(() => resolve(`frame ${time}`)))
  )
  Object.assign(window, { api: { thumbnail } as unknown as Api })
})

async function finishAll() {
  while (finishers.length > 0) await act(async () => finishers.shift()!())
}

describe('useThumbnails', () => {
  it('stops reading frames that scrolled out of view, so zooming never queues ffmpeg work nobody will see', async () => {
    const { rerender } = renderHook(({ times }) => useThumbnails(times.map((time) => ({ path: VIDEO, time }))), { initialProps: { times: [1, 2, 3] } })
    rerender({ times: [10, 20] })
    await finishAll()
    expect(thumbnail.mock.calls.map(([, time]) => time)).toEqual([1, 10, 20])
  })

  it('reads the skipped frames again when they come back into view', async () => {
    const { rerender, result } = renderHook(({ times }) => useThumbnails(times.map((time) => ({ path: VIDEO, time }))), { initialProps: { times: [1, 2] } })
    rerender({ times: [10] })
    await finishAll()
    rerender({ times: [1, 2] })
    await finishAll()
    expect([...result.current.keys()].sort()).toEqual([`${VIDEO}|1`, `${VIDEO}|10`, `${VIDEO}|2`])
  })
})

describe('useThumbnails across videos', () => {
  it('asks for the frame of the video a tile belongs to, so the strip shows every original', async () => {
    renderHook(() =>
      useThumbnails([
        { path: '/a.mov', time: 5 },
        { path: '/b.mov', time: 5 }
      ])
    )
    await finishAll()
    expect(thumbnail.mock.calls).toEqual([
      ['/a.mov', 5],
      ['/b.mov', 5]
    ])
  })
})

describe('useThumbnails memory', () => {
  it('drops the frames of videos no longer shown, so a long run does not keep every session in memory', async () => {
    const { rerender } = renderHook(({ path }) => useThumbnails([{ path, time: 1 }]), { initialProps: { path: '/a.mov' } })
    await finishAll()
    rerender({ path: '/b.mov' })
    await finishAll()
    rerender({ path: '/a.mov' })
    await finishAll()
    expect(thumbnail.mock.calls.map(([path]) => path)).toEqual(['/a.mov', '/b.mov', '/a.mov'])
  })
})

describe('useWaveform', () => {
  let waveform: ReturnType<typeof vi.fn>
  beforeEach(() => {
    waveform = vi.fn(async (path: string) => new Float32Array(path === '/a.mov' ? 2 * PEAKS_PER_SECOND : 3 * PEAKS_PER_SECOND).fill(path === '/a.mov' ? 0.25 : 0.75))
    Object.assign(window, { api: { waveform } as unknown as Api })
  })

  it('keeps a single video exactly as read, so one-video sessions do not change', async () => {
    const { result } = renderHook(() => useWaveform([{ path: '/a.mov', duration: 2 }]))
    await waitFor(() => expect(result.current.analysing).toBe(false))
    expect(waveform.mock.calls).toEqual([['/a.mov']])
    expect(result.current.peaks).toHaveLength(2 * PEAKS_PER_SECOND)
  })

  it('joins the peaks of every video in order, so the waveform lines up with the session clock', async () => {
    const { result } = renderHook(() =>
      useWaveform([
        { path: '/a.mov', duration: 2 },
        { path: '/b.mov', duration: 3 }
      ])
    )
    expect(result.current.analysing).toBe(true)
    await waitFor(() => expect(result.current.analysing).toBe(false))
    expect(waveform.mock.calls.map(([path]) => path)).toEqual(['/a.mov', '/b.mov'])
    expect(result.current.peaks).toHaveLength(5 * PEAKS_PER_SECOND)
    expect(result.current.peaks![0]).toBe(0.25)
    expect(result.current.peaks![2 * PEAKS_PER_SECOND]).toBe(0.75)
  })

  it('leaves a missing video silent without reading it, since its file is gone', async () => {
    const { result } = renderHook(() =>
      useWaveform([
        { path: '/gone.mov', duration: 2, missing: true },
        { path: '/b.mov', duration: 3 }
      ])
    )
    await waitFor(() => expect(result.current.analysing).toBe(false))
    expect(waveform.mock.calls).toEqual([['/b.mov']])
    expect(result.current.peaks).toHaveLength(5 * PEAKS_PER_SECOND)
    expect(result.current.peaks![0]).toBe(0)
    expect(result.current.peaks![2 * PEAKS_PER_SECOND]).toBe(0.75)
  })

  it('is done at once when every video is missing, so the timeline never waits on audio that cannot come', async () => {
    const { result } = renderHook(() => useWaveform([{ path: '/gone.mov', duration: 2, missing: true }]))
    expect(result.current.analysing).toBe(false)
    expect(result.current.peaks).toBeNull()
    expect(waveform).not.toHaveBeenCalled()
  })

  it('does not refetch when only a duration changes, so loading metadata never restarts the analysis', async () => {
    const { result, rerender } = renderHook(({ duration }) => useWaveform([{ path: '/a.mov', duration }]), { initialProps: { duration: 0 } })
    await waitFor(() => expect(result.current.analysing).toBe(false))
    rerender({ duration: 2 })
    expect(result.current.analysing).toBe(false)
    expect(waveform).toHaveBeenCalledTimes(1)
  })
})
