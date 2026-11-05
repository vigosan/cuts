import { describe, expect, it } from 'vitest'
import { cropBox, videoBox } from './crop'
import {
  clampPlacement,
  defaultPlacement,
  heldGuides,
  moveOverlay,
  outputFrame,
  overlayBox,
  overlayHeight,
  previewFrame,
  resizeOverlay,
  scaleOverlay
} from './overlay'

const portrait = { width: 1080, height: 1350 }
const square = { width: 1080, height: 1080 }

describe('outputFrame', () => {
  it('uses the video size when the format is original so the overlay maps onto what is exported', () => {
    expect(outputFrame('original', { width: 1920, height: 1080 })).toEqual({ width: 1920, height: 1080 })
    expect(outputFrame('4:5', { width: 1920, height: 1080 })).toEqual(portrait)
  })
})

describe('defaultPlacement', () => {
  it('sits at the same pixel margin from the left and the top so the corner looks even', () => {
    expect(defaultPlacement(0.5, portrait)).toEqual({ x: 0.04, y: 0.032, width: 0.25 })
  })
})

describe('clampPlacement', () => {
  it('keeps a logo at the bottom-right of 9:16 inside when switching to 1:1', () => {
    const placed = clampPlacement({ x: 0.7, y: 0.9, width: 0.25 }, 0.5, square)
    expect(placed.y + overlayHeight(placed, 0.5, square)).toBeLessThanOrEqual(1)
    expect(placed.x).toBe(0.7)
  })

  it('never lets a tall PNG grow taller than the frame', () => {
    const placed = clampPlacement({ x: 0, y: 0, width: 1 }, 3, { width: 1920, height: 1080 })
    expect(overlayHeight(placed, 3, { width: 1920, height: 1080 })).toBeCloseTo(1)
    expect(placed.width).toBeCloseTo(0.1875)
  })

  it('refuses a width below 5 % so the overlay stays grabbable', () => {
    expect(clampPlacement({ x: 0.1, y: 0.1, width: 0.01 }, 0.5, square).width).toBe(0.05)
  })
})

describe('moveOverlay', () => {
  const start = { x: 0.3, y: 0.3, width: 0.2 }

  it('snaps the centre onto the vertical centre line when 1 % away and reports the guide', () => {
    const { placement, guides } = moveOverlay(start, 0.11, 0, 0.5, square)
    expect(placement.x + placement.width / 2).toBeCloseTo(0.5)
    expect(guides).toContain('centerX')
  })

  it('leaves the position alone when 5 % away from any guide', () => {
    const { placement, guides } = moveOverlay(start, 0.15, 0, 0.5, square)
    expect(guides).toEqual([])
    expect(placement.x).toBeCloseTo(0.45)
  })

  it('snaps to the left margin', () => {
    const { placement, guides } = moveOverlay(start, -0.27, 0, 0.5, square)
    expect(placement.x).toBeCloseTo(0.04)
    expect(guides).toContain('left')
  })

  it('snaps to the top margin using the same pixel distance as the left one', () => {
    const { placement, guides } = moveOverlay(start, 0, -0.27, 0.5, portrait)
    expect(placement.y).toBeCloseTo(0.032)
    expect(guides).toContain('top')
  })

  it('never drags the overlay out of the frame', () => {
    const { placement } = moveOverlay(start, 2, 2, 0.5, square)
    expect(placement.x + placement.width).toBeLessThanOrEqual(1)
    expect(placement.y + overlayHeight(placement, 0.5, square)).toBeLessThanOrEqual(1)
  })
})

describe('resizeOverlay', () => {
  const start = { x: 0.2, y: 0.2, width: 0.3 }

  it('grows from the bottom-right corner keeping the top-left corner', () => {
    expect(resizeOverlay(start, 'br', 0.1, 0.5, square)).toEqual({ x: 0.2, y: 0.2, width: 0.4 })
  })

  it('keeps the bottom-right corner fixed when dragging the top-left one', () => {
    const resized = resizeOverlay(start, 'tl', -0.1, 0.5, square)
    expect(resized.width).toBeCloseTo(0.4)
    expect(resized.x + resized.width).toBeCloseTo(0.5)
    expect(resized.y + overlayHeight(resized, 0.5, square)).toBeCloseTo(0.2 + 0.15)
  })

  it('keeps the top-right corner fixed when dragging the bottom-left one', () => {
    const resized = resizeOverlay(start, 'bl', -0.1, 0.5, square)
    expect(resized.x + resized.width).toBeCloseTo(0.5)
    expect(resized.y).toBeCloseTo(0.2)
  })

  it('keeps the bottom-left corner fixed when dragging the top-right one', () => {
    const resized = resizeOverlay(start, 'tr', 0.1, 0.5, square)
    expect(resized.x).toBeCloseTo(0.2)
    expect(resized.y + overlayHeight(resized, 0.5, square)).toBeCloseTo(0.35)
  })

  it('stops at the frame edge instead of pushing the overlay out', () => {
    const resized = resizeOverlay(start, 'br', 5, 0.5, square)
    expect(resized.x + resized.width).toBeLessThanOrEqual(1)
  })
})

describe('scaleOverlay', () => {
  it('doubles the width around the same centre when pinching', () => {
    const start = { x: 0.4, y: 0.4, width: 0.1 }
    const scaled = scaleOverlay(start, 2, 0.5, square)
    expect(scaled.width).toBeCloseTo(0.2)
    expect(scaled.x + scaled.width / 2).toBeCloseTo(0.45)
    expect(scaled.y + overlayHeight(scaled, 0.5, square) / 2).toBeCloseTo(0.425)
  })

  it('clamps a pinch that would leave the frame', () => {
    const scaled = scaleOverlay({ x: 0.4, y: 0.4, width: 0.5 }, 10, 0.5, square)
    expect(scaled.width).toBe(1)
    expect(scaled.x).toBe(0)
  })
})

describe('previewFrame', () => {
  const container = { width: 800, height: 600 }
  const video = { width: 1920, height: 1080 }
  const target = { width: 1080, height: 1920 }
  const zone = { cropX: 0.2, cropY: 0.7 }

  it('is the drawn video when the format is original', () => {
    expect(previewFrame(container, video, null, 'crop', zone)).toEqual(
      videoBox(800, 600, 1920, 1080)
    )
  })

  it('is the crop window when the framing is crop', () => {
    expect(previewFrame(container, video, target, 'crop', zone)).toEqual(
      cropBox(videoBox(800, 600, 1920, 1080), 1080, 1920, 0.2, 0.7)
    )
  })

  it('is the whole target frame when the framing is fit', () => {
    expect(previewFrame(container, video, target, 'fit', zone)).toEqual(videoBox(800, 600, 1080, 1920))
  })
})

describe('overlayBox', () => {
  it('turns a placement into preview pixels that match the exported frame', () => {
    expect(overlayBox({ left: 0, top: 0, width: 1080, height: 1350 }, { x: 0.5, y: 0.1, width: 0.25 }, 0.5)).toEqual({
      left: 540,
      top: 135,
      width: 270,
      height: 135
    })
  })
})

describe('heldGuides', () => {
  it('keeps a guide the placement really sits on, so the line matches the PNG', () => {
    const { placement, guides } = moveOverlay({ x: 0.1, y: 0.1, width: 0.2 }, 0.29, 0, 1, square)
    expect(heldGuides(placement, guides, 1, square)).toEqual(['centerX'])
  })

  it('drops a guide that clamping pushed the PNG off, so no line shows where the PNG is not', () => {
    const tall = { x: 0.01, y: 0, width: 0.98 }
    const { placement, guides } = moveOverlay(tall, 0, -0.01, 1, square)
    expect(guides).toContain('bottom')
    expect(heldGuides(placement, guides, 1, square)).not.toContain('bottom')
  })

  it('checks the top and bottom margins in the frame height, since margins are a share of the width', () => {
    const marginY = (0.04 * 1080) / 1350
    expect(heldGuides({ x: 0.3, y: marginY, width: 0.2 }, ['top', 'left'], 1, portrait)).toEqual(['top'])
  })
})
