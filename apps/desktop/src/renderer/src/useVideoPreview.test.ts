import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '@shared/api'
import { useThumbnails } from './useVideoPreview'

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
    const { rerender } = renderHook(({ times }) => useThumbnails(VIDEO, times), { initialProps: { times: [1, 2, 3] } })
    rerender({ times: [10, 20] })
    await finishAll()
    expect(thumbnail.mock.calls.map(([, time]) => time)).toEqual([1, 10, 20])
  })

  it('reads the skipped frames again when they come back into view', async () => {
    const { rerender, result } = renderHook(({ times }) => useThumbnails(VIDEO, times), { initialProps: { times: [1, 2] } })
    rerender({ times: [10] })
    await finishAll()
    rerender({ times: [1, 2] })
    await finishAll()
    expect([...result.current.keys()].sort((a, b) => a - b)).toEqual([1, 2, 10])
  })
})
