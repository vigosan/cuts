import { useEffect, useMemo, useRef, useState } from 'react'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { joinPeaks } from '@cuts/core/parts'

export type WaveformPart = { path: string; duration: number; missing?: boolean }

export function fetchPeaks(parts: WaveformPart[]): Promise<(Float32Array | null)[]> {
  return Promise.all(parts.map((part) => (part.missing ? null : window.api.waveform(part.path).catch(() => null))))
}

export function combinePeaks(fetched: (Float32Array | null)[], parts: WaveformPart[]): Float32Array | null {
  if (fetched.every((peaks) => peaks === null)) return null
  if (parts.length === 1) return fetched[0]
  return joinPeaks(
    fetched,
    parts.map((part) => part.duration),
    PEAKS_PER_SECOND
  )
}

export function useWaveform(parts: WaveformPart[]): { peaks: Float32Array | null; analysing: boolean } {
  const [fetched, setFetched] = useState<{ key: string; peaks: (Float32Array | null)[] } | null>(null)
  const key = parts.map((part) => (part.missing ? '' : part.path)).join('\n')
  const durations = parts.map((part) => part.duration).join(',')
  useEffect(() => {
    if (!key.split('\n').some((path) => path !== '')) return
    let current = true
    const available = key.split('\n').map((path) => ({ path, duration: 0, missing: path === '' }))
    void fetchPeaks(available).then((peaks) => current && setFetched({ key, peaks }))
    return () => {
      current = false
    }
  }, [key])
  const done = fetched?.key === key
  const peaks = useMemo(() => {
    if (!done) return null
    const sized = durations.split(',').map((duration, i) => ({ path: '', duration: Number(duration), missing: fetched.peaks[i] === null }))
    return combinePeaks(fetched.peaks, sized)
  }, [done, fetched, durations])
  return { peaks, analysing: parts.some((part) => !part.missing) && !done }
}

const NO_FRAMES = new Map<string, string>()

export type ThumbnailRequest = { path: string; time: number }

export function useThumbnails(requests: ThumbnailRequest[]): Map<string, string> {
  const cache = useRef({ paths: '', frames: new Map<string, string>(), pending: new Set<string>() })
  const [shown, setShown] = useState(NO_FRAMES)

  const key = requests.map((request) => `${request.path}|${request.time}`).join('\n')
  useEffect(() => {
    const paths = [...new Set(key === '' ? [] : key.split('\n').map((frame) => frame.slice(0, frame.lastIndexOf('|'))))].join('\n')
    if (paths !== '' && cache.current.paths !== paths) cache.current = { paths, frames: new Map(), pending: new Set() }
    const entry = cache.current
    const wanted = key === '' ? [] : key.split('\n')
    const missing = wanted.filter((frame) => !entry.frames.has(frame) && !entry.pending.has(frame))
    missing.forEach((frame) => entry.pending.add(frame))
    let current = true
    const next = async () => {
      for (const frame of missing) {
        if (!current) return
        const split = frame.lastIndexOf('|')
        const src = await window.api.thumbnail(frame.slice(0, split), Number(frame.slice(split + 1))).catch(() => null)
        entry.pending.delete(frame)
        if (src) entry.frames.set(frame, src)
        setShown(new Map(entry.frames))
      }
    }
    void next()
    return () => {
      current = false
      missing.forEach((frame) => entry.frames.has(frame) || entry.pending.delete(frame))
    }
  }, [key])

  return shown
}
