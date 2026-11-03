import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { ActionSheetIOS, AppState, Linking } from 'react-native'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import * as Haptics from 'expo-haptics'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { savePreferences } from '../editor/preferences'
import { loadSession, saveSession } from '../editor/sessions'
import { t } from '../i18n'
import { CutHarness } from '../test-utils/CutHarness'

const native = jest.mocked(CutsMedia)
const asset = { id: 'A1', name: 'set.mov', duration: 600, width: 1920, height: 1080, frameRate: 25, uri: 'file:///set.mov' }

const storeWith = (clips: { id: string; start: number; end: number }[], format: '4:5' | 'original' = 'original', framing: 'crop' | 'fit' = 'crop') => {
  const store = memoryStore()
  savePreferences(store, { format, settings: { ...DEFAULT_SETTINGS, framing } })
  saveSession(store, 'A1', { clips, clipSettings: {}, defaultSettings: { ...DEFAULT_SETTINGS, framing }, baseName: 'set' })
  return store
}

const renderCut = async (store: ReturnType<typeof memoryStore>) => {
  await render(<CutHarness asset={asset} store={store} />)
  await act(async () => {})
  await fireEvent(screen.getByTestId('stage'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 384, height: 216 } } })
}

const twoClips = [{ id: 'b', start: 100, end: 159 }, { id: 'a', start: 10, end: 69 }]

beforeEach(() => {
  jest.clearAllMocks()
  native.exportClip.mockImplementation(async (_id, job) => `file:///tmp/${job.fileName}`)
})

it('fit shows the whole video over a blurred copy', async () => {
  await renderCut(storeWith(twoClips, '4:5', 'fit'))
  expect(screen.getByTestId('fit-preview')).toBeTruthy()
  expect(screen.getByTestId('fit-backdrop').props.blurRadius).toBeGreaterThan(0)
})

it('dragging the crop frame changes only the selected clip', async () => {
  jest.useFakeTimers()
  const store = storeWith(twoClips, '4:5')
  await renderCut(store)
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent(screen.getByTestId('crop-frame'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
  await act(async () => jest.advanceTimersByTime(300))
  const session = loadSession(store, 'A1')!
  expect(session.clipSettings.a.cropX).toBeCloseTo(0.6)
  expect(session.clipSettings.b).toBeUndefined()
  jest.useRealTimers()
})

it('the clip sheet changes the fades of the selected clip', async () => {
  jest.useFakeTimers()
  const store = storeWith(twoClips)
  await renderCut(store)
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent.press(screen.getByTestId('clip-settings'))
  await fireEvent.press(screen.getByTestId('video-fade-white'))
  await fireEvent.press(screen.getByTestId('fade-seconds-2'))
  await act(async () => jest.advanceTimersByTime(300))
  expect(loadSession(store, 'A1')!.clipSettings.a).toMatchObject({ videoFade: 'white', fadeSeconds: 2 })
  jest.useRealTimers()
})

it('export saves clips to the Cuts album in carousel order', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  expect(native.exportClip.mock.calls.map(([, job]) => [job.start, job.videoFadeIn])).toEqual([[100, false], [10, true]])
  expect(native.saveToCutsAlbum).toHaveBeenCalledWith(['file:///tmp/set-1.mp4', 'file:///tmp/set-2.mp4'])
  expect(await screen.findByText(t.mobile.savedToAlbum(2))).toBeTruthy()
})

it('stopping keeps the finished clips and says how many', async () => {
  let fail: (error: Error) => void = () => {}
  native.exportClip.mockResolvedValueOnce('file:///tmp/set-1.mp4').mockImplementationOnce(() => new Promise((_, reject) => (fail = reject)))
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  await fireEvent.press(screen.getByTestId('stop-export'))
  expect(native.cancelExport).toHaveBeenCalled()
  await act(async () => fail(new Error('cancelled')))
  expect(native.saveToCutsAlbum).toHaveBeenCalledWith(['file:///tmp/set-1.mp4'])
  expect(await screen.findByText(t.exportCancelledKept(1))).toBeTruthy()
})

it('going to the background stops the export cleanly', async () => {
  let change: (state: string) => void = () => {}
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
    change = listener as typeof change
    return { remove: jest.fn() }
  })
  native.exportClip.mockImplementation(() => new Promise(() => {}))
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  await act(async () => change('background'))
  expect(native.cancelExport).toHaveBeenCalled()
})

it('when done, Open Instagram opens the Instagram app', async () => {
  jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true)
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  await fireEvent.press(await screen.findByTestId('open-instagram'))
  expect(open).toHaveBeenCalledWith('instagram://app')
})

it('if saving to Photos fails the sheet says so and can be closed', async () => {
  native.saveToCutsAlbum.mockRejectedValueOnce(new Error('album unavailable'))
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  expect(await screen.findByText('album unavailable')).toBeTruthy()
  await fireEvent.press(screen.getByTestId('close-sheet'))
  expect(screen.queryByTestId('start-export')).toBeNull()
})

it('a finished export confirms with the success haptic, a failed one with the error haptic', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
  await screen.findByText(t.mobile.savedToAlbum(2))
  expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success)
})

it('changing an option ticks like an iOS picker', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent.press(screen.getByTestId('clip-settings'))
  await fireEvent.press(screen.getByTestId('framing-fit'))
  expect(Haptics.selectionAsync).toHaveBeenCalled()
})

it('the clip sheet has the format, so framing shows its preview right away like on the Mac', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent.press(screen.getByTestId('clip-settings'))
  expect(screen.getByText(t.mobile.framingNeedsFormat)).toBeTruthy()
  expect(screen.queryByTestId('crop-frame')).toBeNull()
  await fireEvent.press(screen.getByTestId('format-4:5'))
  expect(screen.getByTestId('crop-frame')).toBeTruthy()
  await fireEvent.press(screen.getByTestId('framing-fit'))
  expect(screen.getByTestId('fit-preview')).toBeTruthy()
})

it('the format shows its full name next to Export and changes from an iOS action sheet', async () => {
  const sheet = jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, choose) => choose(3))
  await renderCut(storeWith(twoClips))
  expect(screen.getByText(t.formats.original)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('format-button'))
  expect(sheet.mock.calls[0][0].options).toEqual([t.formats.original, t.formats['4:5'], t.formats['1:1'], t.formats['9:16'], t.cancel])
  expect(screen.getByText(t.formats['9:16'])).toBeTruthy()
})

it('with no clip selected, the clip sheet changes all clips, like the Mac', async () => {
  jest.useFakeTimers()
  const store = storeWith(twoClips)
  await renderCut(store)
  await fireEvent.press(screen.getByTestId('clip-settings'))
  expect(screen.getByText(t.settingsScopeAll)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('video-fade-white'))
  await act(async () => jest.advanceTimersByTime(300))
  expect(loadSession(store, 'A1')!.defaultSettings.videoFade).toBe('white')
  jest.useRealTimers()
})

it('the clip sheet lists formats by their full names', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('clip-settings'))
  expect(screen.getByText(t.formats['9:16'])).toBeTruthy()
  expect(screen.getByText(t.formats['4:5'])).toBeTruthy()
})

it('fade length is picked from the same lengths as the Mac, shown as plain buttons', async () => {
  await renderCut(storeWith(twoClips))
  await fireEvent.press(screen.getByTestId('clip-settings'))
  for (const seconds of [0.5, 1, 2, 3, 5]) expect(screen.getByText(t.fadeSeconds(seconds))).toBeTruthy()
  expect(screen.queryByTestId('fade-handle')).toBeNull()
})
