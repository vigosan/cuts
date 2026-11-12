import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { Clip } from '@cuts/core/clips'

type Options = {
  clips: Clip[]
  playing: boolean
  now: () => number
  seekTo: (time: number) => void
  play: () => void
  pause: () => void
  playable: (clip: Clip) => boolean
}

export function useClipLoop({ clips, playing, now, seekTo, play, pause, playable }: Options) {
  const [loopingId, setLoopingId] = useState<string | null>(null)
  const looping = useRef<string | null>(null)
  const loopingClip = clips.find((clip) => clip.id === loopingId) ?? null

  const loop = (id: string | null) => {
    looping.current = id
    setLoopingId(id)
  }

  const nextPlayable = (from: number) => clips.map((_, i) => clips[(from + i) % clips.length]).find(playable)

  const playClip = (clip: Clip) => {
    if (loopingId === clip.id) {
      pause()
      loop(null)
      return
    }
    const start = nextPlayable(clips.findIndex((other) => other.id === clip.id))
    if (!start) return
    loop(start.id)
    seekTo(start.start)
    play()
  }

  const keepLooping = () => {
    const index = clips.findIndex((clip) => clip.id === looping.current)
    if (index < 0 || now() < clips[index].end) return
    const next = nextPlayable(index + 1)
    if (!next) return
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
