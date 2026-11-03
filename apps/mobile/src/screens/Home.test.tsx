import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
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

it('a set in iCloud shows download progress and can be cancelled', async () => {
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
  expect(screen.getByText(t.mobile.downloading(40))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('cancel-opening'))
  await act(async () => finish(asset))
  expect(onOpen).not.toHaveBeenCalled()
  expect(native.cancelOpen).toHaveBeenCalledWith('A1')
  expect(screen.queryByTestId('opening-progress')).toBeNull()
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

it('recent rows use the Photos thumbnail, never download the whole set', async () => {
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
  expect(screen.getByText(t.mobile.chooseFromFiles)).toBeTruthy()
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
