import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import type { Box } from '@cuts/core/crop'
import type { Framing } from '@cuts/core/framing'
import {
  clampPlacement,
  heldGuides,
  moveOverlay,
  OVERLAY_MARGIN,
  overlayBox,
  previewFrame,
  resizeOverlay,
  type Corner,
  type Guide,
  type OverlayPlacement,
  type Size
} from '@cuts/core/overlay'

type Props = {
  video: Size
  target: Size | null
  framing: Framing
  zone: { cropX: number; cropY: number }
  placement: OverlayPlacement
  aspect: number
  testId: string
  onChange: (placement: OverlayPlacement) => void
  children: ReactNode
}

const CORNERS: Corner[] = ['tl', 'tr', 'bl', 'br']
const CORNER_STYLE: Record<Corner, string> = {
  tl: '-left-1.5 -top-1.5 cursor-nwse-resize',
  tr: '-right-1.5 -top-1.5 cursor-nesw-resize',
  bl: '-bottom-1.5 -left-1.5 cursor-nesw-resize',
  br: '-bottom-1.5 -right-1.5 cursor-nwse-resize'
}

function guideStyle(guide: Guide, frame: Box) {
  const margin = OVERLAY_MARGIN * frame.width
  switch (guide) {
    case 'centerX':
      return { left: frame.left + frame.width / 2, top: frame.top, width: 1, height: frame.height }
    case 'centerY':
      return { left: frame.left, top: frame.top + frame.height / 2, width: frame.width, height: 1 }
    case 'left':
      return { left: frame.left + margin, top: frame.top, width: 1, height: frame.height }
    case 'right':
      return { left: frame.left + frame.width - margin, top: frame.top, width: 1, height: frame.height }
    case 'top':
      return { left: frame.left, top: frame.top + margin, width: frame.width, height: 1 }
    case 'bottom':
      return { left: frame.left, top: frame.top + frame.height - margin, width: frame.width, height: 1 }
  }
}

export function OverlayLayer({ video, target, framing, zone, placement: wanted, aspect, testId, onChange, children }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [hovered, setHovered] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [guides, setGuides] = useState<Guide[]>([])

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) =>
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    )
    observer.observe(ref.current!)
    return () => observer.disconnect()
  }, [])

  const outputSize = target ?? video
  const frameBox = previewFrame(size, video, target, framing, zone)
  const placement = clampPlacement(wanted, aspect, outputSize)
  const box = overlayBox(frameBox, placement, aspect)

  const track = (e: ReactPointerEvent, update: (dx: number, dy: number) => void) => {
    e.preventDefault()
    e.stopPropagation()
    const origin = { x: e.clientX, y: e.clientY }
    setDragging(true)
    const onMove = (move: PointerEvent) =>
      update((move.clientX - origin.x) / frameBox.width, (move.clientY - origin.y) / frameBox.height)
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDragging(false)
      setGuides([])
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const startMove = (e: ReactPointerEvent) => {
    const start = placement
    track(e, (dx, dy) => {
      const moved = moveOverlay(start, dx, dy, aspect, outputSize)
      setGuides(heldGuides(moved.placement, moved.guides, aspect, outputSize))
      onChange(moved.placement)
    })
  }

  const startResize = (corner: Corner) => (e: ReactPointerEvent) => {
    const start = placement
    track(e, (dx) => onChange(resizeOverlay(start, corner, dx, aspect, outputSize)))
  }

  return (
    <div ref={ref} className="pointer-events-none absolute inset-0 overflow-hidden">
      {size.width > 0 && (
        <>
          {guides.map((guide) => (
            <div
              key={guide}
              data-testid={`${testId}-guide-${guide}`}
              className="absolute bg-accent"
              style={guideStyle(guide, frameBox)}
            />
          ))}
          <div
            data-testid={testId}
            className="pointer-events-auto absolute cursor-move touch-none"
            style={{ left: box.left, top: box.top, width: box.width, height: box.height }}
            onPointerDown={startMove}
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
            {(hovered || dragging) &&
              CORNERS.map((corner) => (
                <div
                  key={corner}
                  data-testid={`${testId}-handle-${corner}`}
                  className={`absolute size-3 rounded-full border border-black/40 bg-white ${CORNER_STYLE[corner]}`}
                  onPointerDown={startResize(corner)}
                />
              ))}
          </div>
        </>
      )}
    </div>
  )
}
