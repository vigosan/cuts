import { useEffect, useEffectEvent, useRef, useState, type RefObject } from 'react'
import type { Clip } from '@cuts/core/clips'

type Options = {
  videoRef: RefObject<HTMLVideoElement | null>
  clips: Clip[]
  playing: boolean
  seekTo: (time: number) => void
}

export function useClipLoop({ videoRef, clips, playing, seekTo }: Options) {
  const [loopingId, setLoopingId] = useState<string | null>(null)
  const looping = useRef<string | null>(null)
  const loopingClip = clips.find((clip) => clip.id === loopingId) ?? null

  const loop = (id: string | null) => {
    looping.current = id
    setLoopingId(id)
  }

  const playClip = (clip: Clip) => {
    if (loopingId === clip.id) {
      videoRef.current?.pause()
      loop(null)
      return
    }
    loop(clip.id)
    seekTo(clip.start)
    void videoRef.current?.play()
  }

  const keepLooping = (video: HTMLVideoElement) => {
    const index = clips.findIndex((clip) => clip.id === looping.current)
    if (index < 0 || video.currentTime < clips[index].end) return
    const next = clips[(index + 1) % clips.length]
    loop(next.id)
    video.currentTime = next.start
  }

  const seekFromTimeline = (t: number) => {
    if (loopingClip && (t < loopingClip.start || t > loopingClip.end)) loop(null)
    seekTo(t)
  }

  const onFrame = useEffectEvent((video: HTMLVideoElement) => keepLooping(video))
  const isLooping = loopingClip !== null
  useEffect(() => {
    const video = videoRef.current
    if (!video || !isLooping || !playing) return
    let frame = requestAnimationFrame(function check() {
      onFrame(video)
      frame = requestAnimationFrame(check)
    })
    return () => cancelAnimationFrame(frame)
  }, [videoRef, isLooping, playing])

  return { loopingId, loop, playClip, keepLooping, seekFromTimeline }
}
