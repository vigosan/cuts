import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Clip } from '@cuts/core/clips'

type Options = {
  clips: Clip[]
  playing: boolean
  now: () => number
  seekTo: (time: number) => void
  play: () => void
  pause: () => void
}

export function useClipLoop({ clips, playing, now, seekTo, play, pause }: Options) {
  const [loopingId, setLoopingId] = useState<string | null>(null)
  const looping = useRef<string | null>(null)
  const loopingClip = clips.find((clip) => clip.id === loopingId) ?? null

  const loop = (id: string | null) => {
    looping.current = id
    setLoopingId(id)
  }

  const playClip = (clip: Clip) => {
    if (loopingId === clip.id) {
      pause()
      loop(null)
      return
    }
    loop(clip.id)
    seekTo(clip.start)
    play()
  }

  const keepLooping = () => {
    const index = clips.findIndex((clip) => clip.id === looping.current)
    if (index < 0 || now() < clips[index].end) return
    const next = clips[(index + 1) % clips.length]
    loop(next.id)
    seekTo(next.start)
  }

  const seekFromTimeline = (t: number) => {
    if (loopingClip && (t < loopingClip.start || t > loopingClip.end)) loop(null)
    seekTo(t)
  }

  const onFrame = useEffectEvent(() => keepLooping())
  const isLooping = loopingClip !== null
  useEffect(() => {
    if (!isLooping || !playing) return
    let frame = requestAnimationFrame(function check() {
      onFrame()
      frame = requestAnimationFrame(check)
    })
    return () => cancelAnimationFrame(frame)
  }, [isLooping, playing])

  return { loopingId, loop, playClip, keepLooping, seekFromTimeline }
}
