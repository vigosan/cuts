import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { createGestureController, fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import type { Framing } from '@cuts/core/framing'
import { moveOverlay, overlayBox, previewFrame, scaleOverlay } from '@cuts/core/overlay'
import { Stage } from './Stage'

const asset = { id: 'A1', name: 'set.mov', duration: 600, width: 1920, height: 1080, frameRate: 25, uri: 'file:///set.mov' }
const container = { width: 384, height: 216 }
const overlay = { path: 'file:///overlays/overlay-1.png', aspect: 0.5, name: 'logo.png', x: 0.1, y: 0.1, width: 0.25 }

const renderStage = async (format: OutputFormat, framing: Framing, stored = overlay, onOverlay = jest.fn(), onOverlayMissing = jest.fn()) => {
  await render(
    <GestureHandlerRootView>
      <Stage
        player={{} as never}
        asset={asset}
        format={format}
        settings={{ ...DEFAULT_SETTINGS, framing, cropX: 0.3 }}
        currentTime={0}
        onCrop={jest.fn()}
        overlay={stored}
        onOverlay={onOverlay}
        onOverlayMissing={onOverlayMissing}
      />
    </GestureHandlerRootView>
  )
  await fireEvent(screen.getByTestId('stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...container } } })
  return { onOverlay, onOverlayMissing }
}

const expectedBox = (format: OutputFormat, framing: Framing) => {
  const target = formatSize(format) ?? null
  const box = overlayBox(previewFrame(container, asset, target, framing, { cropX: 0.3, cropY: 0.5 }), overlay, overlay.aspect)
  return { left: box.left, top: box.top, width: box.width, height: box.height }
}

it.each([
  ['original', 'crop'],
  ['4:5', 'crop'],
  ['4:5', 'fit']
] as const)('in %s with %s the overlay sits where the export will put it', async (format, framing) => {
  await renderStage(format, framing)
  expect(screen.getByTestId('overlay')).toHaveStyle(expectedBox(format, framing))
})

it('a format the stored placement no longer fits in draws it clamped, without rewriting it', async () => {
  const { onOverlay } = await renderStage('4:5', 'crop', { ...overlay, x: 0.9 })
  const frame = previewFrame(container, asset, formatSize('4:5')!, 'crop', { cropX: 0.3, cropY: 0.5 })
  expect(screen.getByTestId('overlay')).toHaveStyle({ left: frame.left + 0.75 * frame.width })
  expect(onOverlay).not.toHaveBeenCalled()
})

it('a PNG that cannot be loaded any more clears the overlay, like the Mac', async () => {
  const { onOverlayMissing } = await renderStage('original', 'crop')
  await fireEvent(screen.getByTestId('overlay-image'), 'error')
  expect(onOverlayMissing).toHaveBeenCalled()
})

it('dragging with one finger moves the overlay by the same share of the frame, snapping like the Mac', async () => {
  const { onOverlay } = await renderStage('original', 'crop')
  await act(async () =>
    fireGestureHandler(getByGestureTestId('overlay-pan'), [
      { state: State.BEGAN, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 0, translationY: 0 },
      { state: State.ACTIVE, translationX: 38.4, translationY: 21.6 }
    ])
  )
  expect(onOverlay).toHaveBeenLastCalledWith(moveOverlay(overlay, 0.1, 0.1, overlay.aspect, asset).placement)
})

it('a snap shows its guide line while dragging, and the line goes when the finger lifts', async () => {
  await renderStage('original', 'crop')
  const toCentre = (0.5 - overlay.width / 2 - overlay.x) * container.width
  const pan = createGestureController('overlay-pan')
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 })
    pan.activate({ translationX: 0, translationY: 0 })
    pan.update({ translationX: toCentre, translationY: 0 })
  })
  expect(screen.getByTestId('overlay-guide-centerX')).toBeTruthy()
  await act(async () => pan.end({ translationX: toCentre, translationY: 0 }))
  expect(screen.queryByTestId('overlay-guide-centerX')).toBeNull()
})

it('moving and pinching at once keeps both, so a two-finger gesture places and sizes it in one go', async () => {
  const { onOverlay } = await renderStage('original', 'crop')
  const pan = createGestureController('overlay-pan')
  const pinch = createGestureController('overlay-pinch')
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 })
    pan.activate({ translationX: 0, translationY: 0 })
    pinch.begin({ scale: 1 })
    pinch.activate({ scale: 1 })
    pan.update({ translationX: 38.4, translationY: 21.6 })
    pinch.update({ scale: 1.5 })
  })
  const moved = moveOverlay(overlay, 0.1, 0.1, overlay.aspect, asset).placement
  expect(onOverlay).toHaveBeenLastCalledWith(scaleOverlay(moved, 1.5, overlay.aspect, asset))
})

it('pinching resizes it around its centre, keeping the PNG aspect ratio', async () => {
  const { onOverlay } = await renderStage('original', 'crop')
  await act(async () =>
    fireGestureHandler(getByGestureTestId('overlay-pinch'), [
      { state: State.BEGAN, scale: 1 },
      { state: State.ACTIVE, scale: 1 },
      { state: State.ACTIVE, scale: 2 }
    ])
  )
  expect(onOverlay).toHaveBeenLastCalledWith(scaleOverlay(overlay, 2, overlay.aspect, asset))
})

it('a stored bare file name is drawn from the current overlays folder', async () => {
  await renderStage('original', 'crop', { ...overlay, path: 'overlay-1.png' })
  expect(screen.getByTestId('overlay-image').props.source).toEqual({ uri: 'file:///app-support/overlays/overlay-1.png' })
})
