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

export function useThumbnails(path: string, times: number[]): Map<number, string> {
  const cache = useRef({ path, frames: new Map<number, string>(), pending: new Set<number>() })
  const [, setVersion] = useState(0)
  if (cache.current.path !== path) cache.current = { path, frames: new Map(), pending: new Set() }

  const key = times.join(',')
  useEffect(() => {
    const entry = cache.current
    const missing = times.filter((time) => !entry.frames.has(time) && !entry.pending.has(time))
    missing.forEach((time) => entry.pending.add(time))
    const next = async () => {
      for (const time of missing) {
        if (cache.current !== entry) return
        const src = await window.api.thumbnail(path, time).catch(() => null)
        entry.pending.delete(time)
        if (src) entry.frames.set(time, src)
        setVersion((v) => v + 1)
      }
    }
    void next()
  }, [path, key])

  return cache.current.frames
}
