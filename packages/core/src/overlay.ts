import { cropBox, videoBox, type Box } from './crop'
import { formatSize, type OutputFormat } from './formats'
import type { Framing } from './framing'

export type OverlayPlacement = { x: number; y: number; width: number }
export type Overlay = OverlayPlacement & { path: string; aspect: number; name: string }
export type ExportOverlay = OverlayPlacement & { path: string }
export type Size = { width: number; height: number }
export type Guide = 'centerX' | 'centerY' | 'left' | 'right' | 'top' | 'bottom'
export type Corner = 'tl' | 'tr' | 'bl' | 'br'

export const OVERLAY_DEFAULT_WIDTH = 0.25
export const OVERLAY_MIN_WIDTH = 0.05
export const OVERLAY_MAX_WIDTH = 1
export const OVERLAY_MARGIN = 0.04
export const OVERLAY_SNAP = 0.02

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function outputFrame(format: OutputFormat, video: Size): Size {
  return formatSize(format) ?? video
}

export function overlayHeight(p: OverlayPlacement, aspect: number, frame: Size): number {
  return (p.width * aspect * frame.width) / frame.height
}

function clampWidth(width: number, aspect: number, frame: Size): number {
  const tallest = frame.height / (aspect * frame.width)
  return Math.min(Math.max(width, OVERLAY_MIN_WIDTH), OVERLAY_MAX_WIDTH, tallest)
}

export function clampPlacement(p: OverlayPlacement, aspect: number, frame: Size): OverlayPlacement {
  const width = clampWidth(p.width, aspect, frame)
  const height = overlayHeight({ ...p, width }, aspect, frame)
  return {
    x: clamp(p.x, 0, 1 - width),
    y: clamp(p.y, 0, 1 - height),
    width
  }
}

export function defaultPlacement(aspect: number, frame: Size): OverlayPlacement {
  return clampPlacement(
    { x: OVERLAY_MARGIN, y: (OVERLAY_MARGIN * frame.width) / frame.height, width: OVERLAY_DEFAULT_WIDTH },
    aspect,
    frame
  )
}

type Target = { value: number; guide: Guide; edge: 0 | 0.5 | 1 }

function snapAxis(position: number, size: number, targets: Target[], pixels: number, threshold: number) {
  let best: { position: number; guide: Guide; distance: number } | null = null
  for (const target of targets) {
    const offset = size * target.edge
    const distance = Math.abs(position + offset - target.value) * pixels
    if (distance <= threshold && (!best || distance < best.distance)) {
      best = { position: target.value - offset, guide: target.guide, distance }
    }
  }
  return best
}

export function moveOverlay(
  start: OverlayPlacement,
  dx: number,
  dy: number,
  aspect: number,
  frame: Size
): { placement: OverlayPlacement; guides: Guide[] } {
  const height = overlayHeight(start, aspect, frame)
  const marginY = (OVERLAY_MARGIN * frame.width) / frame.height
  const threshold = OVERLAY_SNAP * frame.width
  const snappedX = snapAxis(
    start.x + dx,
    start.width,
    [
      { value: OVERLAY_MARGIN, guide: 'left', edge: 0 },
      { value: 0.5, guide: 'centerX', edge: 0.5 },
      { value: 1 - OVERLAY_MARGIN, guide: 'right', edge: 1 }
    ],
    frame.width,
    threshold
  )
  const snappedY = snapAxis(
    start.y + dy,
    height,
    [
      { value: marginY, guide: 'top', edge: 0 },
      { value: 0.5, guide: 'centerY', edge: 0.5 },
      { value: 1 - marginY, guide: 'bottom', edge: 1 }
    ],
    frame.height,
    threshold
  )
  const placement = clampPlacement(
    { x: snappedX?.position ?? start.x + dx, y: snappedY?.position ?? start.y + dy, width: start.width },
    aspect,
    frame
  )
  const guides: Guide[] = []
  if (snappedX) guides.push(snappedX.guide)
  if (snappedY) guides.push(snappedY.guide)
  return { placement, guides }
}

const GUIDE_TOLERANCE = 1e-6

function guideHolds(guide: Guide, p: OverlayPlacement, aspect: number, frame: Size): boolean {
  const height = overlayHeight(p, aspect, frame)
  const marginY = (OVERLAY_MARGIN * frame.width) / frame.height
  const near = (a: number, b: number) => Math.abs(a - b) < GUIDE_TOLERANCE
  switch (guide) {
    case 'centerX':
      return near(p.x + p.width / 2, 0.5)
    case 'centerY':
      return near(p.y + height / 2, 0.5)
    case 'left':
      return near(p.x, OVERLAY_MARGIN)
    case 'right':
      return near(p.x + p.width, 1 - OVERLAY_MARGIN)
    case 'top':
      return near(p.y, marginY)
    case 'bottom':
      return near(p.y + height, 1 - marginY)
  }
}

export function heldGuides(placement: OverlayPlacement, guides: Guide[], aspect: number, frame: Size): Guide[] {
  return guides.filter((guide) => guideHolds(guide, placement, aspect, frame))
}

export function resizeOverlay(
  start: OverlayPlacement,
  corner: Corner,
  dx: number,
  aspect: number,
  frame: Size
): OverlayPlacement {
  const left = corner === 'tl' || corner === 'bl'
  const top = corner === 'tl' || corner === 'tr'
  const right = start.x + start.width
  const bottom = start.y + overlayHeight(start, aspect, frame)
  const ratio = (aspect * frame.width) / frame.height
  const roomX = left ? right : 1 - start.x
  const roomY = top ? bottom : 1 - start.y
  const room = Math.min(roomX, roomY / ratio)
  const wanted = start.width + (left ? -dx : dx)
  const width = clamp(clampWidth(wanted, aspect, frame), 0, Math.max(room, OVERLAY_MIN_WIDTH))
  const height = width * ratio
  return {
    x: left ? right - width : start.x,
    y: top ? bottom - height : start.y,
    width
  }
}

export function scaleOverlay(start: OverlayPlacement, scale: number, aspect: number, frame: Size): OverlayPlacement {
  const centerX = start.x + start.width / 2
  const centerY = start.y + overlayHeight(start, aspect, frame) / 2
  const width = clampWidth(start.width * scale, aspect, frame)
  const height = overlayHeight({ ...start, width }, aspect, frame)
  return clampPlacement({ x: centerX - width / 2, y: centerY - height / 2, width }, aspect, frame)
}

export function previewFrame(
  container: Size,
  video: Size,
  target: Size | null,
  framing: Framing,
  zone: { cropX: number; cropY: number }
): Box {
  if (!target) return videoBox(container.width, container.height, video.width, video.height)
  if (framing === 'fit') return videoBox(container.width, container.height, target.width, target.height)
  return cropBox(
    videoBox(container.width, container.height, video.width, video.height),
    target.width,
    target.height,
    zone.cropX,
    zone.cropY
  )
}

export function overlayBox(frameBox: Box, p: OverlayPlacement, aspect: number): Box {
  const width = p.width * frameBox.width
  return {
    left: frameBox.left + p.x * frameBox.width,
    top: frameBox.top + p.y * frameBox.height,
    width,
    height: width * aspect
  }
}
