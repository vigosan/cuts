import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Animated, Linking } from 'react-native'
import { GestureHandlerRootView, State } from 'react-native-gesture-handler'
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { touchRecent } from '../editor/sessions'
import { t } from '../i18n'
import { Home } from './Home'

const native = jest.mocked(CutsMedia)
const asset = { id: 'A1', name: 'set.mov', duration: 3600, width: 1920, height: 1080, frameRate: 30, uri: 'file:///set.mov' }

beforeEach(() => {
  jest.clearAllMocks()
  native.requestLibraryAccess.mockResolvedValue('granted')
})

it('shows recent sets newest first with their clip count', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'old', name: 'Old set', duration: 60, clips: 1, openedAt: 1 })
  touchRecent(store, { assetId: 'new', name: 'New set', duration: 60, clips: 3, openedAt: 2 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  const rows = screen.getAllByTestId(/^recent-/)
  expect(rows.map((row) => row.props.testID)).toEqual(['recent-new', 'recent-old'])
  expect(screen.getByText(t.recentClips(3), { exact: false })).toBeTruthy()
})

it('choosing a video opens the cut screen for that asset', async () => {
  native.pickVideo.mockResolvedValue('A1')
  native.openAsset.mockResolvedValue(asset)
  const onOpen = jest.fn()
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={onOpen} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  await waitFor(() => expect(onOpen).toHaveBeenCalledWith(asset))
})

it('a set in iCloud shows download progress once opening takes a moment, and can be cancelled', async () => {
  jest.useFakeTimers()
  let finish: (value: typeof asset) => void = () => {}
  let report: (event: { id: string; ratio: number }) => void = () => {}
  native.pickVideo.mockResolvedValue('A1')
  native.addListener.mockImplementation((_name, listener) => {
    report = listener as typeof report
    return { remove: jest.fn() } as never
  })
  native.openAsset.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
  const onOpen = jest.fn()
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={onOpen} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  await waitFor(() => expect(native.openAsset).toHaveBeenCalled())
  await act(async () => report({ id: 'A1', ratio: 0.4 }))
  await act(async () => jest.advanceTimersByTime(500))
  expect(screen.getByText(t.mobile.downloading(40))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('cancel-opening'))
  await act(async () => finish(asset))
  expect(onOpen).not.toHaveBeenCalled()
  expect(native.cancelOpen).toHaveBeenCalledWith('A1')
  expect(screen.queryByTestId('opening-progress')).toBeNull()
  jest.useRealTimers()
})

it('a set already on the iPhone opens without flashing a download bar, since nothing is downloading', async () => {
  jest.useFakeTimers()
  let finish: (value: typeof asset) => void = () => {}
  let report: (event: { id: string; ratio: number }) => void = () => {}
  native.pickVideo.mockResolvedValue('A1')
  native.addListener.mockImplementation((_name, listener) => {
    report = listener as typeof report
    return { remove: jest.fn() } as never
  })
  native.openAsset.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  await waitFor(() => expect(native.openAsset).toHaveBeenCalled())
  await act(async () => report({ id: 'A1', ratio: 0 }))
  await act(async () => report({ id: 'A1', ratio: 1 }))
  expect(screen.queryByTestId('opening-progress')).toBeNull()
  await act(async () => finish(asset))
  await act(async () => jest.advanceTimersByTime(1000))
  expect(screen.queryByTestId('opening-progress')).toBeNull()
  jest.useRealTimers()
})

it('denied Photos access explains and links to Settings', async () => {
  native.requestLibraryAccess.mockResolvedValue('denied')
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  expect(await screen.findByText(t.mobile.photosDenied)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('open-settings'))
  expect(openSettings).toHaveBeenCalled()
  expect(native.pickVideo).not.toHaveBeenCalled()
})

it('recent rows use a small Photos thumbnail, never download the whole set', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'cloud', name: 'Set', duration: 60, clips: 1, openedAt: 1 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  expect(native.poster).toHaveBeenCalledWith('cloud', 80)
  expect(native.thumbnail).not.toHaveBeenCalled()
})

it('a set that cannot be opened says so', async () => {
  native.pickVideo.mockResolvedValue('A1')
  native.openAsset.mockRejectedValue(new Error('missing'))
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  expect(await screen.findByText(t.mobile.openFailed)).toBeTruthy()
})

it('limited Photos access explains that Cuts needs all of Photos', async () => {
  native.requestLibraryAccess.mockResolvedValue('limited')
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-video'))
  expect(await screen.findByText(t.mobile.photosLimited)).toBeTruthy()
  expect(native.pickVideo).not.toHaveBeenCalled()
})

it('a video from iCloud Drive opens through Files without asking for Photos', async () => {
  native.pickFile.mockResolvedValue('file:abc')
  native.openAsset.mockResolvedValue({ ...asset, id: 'file:abc' })
  const onOpen = jest.fn()
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={onOpen} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('choose-file'))
  await waitFor(() => expect(onOpen).toHaveBeenCalledWith({ ...asset, id: 'file:abc' }))
  expect(native.requestLibraryAccess).not.toHaveBeenCalled()
  expect(screen.getByLabelText(t.mobile.chooseFromFiles)).toBeTruthy()
})

it('a recent set can be removed from the list', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'old', name: 'Old set', duration: 60, clips: 1, openedAt: 1 })
  touchRecent(store, { assetId: 'new', name: 'New set', duration: 60, clips: 3, openedAt: 2 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent(screen.getByTestId('recent-old'), 'accessibilityAction', { nativeEvent: { actionName: 'delete' } })
  expect(screen.queryByTestId('recent-old')).toBeNull()
  expect(screen.getByTestId('recent-new')).toBeTruthy()
})

it('links to the privacy policy and support from inside the app, as App Review requires', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined)
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await fireEvent.press(screen.getByTestId('privacy-link'))
  expect(open).toHaveBeenCalledWith(t.privacyUrl)
  await fireEvent.press(screen.getByTestId('support-link'))
  expect(open).toHaveBeenCalledWith(t.supportUrl)
})

it('coming back to Home shows the set you just opened in Recent', async () => {
  const store = memoryStore()
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} visits={1} /></GestureHandlerRootView>)
  touchRecent(store, { assetId: 'just-opened', name: 'Set', duration: 60, clips: 2, openedAt: 1 })
  await screen.rerender(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} visits={2} /></GestureHandlerRootView>)
  expect(screen.getByTestId('recent-just-opened')).toBeTruthy()
})

it('a first visit shows the Cuts logo and the three steps, so the screen explains itself', async () => {
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  expect(screen.getByTestId('home-logo')).toBeTruthy()
  expect(screen.getByText(t.mobile.tagline)).toBeTruthy()
  t.mobile.steps.forEach((step) => expect(screen.getByText(step)).toBeTruthy())
})

it('the steps give way to Recent once a set has been opened', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'A1', name: 'Set', duration: 60, clips: 1, openedAt: 1 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  expect(screen.queryByTestId('home-steps')).toBeNull()
})

it('the short Photos and Files tiles keep their full names for VoiceOver', async () => {
  await render(<GestureHandlerRootView><Home store={memoryStore()} onOpen={jest.fn()} /></GestureHandlerRootView>)
  expect(screen.getByTestId('choose-video').props.accessibilityLabel).toBe(t.mobile.chooseFromPhotos)
  expect(screen.getByTestId('choose-file').props.accessibilityLabel).toBe(t.mobile.chooseFromFiles)
  expect(screen.getByText(t.mobile.fromPhotos)).toBeTruthy()
})

it('a recent row at rest has no Remove button behind it, so pressing the row never flashes red', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'A1', name: 'Set', duration: 60, clips: 1, openedAt: 1 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  expect(screen.queryByTestId('remove-A1')).toBeNull()
})

it('a flicked recent row keeps the speed of the finger as it settles, so there is no jolt on release', async () => {
  const spring = jest.spyOn(Animated, 'spring')
  const store = memoryStore()
  touchRecent(store, { assetId: 'A1', name: 'Set', duration: 60, clips: 1, openedAt: 1 })
  await render(<GestureHandlerRootView><Home store={store} onOpen={jest.fn()} /></GestureHandlerRootView>)
  await act(async () =>
    fireGestureHandler(getByGestureTestId('recent-swipe-A1'), [
      { state: State.BEGAN, translationX: 0, velocityX: 0 },
      { state: State.ACTIVE, translationX: -30, velocityX: -900 },
      { state: State.END, translationX: -30, velocityX: -900 }
    ])
  )
  expect(spring).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: -88, velocity: -900 }))
})
