import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { cropBox, dragCrop, videoBox } from '../framing'
import { t } from '../i18n'

type Zone = { cropX: number; cropY: number }

type Props = {
  videoWidth: number
  videoHeight: number
  targetWidth: number
  targetHeight: number
  zone: Zone
  onChange: (zone: Zone) => void
}

export function CropFrame({ videoWidth, videoHeight, targetWidth, targetHeight, zone, onChange }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    )
    observer.observe(ref.current!)
    return () => observer.disconnect()
  }, [])

  const box = videoBox(size.width, size.height, videoWidth, videoHeight)
  const crop = cropBox(box, targetWidth, targetHeight, zone.cropX, zone.cropY)

  const startDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const origin = { x: e.clientX, y: e.clientY }
    const start = zone
    const onMove = (move: PointerEvent) =>
      onChange(dragCrop(box, targetWidth, targetHeight, start, move.clientX - origin.x, move.clientY - origin.y))
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      {size.width > 0 && (
        <div
          data-testid="crop-frame"
          title={t.framingCropHint}
          className="pointer-events-auto absolute cursor-move touch-none rounded-sm border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.55)]"
          style={{ left: crop.left, top: crop.top, width: crop.width, height: crop.height }}
          onPointerDown={startDrag}
          onClick={(e) => e.stopPropagation()}
        />
      )}
    </div>
  )
}
