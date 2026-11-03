import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { AppState, Linking } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { savePreferences } from '../editor/preferences'
import { loadSession, saveSession } from '../editor/sessions'
import { t } from '../i18n'
import { Cut } from './Cut'

const native = jest.mocked(CutsMedia)
const asset = { id: 'A1', name: 'set.mov', duration: 600, width: 1920, height: 1080, frameRate: 25, uri: 'file:///set.mov' }

const storeWith = (clips: { id: string; start: number; end: number }[], format: '4:5' | 'original' = 'original', framing: 'crop' | 'fit' = 'crop') => {
  const store = memoryStore()
  savePreferences(store, { format, settings: { ...DEFAULT_SETTINGS, framing } })
  saveSession(store, 'A1', { clips, clipSettings: {}, defaultSettings: { ...DEFAULT_SETTINGS, framing }, baseName: 'set' })
  return store
}

const renderCut = async (store: ReturnType<typeof memoryStore>) => {
  await render(
    <GestureHandlerRootView>
      <Cut asset={asset} store={store} onBack={jest.fn()} />
    </GestureHandlerRootView>
  )
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
  await fireEvent(screen.getByTestId('fade-handle'), 'accessibilityAction', { nativeEvent: { actionName: 'increment' } })
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
