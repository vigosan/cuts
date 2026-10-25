import { useRef, type RefObject } from 'react'

const MAX_SHUTTLE = 4

export function useTransport(videoRef: RefObject<HTMLVideoElement | null>, duration: number) {
  const shuttle = useRef(0)

  const now = () => videoRef.current?.currentTime ?? 0
  const seekTo = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, Math.min(t, duration || t))
  }
  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play()
    else video.pause()
  }
  const stepTo = (t: number) => {
    videoRef.current?.pause()
    seekTo(t)
  }
  const shuttleForward = () => {
    const video = videoRef.current
    if (!video) return
    shuttle.current = shuttle.current === 0 ? 1 : Math.min(shuttle.current * 2, MAX_SHUTTLE)
    video.playbackRate = shuttle.current
    if (shuttle.current === 1) void video.play()
  }
  const stopShuttle = () => {
    const video = videoRef.current
    if (!video) return
    video.pause()
    shuttle.current = 0
    video.playbackRate = 1
  }

  return { now, seekTo, togglePlay, stepTo, shuttleForward, stopShuttle }
}
