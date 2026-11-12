import { useEffect, useRef, useState, type RefObject } from 'react'
import { localTime, nextAvailable, partStarts } from '@cuts/core/parts'

type ClockPart = { path: string; duration: number; missing?: boolean }
type Target = { index: number; time: number; local: number; play: boolean }

export function useSessionClock(videoRef: RefObject<HTMLVideoElement | null>, parts: ClockPart[]) {
  const key = parts.map((part) => part.path).join('\n')
  const first = nextAvailable(parts, 0) ?? 0
  const [shown, setShown] = useState({ key, index: first })
  const index = shown.key === key ? shown.index : first
  if (shown.key !== key) setShown({ key, index })
  const target = useRef<Target | null>(null)
  const committed = useRef(index)
  useEffect(() => {
    target.current = null
  }, [key])
  useEffect(() => {
    committed.current = index
  }, [index])

  const starts = partStarts(parts)

  const show = (to: number) => setShown((current) => (current.key === key && current.index === to ? current : { key, index: to }))
  const aim = (next: Target) => {
    target.current = next
    show(next.index)
  }

  const now = () => target.current?.time ?? (starts[committed.current] ?? 0) + (videoRef.current?.currentTime ?? 0)

  const seekTo = (time: number) => {
    const video = videoRef.current
    if (!video) return
    const { index: to, time: local } = localTime(parts, time)
    const switching = target.current !== null && target.current.index !== committed.current
    if (to === committed.current && (!target.current || switching)) {
      target.current = null
      video.currentTime = local
      show(to)
      return
    }
    if (parts[to].missing) video.pause()
    aim({ index: to, time, local, play: !parts[to].missing && (target.current?.play ?? !video.paused) })
  }

  const play = () => {
    if (target.current) target.current.play = !parts[target.current.index].missing
    else void videoRef.current?.play()
  }

  const onLoadedMetadata = () => {
    const video = videoRef.current
    const landing = target.current
    if (!video || !landing || landing.index !== committed.current) return
    target.current = null
    video.currentTime = landing.local
    if (landing.play) void video.play()
  }

  const onEnded = () => {
    if (target.current) return
    const next = nextAvailable(parts, committed.current + 1)
    if (next !== null) aim({ index: next, time: starts[next], local: 0, play: true })
  }

  const continuing = () =>
    Boolean(target.current?.play) || (Boolean(videoRef.current?.ended) && nextAvailable(parts, committed.current + 1) !== null)

  return { src: parts[index]?.path ?? '', index, now, seekTo, play, onLoadedMetadata, onEnded, continuing }
}
