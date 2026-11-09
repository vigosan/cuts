import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import { ActionSheetIOS } from 'react-native'
import * as Haptics from 'expo-haptics'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { loadPreferences, savePreferences } from '../editor/preferences'
import { loadSession } from '../editor/sessions'
import { t } from '../i18n'
import { CutHarness, pressHeaderButton, pressMenuAction } from '../test-utils/CutHarness'

const native = jest.mocked(CutsMedia)
const player = jest.requireMock('expo-video').__player as { currentTime: number }
const asset = { id: 'A1', name: 'set.mov', duration: 20, width: 1920, height: 1080, frameRate: 25, uri: 'file:///set.mov' }

const beatPeaks = () => {
  const peaks = Array.from({ length: 20 * 50 }, () => 0.1)
  for (let i = 0; i < peaks.length; i += 25) peaks[i] = 1
  return peaks
}

const renderCut = async (store = memoryStore()) => {
  await render(<CutHarness asset={asset} store={store} />)
  await act(async () => {})
  return store
}

beforeEach(() => {
  jest.clearAllMocks()
  player.currentTime = 0
  native.readPeaks.mockResolvedValue(beatPeaks())
})

const mark = async (from: number, to: number) => {
  player.currentTime = from
  await fireEvent.press(screen.getByTestId('start-here'))
  player.currentTime = to
  await fireEvent.press(screen.getByTestId('end-here'))
}

it('Start here and End here mark a clip at the beat when the magnet is on', async () => {
  jest.useFakeTimers()
  const store = await renderCut()
  await mark(10.1, 14.9)
  await act(async () => jest.advanceTimersByTime(300))
  expect(loadSession(store, 'A1')?.clips).toEqual([expect.objectContaining({ start: 10, end: 15 })])
  jest.useRealTimers()
})

it('with the magnet off the clip starts exactly at the playhead', async () => {
  jest.useFakeTimers()
  const store = await renderCut()
  await fireEvent.press(screen.getByTestId('magnet'))
  await mark(10.1, 14.9)
  await act(async () => jest.advanceTimersByTime(300))
  expect(loadSession(store, 'A1')?.clips).toEqual([expect.objectContaining({ start: 10.1, end: 14.9 })])
  jest.useRealTimers()
})

it('frame step moves one frame at the video frame rate', async () => {
  await renderCut()
  player.currentTime = 2
  await fireEvent.press(screen.getByTestId('next-frame'))
  expect(player.currentTime).toBeCloseTo(2.04)
  await fireEvent.press(screen.getByTestId('previous-frame'))
  expect(player.currentTime).toBeCloseTo(2)
})

it('undo button reverts the last clip change', async () => {
  await renderCut()
  await mark(2, 6)
  expect(screen.getByText(t.exportClips(1))).toBeTruthy()
  await pressHeaderButton('undo')
  expect(screen.getByText(t.exportClips(0))).toBeTruthy()
})

it('the session is saved and comes back on reopen', async () => {
  jest.useFakeTimers()
  const store = await renderCut()
  await mark(2, 6)
  await act(async () => jest.advanceTimersByTime(300))
  await cleanup()
  await renderCut(store)
  expect(screen.getAllByText(t.exportClips(1))).toHaveLength(1)
  jest.useRealTimers()
})

it('Save frame saves the current frame with the clip framing', async () => {
  await renderCut()
  player.currentTime = 7
  await pressMenuAction(t.mobile.saveFrame)
  expect(native.saveFrame).toHaveBeenCalledWith('A1', 7, { format: 'original', framing: 'crop', cropX: 0.5, cropY: 0.5 })
  expect(await screen.findByText(t.mobile.frameSaved)).toBeTruthy()
})

it('marks clips without the web crypto global, which Hermes lacks', async () => {
  const webCrypto = globalThis.crypto
  Object.defineProperty(globalThis, 'crypto', { value: undefined, configurable: true })
  try {
    await renderCut()
    await mark(2, 6)
    expect(screen.getByText(t.exportClips(1))).toBeTruthy()
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: webCrypto, configurable: true })
  }
})

it('marking Start and End gives a light tap you can feel', async () => {
  await renderCut()
  await mark(2, 6)
  expect(Haptics.impactAsync).toHaveBeenCalledTimes(2)
})

it('marking past the end of the audio cuts exactly instead of failing', async () => {
  jest.useFakeTimers()
  native.readPeaks.mockResolvedValue(beatPeaks().slice(0, 10 * 50))
  const store = await renderCut()
  await mark(12.3, 15.6)
  await act(async () => jest.advanceTimersByTime(300))
  expect(loadSession(store, 'A1')?.clips).toEqual([expect.objectContaining({ start: 12.3, end: 15.6 })])
  jest.useRealTimers()
})

it('the beat magnet says what it is, not just a metronome icon', async () => {
  await renderCut()
  expect(screen.getByText(t.mobile.beat)).toBeTruthy()
})

it('holding the next-frame button keeps stepping until you let go', async () => {
  jest.useFakeTimers()
  await renderCut()
  player.currentTime = 2
  await fireEvent(screen.getByTestId('next-frame'), 'longPress')
  await act(async () => jest.advanceTimersByTime(500))
  await fireEvent(screen.getByTestId('next-frame'), 'pressOut')
  const held = player.currentTime
  expect(held).toBeGreaterThan(2.04 * 2 - 2 + 0.04)
  await act(async () => jest.advanceTimersByTime(500))
  expect(player.currentTime).toBe(held)
  jest.useRealTimers()
})

it('the beat magnet shows it is on with the accent yellow, not the black of Play and Export', async () => {
  await renderCut()
  expect(screen.getByTestId('magnet')).toHaveStyle({ backgroundColor: '#fde047' })
  await fireEvent.press(screen.getByTestId('magnet'))
  expect(screen.getByTestId('magnet')).toHaveStyle({ backgroundColor: '#e8e7e3' })
})

const recording = { id: 'file:set.wav', name: 'set.wav', duration: 20, width: 0, height: 0, frameRate: 30, uri: 'file:///set.wav', kind: 'audio' as const }
const loop = { path: 'background-1.mp4', kind: 'video' as const, name: 'loop.mp4', width: 1920, height: 1080 }

const renderRecording = async (store = memoryStore()) => {
  await render(<CutHarness asset={recording} store={store} />)
  await act(async () => {})
  await fireEvent(screen.getByTestId('stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 384, height: 216 } } })
  return store
}

describe('an audio recording', () => {
  it('Add a background on the stage offers Files and Photos and keeps the pick for the next recording', async () => {
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(2))
    native.pickBackground.mockResolvedValueOnce(loop)
    const store = await renderRecording()
    await fireEvent.press(screen.getByTestId('background-empty'))
    expect(sheet.mock.calls[0][0].options).toEqual([t.cancel, t.mobile.overlayFromFiles, t.mobile.overlayFromPhotos])
    expect(native.pickBackground).toHaveBeenCalledWith('photos')
    expect(await screen.findByTestId('background-video')).toBeTruthy()
    expect(loadPreferences(store).background).toEqual(loop)
    sheet.mockRestore()
  })

  it('a file that is too big says so instead of silently doing nothing', async () => {
    const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(1))
    native.pickBackground.mockResolvedValueOnce('too-big')
    await renderRecording()
    await fireEvent.press(screen.getByTestId('background-empty'))
    expect(await screen.findByText(t.backgroundTooBig)).toBeTruthy()
    sheet.mockRestore()
  })

  it('a background that is gone brings back Add a background, so the recording can still be finished', async () => {
    const store = memoryStore()
    savePreferences(store, { background: { ...loop, path: 'background-1.jpg', kind: 'image' } })
    await renderRecording(store)
    await fireEvent(screen.getByTestId('background-image'), 'error')
    expect(screen.getByTestId('background-empty')).toBeTruthy()
    expect(loadPreferences(store).background).toBeNull()
  })

  it('the filmstrip asks for no thumbnails, since a recording has no picture', async () => {
    await renderRecording()
    await fireEvent(screen.getByTestId('timeline'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 360, height: 72 } } })
    await act(async () => {})
    expect(native.thumbnail).not.toHaveBeenCalled()
  })

  it('the ··· menu has no Save frame, since there is no picture to save', async () => {
    await renderRecording()
    await expect(pressMenuAction(t.mobile.saveFrame)).rejects.toThrow('no menu action')
  })
})
