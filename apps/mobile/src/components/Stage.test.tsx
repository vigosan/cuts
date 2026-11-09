import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { createGestureController, fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import type { Framing } from '@cuts/core/framing'
import { moveOverlay, outputFrame, overlayBox, previewFrame, scaleOverlay } from '@cuts/core/overlay'
import { BAR_ASPECT, DEFAULT_EXTRAS, WAVE_ASPECT, defaultBarPlacement, defaultWavePlacement, type AudioExtras } from '@cuts/core/audio-layers'
import type { Background } from '../media'
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
        source={asset}
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

it('a second pinch while still dragging carries on from the size the first one left, so the logo does not jump', async () => {
  const { onOverlay } = await renderStage('original', 'crop')
  const pan = createGestureController('overlay-pan')
  const pinch = createGestureController('overlay-pinch')
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 })
    pan.activate({ translationX: 0, translationY: 0 })
    pan.update({ translationX: 38.4, translationY: 21.6 })
    pinch.begin({ scale: 1 })
    pinch.activate({ scale: 1 })
    pinch.update({ scale: 1.5 })
    pinch.end({ scale: 1.5 })
    pinch.begin({ scale: 1 })
    pinch.activate({ scale: 1 })
    pinch.update({ scale: 1 })
  })
  const moved = moveOverlay(overlay, 0.1, 0.1, overlay.aspect, asset).placement
  expect(onOverlay).toHaveBeenLastCalledWith(scaleOverlay(moved, 1.5, overlay.aspect, asset))
})

it('the pinch listens on the whole stage, since a logo a few points wide is too small to pinch on', async () => {
  await renderStage('9:16', 'crop')
  const pinch = getByGestureTestId('overlay-pinch') as unknown as { handlerTag: number }
  expect(screen.getByTestId('stage').parent?.props.handlerTags).toContain(pinch.handlerTag)
})

it('the one-finger drag reaches past the edges of the logo, so a tiny logo can still be grabbed', async () => {
  await renderStage('9:16', 'crop')
  const pan = getByGestureTestId('overlay-pan') as unknown as { config: { hitSlop?: number } }
  expect(pan.config.hitSlop).toBeGreaterThanOrEqual(16)
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

it('a snap the frame edge pushed the PNG off shows no guide, the same as the Mac', async () => {
  await renderStage('original', 'crop', { ...overlay, aspect: 0.56, x: 0, y: 0, width: 1 })
  const pan = createGestureController('overlay-pan')
  await act(async () => {
    pan.begin({ translationX: 0, translationY: 0 })
    pan.activate({ translationX: 0, translationY: 0 })
    pan.update({ translationX: 0, translationY: -10.8 })
  })
  expect(screen.queryByTestId('overlay-guide-bottom')).toBeNull()
  expect(screen.getByTestId('overlay-guide-centerX')).toBeTruthy()
})

const recording = { ...asset, id: 'file:set.wav', name: 'set.wav', width: 0, height: 0, kind: 'audio' as const }
const loop = { path: 'background-1.mp4', kind: 'video' as const, name: 'loop.mp4', width: 1920, height: 1080 }
const still = { ...loop, path: 'background-2.jpg', kind: 'image' as const, name: 'cover.jpg' }
const source = { width: 1920, height: 1080 }

type AudioOptions = { background?: Background | null; extras?: AudioExtras; withOverlay?: boolean; currentTime?: number }

const renderAudio = async ({ background = loop, extras = DEFAULT_EXTRAS, withOverlay = false, currentTime = 0 }: AudioOptions = {}) => {
  const handlers = { onExtras: jest.fn(), onOverlay: jest.fn(), onAddBackground: jest.fn(), onBackgroundMissing: jest.fn() }
  await render(
    <GestureHandlerRootView>
      <Stage
        player={{} as never}
        asset={recording}
        format="original"
        settings={DEFAULT_SETTINGS}
        currentTime={currentTime}
        onCrop={jest.fn()}
        source={source}
        overlay={withOverlay ? overlay : null}
        onOverlay={handlers.onOverlay}
        onOverlayMissing={jest.fn()}
        background={background}
        extras={extras}
        onExtras={handlers.onExtras}
        onAddBackground={handlers.onAddBackground}
        onBackgroundMissing={handlers.onBackgroundMissing}
      />
    </GestureHandlerRootView>
  )
  await fireEvent(screen.getByTestId('stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, ...container } } })
  return handlers
}

const audioFrame = () => previewFrame(container, source, null, 'crop', DEFAULT_SETTINGS)

describe('an audio recording', () => {
  it('without a background asks for one right on the stage, since there is no picture to show yet', async () => {
    const { onAddBackground } = await renderAudio({ background: null })
    await fireEvent.press(screen.getByTestId('background-empty'))
    expect(onAddBackground).toHaveBeenCalled()
  })

  it('shows a looping video background, or a still image', async () => {
    await renderAudio()
    expect(screen.getByTestId('background-video')).toBeTruthy()
    await renderAudio({ background: still })
    expect(screen.getByTestId('background-image').props.source).toEqual({ uri: 'file:///app-support/backgrounds/background-2.jpg' })
  })

  it('a background image that is gone clears the background, so the stage asks for a new one instead of staying black', async () => {
    const { onBackgroundMissing } = await renderAudio({ background: still })
    await fireEvent(screen.getByTestId('background-image'), 'error')
    expect(onBackgroundMissing).toHaveBeenCalled()
  })

  it('a background video that cannot play any more clears the background too', async () => {
    const { __player } = jest.requireMock('expo-video') as { __player: { addListener: jest.Mock } }
    const { onBackgroundMissing } = await renderAudio()
    const listener = __player.addListener.mock.calls.filter(([name]) => name === 'statusChange').at(-1)?.[1]
    await act(async () => listener({ status: 'error' }))
    expect(onBackgroundMissing).toHaveBeenCalled()
  })

  it('a waveform never placed sits where the export puts it', async () => {
    await renderAudio({ extras: { ...DEFAULT_EXTRAS, waveform: true } })
    const box = overlayBox(audioFrame(), defaultWavePlacement(outputFrame('original', source)), WAVE_ASPECT)
    expect(screen.getByTestId('wave')).toHaveStyle({ left: box.left, top: box.top, width: box.width, height: box.height })
  })

  it('dragging the waveform moves it by the same share of the frame', async () => {
    const { onExtras } = await renderAudio({ extras: { ...DEFAULT_EXTRAS, waveform: true } })
    await act(async () =>
      fireGestureHandler(getByGestureTestId('wave-pan'), [
        { state: State.BEGAN, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 0, translationY: 0 },
        { state: State.ACTIVE, translationX: 0, translationY: -21.6 }
      ])
    )
    const start = defaultWavePlacement(source)
    expect(onExtras).toHaveBeenLastCalledWith({ ...DEFAULT_EXTRAS, waveform: true, wave: moveOverlay(start, 0, -0.1, WAVE_ASPECT, source).placement })
  })

  it('after touching the waveform a pinch sizes only the waveform, never the logo beside it', async () => {
    const { onExtras, onOverlay } = await renderAudio({ extras: { ...DEFAULT_EXTRAS, waveform: true }, withOverlay: true })
    const pan = createGestureController('wave-pan')
    const pinch = createGestureController('overlay-pinch')
    await act(async () => {
      pan.begin({ translationX: 0, translationY: 0 })
      pan.end({ translationX: 0, translationY: 0 })
      pinch.begin({ scale: 1 })
      pinch.activate({ scale: 1 })
      pinch.update({ scale: 0.5 })
    })
    expect(onOverlay).not.toHaveBeenCalled()
    expect(onExtras).toHaveBeenLastCalledWith({ ...DEFAULT_EXTRAS, waveform: true, wave: scaleOverlay(defaultWavePlacement(source), 0.5, WAVE_ASPECT, source) })
  })

  it('the progress bar fills as far as the recording has played', async () => {
    await renderAudio({ extras: { ...DEFAULT_EXTRAS, progressBar: true }, currentTime: 150 })
    const box = overlayBox(audioFrame(), defaultBarPlacement(source), BAR_ASPECT)
    expect(screen.getByTestId('bar')).toHaveStyle({ left: box.left, width: box.width })
    expect(screen.getByTestId('bar-fill')).toHaveStyle({ width: '25%' })
  })
})
