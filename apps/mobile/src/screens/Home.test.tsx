import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native'
import { Linking } from 'react-native'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { touchRecent } from '../editor/sessions'
import { t } from '../i18n'
import { Home } from './Home'

const native = jest.mocked(CutsMedia)
const asset = { id: 'A1', name: 'set.mov', duration: 3600, width: 1920, height: 1080, frameRate: 30, uri: 'file:///set.mov' }

beforeEach(() => jest.clearAllMocks())

it('shows recent sets newest first with their clip count', async () => {
  const store = memoryStore()
  touchRecent(store, { assetId: 'old', name: 'Old set', duration: 60, clips: 1, openedAt: 1 })
  touchRecent(store, { assetId: 'new', name: 'New set', duration: 60, clips: 3, openedAt: 2 })
  await render(<Home store={store} onOpen={jest.fn()} />)
  const rows = screen.getAllByTestId(/^recent-/)
  expect(rows.map((row) => row.props.testID)).toEqual(['recent-new', 'recent-old'])
  expect(screen.getByText(t.recentClips(3), { exact: false })).toBeTruthy()
})

it('choosing a video opens the cut screen for that asset', async () => {
  native.pickVideo.mockResolvedValue('A1')
  native.openAsset.mockResolvedValue(asset)
  const onOpen = jest.fn()
  await render(<Home store={memoryStore()} onOpen={onOpen} />)
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
  await render(<Home store={memoryStore()} onOpen={onOpen} />)
  await fireEvent.press(screen.getByTestId('choose-video'))
  await waitFor(() => expect(native.openAsset).toHaveBeenCalled())
  await act(async () => report({ id: 'A1', ratio: 0.4 }))
  expect(screen.getByText(t.mobile.downloading(40))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('cancel-opening'))
  await act(async () => finish(asset))
  expect(onOpen).not.toHaveBeenCalled()
  expect(screen.queryByTestId('opening-progress')).toBeNull()
})

it('denied Photos access explains and links to Settings', async () => {
  native.requestLibraryAccess.mockResolvedValue('denied')
  const openSettings = jest.spyOn(Linking, 'openSettings').mockResolvedValue(undefined)
  await render(<Home store={memoryStore()} onOpen={jest.fn()} />)
  await fireEvent.press(screen.getByTestId('choose-video'))
  expect(await screen.findByText(t.mobile.photosDenied)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('open-settings'))
  expect(openSettings).toHaveBeenCalled()
  expect(native.pickVideo).not.toHaveBeenCalled()
})
