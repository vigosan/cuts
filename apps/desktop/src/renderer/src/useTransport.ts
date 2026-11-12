import { useRef, type RefObject } from 'react'

const MAX_SHUTTLE = 4

type Playback = { playing: () => boolean; play: () => void; pause: () => void }

export function useTransport(
  now: () => number,
  seek: (time: number) => void,
  videoRef: RefObject<HTMLVideoElement | null>,
  duration: number,
  playback: Playback
) {
  const shuttle = useRef(0)

  const seekTo = (t: number) => seek(Math.max(0, Math.min(t, duration || t)))
  const togglePlay = () => (playback.playing() ? playback.pause() : playback.play())
  const stepTo = (t: number) => {
    playback.pause()
    seekTo(t)
  }
  const shuttleForward = () => {
    const video = videoRef.current
    if (!video) return
    shuttle.current = shuttle.current === 0 ? 1 : Math.min(shuttle.current * 2, MAX_SHUTTLE)
    video.playbackRate = video.defaultPlaybackRate = shuttle.current
    if (shuttle.current === 1) void video.play()
  }
  const stopShuttle = () => {
    const video = videoRef.current
    if (!video) return
    playback.pause()
    shuttle.current = 0
    video.playbackRate = video.defaultPlaybackRate = 1
  }

  return { now, seekTo, togglePlay, stepTo, shuttleForward, stopShuttle }
}
