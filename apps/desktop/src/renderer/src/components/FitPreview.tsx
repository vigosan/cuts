import { useEffect, useRef, type RefObject } from 'react'
import { videoBox } from '@cuts/core/crop'

const BACKDROP_PX = 96
const BLUR_RATIO = 0.04
const BACKDROP_DIM = 0.3

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>
  targetWidth: number
  targetHeight: number
}

export function FitPreview({ videoRef, targetWidth, targetHeight }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current!
    const context = canvas.getContext('2d')
    const backdrop = document.createElement('canvas')
    backdrop.width = BACKDROP_PX
    backdrop.height = Math.round((BACKDROP_PX * targetHeight) / targetWidth)
    const backdropContext = backdrop.getContext('2d')
    if (!context || !backdropContext) return
    let frame = 0
    const draw = () => {
      frame = requestAnimationFrame(draw)
      const video = videoRef.current
      if (!video || video.videoWidth === 0) return
      const scale = window.devicePixelRatio || 1
      const width = Math.round(canvas.clientWidth * scale)
      const height = Math.round(canvas.clientHeight * scale)
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }
      const out = videoBox(width, height, targetWidth, targetHeight)
      const cover = Math.max(backdrop.width / video.videoWidth, backdrop.height / video.videoHeight)
      const coverWidth = video.videoWidth * cover
      const coverHeight = video.videoHeight * cover
      backdropContext.drawImage(video, (backdrop.width - coverWidth) / 2, (backdrop.height - coverHeight) / 2, coverWidth, coverHeight)
      context.clearRect(0, 0, width, height)
      const blur = out.width * BLUR_RATIO
      context.save()
      context.beginPath()
      context.rect(out.left, out.top, out.width, out.height)
      context.clip()
      context.filter = `blur(${blur}px)`
      context.drawImage(backdrop, out.left - blur * 2, out.top - blur * 2, out.width + blur * 4, out.height + blur * 4)
      context.restore()
      context.fillStyle = `rgb(0 0 0 / ${BACKDROP_DIM})`
      context.fillRect(out.left, out.top, out.width, out.height)
      const inner = videoBox(out.width, out.height, video.videoWidth, video.videoHeight)
      context.drawImage(video, out.left + inner.left, out.top + inner.top, inner.width, inner.height)
    }
    draw()
    return () => cancelAnimationFrame(frame)
  }, [videoRef, targetWidth, targetHeight])

  return <canvas ref={canvasRef} data-testid="fit-preview" className="pointer-events-none absolute inset-0 h-full w-full" />
}
