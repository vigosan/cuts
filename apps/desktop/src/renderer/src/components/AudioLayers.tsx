import { useEffect, useRef, type RefObject } from 'react'
import { LIVE_WAVE_CHUNK_SECONDS, LIVE_WAVE_FRAMES_PER_SECOND, waveColumns } from '@shared/live-wave'

const EDGE_FADE = 0.22

type WaveProps = { color: string; opacity: number; path: string | null; video: RefObject<HTMLVideoElement | null> }

export function WavePreview({ color, opacity, path, video }: WaveProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !path) return
    const chunks = new Map<number, Int16Array | null>()
    const load = (index: number) => {
      if (chunks.has(index)) return
      chunks.set(index, null)
      void window.api.waveChunk(path, index).then(
        (samples) => chunks.set(index, samples),
        () => {}
      )
    }
    let frame = requestAnimationFrame(function draw() {
      frame = requestAnimationFrame(draw)
      const width = Math.round(canvas.clientWidth * devicePixelRatio)
      const height = Math.round(canvas.clientHeight * devicePixelRatio)
      if (width === 0 || height === 0) return
      if (canvas.width !== width) canvas.width = width
      if (canvas.height !== height) canvas.height = height
      const time = Math.floor((video.current?.currentTime ?? 0) * LIVE_WAVE_FRAMES_PER_SECOND) / LIVE_WAVE_FRAMES_PER_SECOND
      const index = Math.floor(time / LIVE_WAVE_CHUNK_SECONDS)
      load(index)
      load(index + 1)
      const samples = chunks.get(index)
      const columns = samples ? waveColumns(samples, time - index * LIVE_WAVE_CHUNK_SECONDS, width) : new Float32Array(width)
      context.clearRect(0, 0, width, height)
      context.fillStyle = color
      for (let x = 0; x < width; x++) {
        const bar = Math.max(1, columns[x] * height)
        context.globalAlpha = opacity * Math.min(1, Math.min(x, width - x) / (EDGE_FADE * width))
        context.fillRect(x, (height - bar) / 2, 1, bar)
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [color, opacity, path, video])

  return <canvas ref={canvasRef} aria-hidden className="size-full select-none" />
}

export function BarPreview({ color, opacity, progress }: { color: string; opacity: number; progress: number }) {
  return (
    <div className="relative size-full select-none">
      <div className="absolute -inset-y-2 inset-x-0" />
      <div className="absolute inset-0 opacity-15" style={{ backgroundColor: color }} />
      <div data-testid="bar-fill" className="relative h-full" style={{ width: `${progress * 100}%`, backgroundColor: color, opacity }} />
    </div>
  )
}
