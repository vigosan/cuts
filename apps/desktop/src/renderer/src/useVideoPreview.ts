import { useEffect, useRef, useState } from 'react'

export function useWaveform(path: string): Float32Array | null {
  const [peaks, setPeaks] = useState<{ path: string; peaks: Float32Array } | null>(null)
  useEffect(() => {
    let current = true
    window.api.waveform(path).then(
      (result) => current && setPeaks({ path, peaks: result }),
      () => {}
    )
    return () => {
      current = false
    }
  }, [path])
  return peaks?.path === path ? peaks.peaks : null
}

const NO_FRAMES = new Map<number, string>()

export function useThumbnails(path: string, times: number[]): Map<number, string> {
  const cache = useRef({ path, frames: new Map<number, string>(), pending: new Set<number>() })
  const [shown, setShown] = useState({ path, frames: NO_FRAMES })

  const key = times.join(',')
  useEffect(() => {
    if (cache.current.path !== path) cache.current = { path, frames: new Map(), pending: new Set() }
    const entry = cache.current
    const wanted = key === '' ? [] : key.split(',').map(Number)
    const missing = wanted.filter((time) => !entry.frames.has(time) && !entry.pending.has(time))
    missing.forEach((time) => entry.pending.add(time))
    let current = true
    const next = async () => {
      for (const time of missing) {
        if (!current) return
        const src = await window.api.thumbnail(path, time).catch(() => null)
        entry.pending.delete(time)
        if (src) entry.frames.set(time, src)
        setShown({ path, frames: new Map(entry.frames) })
      }
    }
    void next()
    return () => {
      current = false
      missing.forEach((time) => entry.frames.has(time) || entry.pending.delete(time))
    }
  }, [path, key])

  return shown.path === path ? shown.frames : NO_FRAMES
}
