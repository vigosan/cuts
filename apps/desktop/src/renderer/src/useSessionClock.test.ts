import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSessionClock } from './useSessionClock'

function fakeVideo({ paused = true } = {}) {
  const video = {
    currentTime: 0,
    paused,
    ended: false,
    play: vi.fn(async () => {
      video.paused = false
    }),
    pause: vi.fn(() => {
      video.paused = true
    })
  }
  return video
}

type Parts = { path: string; duration: number; missing?: boolean }[]

function clockOver(parts: Parts, video = fakeVideo()) {
  const videoRef = { current: video as unknown as HTMLVideoElement }
  const hook = renderHook(({ parts }) => useSessionClock(videoRef, parts), { initialProps: { parts } })
  return { video, ...hook }
}

const TWO = [
  { path: '/set/a.mov', duration: 60 },
  { path: '/set/b.mov', duration: 30 }
]

describe('useSessionClock', () => {
  it('reads and seeks the video directly for a single video, so one video plays exactly as before', () => {
    const { video, result } = clockOver([{ path: '/set/a.mov', duration: 0 }])
    act(() => result.current.seekTo(42))
    expect(video.currentTime).toBe(42)
    expect(result.current.now()).toBe(42)
    expect(result.current.src).toBe('/set/a.mov')
  })

  it('loads the video under a seek in another part and lands on its local time once it is ready, so the session plays as one timeline', () => {
    const { video, result } = clockOver(TWO)
    act(() => result.current.seekTo(65))
    expect(result.current.src).toBe('/set/b.mov')
    expect(result.current.index).toBe(1)
    expect(result.current.now()).toBe(65)
    act(() => result.current.onLoadedMetadata())
    expect(video.currentTime).toBe(5)
    expect(result.current.now()).toBe(65)
  })

  it('reports the requested time while the next video loads, so the playhead never shows the previous video’s time', () => {
    const { video, result } = clockOver(TWO)
    video.currentTime = 50
    act(() => result.current.seekTo(65))
    expect(result.current.now()).toBe(65)
  })

  it('keeps playing after seeking into another video while playing', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver(TWO, video)
    act(() => result.current.seekTo(65))
    video.paused = true
    act(() => result.current.onLoadedMetadata())
    expect(video.play).toHaveBeenCalled()
  })

  it('stays paused after seeking into another video while paused', () => {
    const { video, result } = clockOver(TWO)
    act(() => result.current.seekTo(65))
    act(() => result.current.onLoadedMetadata())
    expect(video.play).not.toHaveBeenCalled()
  })

  it('plays the video it is loading once it is ready when play is asked mid-switch, so a clip in another video starts playing from its row', () => {
    const { video, result } = clockOver(TWO)
    act(() => result.current.seekTo(65))
    act(() => result.current.play())
    expect(video.play).not.toHaveBeenCalled()
    act(() => result.current.onLoadedMetadata())
    expect(video.currentTime).toBe(5)
    expect(video.play).toHaveBeenCalled()
  })

  it('stays paused once the next video is ready when paused while it loads, so Space, K or a stop during a switch is honoured', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver(TWO, video)
    act(() => result.current.seekTo(65))
    video.paused = true
    expect(result.current.playing()).toBe(true)
    act(() => result.current.pause())
    expect(result.current.playing()).toBe(false)
    act(() => result.current.onLoadedMetadata())
    expect(video.currentTime).toBe(5)
    expect(video.play).not.toHaveBeenCalled()
  })

  it('pauses the video itself when nothing is loading, so a single video pauses exactly as before', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver([{ path: '/set/a.mov', duration: 0 }], video)
    expect(result.current.playing()).toBe(true)
    act(() => result.current.pause())
    expect(video.pause).toHaveBeenCalled()
    expect(result.current.playing()).toBe(false)
  })

  it('plays on into the next video when one ends, so the session is heard without a stop at the join', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver(TWO, video)
    video.currentTime = 60
    video.paused = true
    video.ended = true
    act(() => result.current.onEnded())
    expect(result.current.src).toBe('/set/b.mov')
    expect(result.current.now()).toBe(60)
    act(() => result.current.onLoadedMetadata())
    expect(video.currentTime).toBe(0)
    expect(video.play).toHaveBeenCalled()
  })

  it('stops at the session end when the last video ends, instead of starting over from the first video', () => {
    const { video, result } = clockOver(TWO)
    act(() => result.current.seekTo(65))
    act(() => result.current.onLoadedMetadata())
    video.currentTime = 30
    video.ended = true
    act(() => result.current.onEnded())
    expect(result.current.src).toBe('/set/b.mov')
    expect(result.current.now()).toBe(90)
    expect(video.play).not.toHaveBeenCalled()
  })

  it('skips a missing video when the one before it ends, so a gone file never stops the session', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver([TWO[0], { path: '/set/gone.mov', duration: 20, missing: true }, { path: '/set/c.mov', duration: 10 }], video)
    video.currentTime = 60
    video.ended = true
    act(() => result.current.onEnded())
    expect(result.current.src).toBe('/set/c.mov')
    expect(result.current.now()).toBe(80)
  })

  it('shows a missing video paused at the requested time when seeking into it, so its stretch can still be looked at', () => {
    const video = fakeVideo({ paused: false })
    const { result } = clockOver([TWO[0], { path: '/set/gone.mov', duration: 20, missing: true }], video)
    act(() => result.current.seekTo(70))
    expect(result.current.src).toBe('/set/gone.mov')
    expect(video.pause).toHaveBeenCalled()
    expect(result.current.now()).toBe(70)
  })

  it('plays on from the next video that is there when play is pressed on a missing one, since its own file cannot play', () => {
    const { video, result } = clockOver([TWO[0], { path: '/set/gone.mov', duration: 20, missing: true }, { path: '/set/c.mov', duration: 10 }])
    act(() => result.current.seekTo(70))
    act(() => result.current.play())
    expect(result.current.src).toBe('/set/c.mov')
    expect(result.current.now()).toBe(80)
    act(() => result.current.onLoadedMetadata())
    expect(video.currentTime).toBe(0)
    expect(video.play).toHaveBeenCalled()
  })

  it('does nothing when play is pressed on a missing video at the end of the session, since nothing after it can play', () => {
    const { video, result } = clockOver([TWO[0], { path: '/set/gone.mov', duration: 20, missing: true }])
    act(() => result.current.seekTo(70))
    act(() => result.current.play())
    expect(result.current.src).toBe('/set/gone.mov')
    expect(result.current.now()).toBe(70)
    expect(video.play).not.toHaveBeenCalled()
  })

  it('starts on the first video that is still there', () => {
    const { result } = clockOver([{ ...TWO[0], missing: true }, TWO[1]])
    expect(result.current.src).toBe('/set/b.mov')
    expect(result.current.now()).toBe(60)
  })

  it('starts from the first video again when another session opens', () => {
    const { result, rerender } = clockOver(TWO)
    act(() => result.current.seekTo(65))
    rerender({ parts: [{ path: '/other.mov', duration: 0 }] })
    expect(result.current.src).toBe('/other.mov')
    expect(result.current.index).toBe(0)
  })
})
