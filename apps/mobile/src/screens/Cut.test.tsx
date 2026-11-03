import { act, cleanup, fireEvent, render, screen } from '@testing-library/react-native'
import * as Haptics from 'expo-haptics'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
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
