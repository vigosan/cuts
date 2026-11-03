import { act, fireEvent, render, screen } from '@testing-library/react-native'
import CutsMedia from '../../modules/cuts-media'
import { t } from '../i18n'
import { Opening } from './Opening'

const native = jest.mocked(CutsMedia)

beforeEach(() => jest.clearAllMocks())

it('opening a set from a link shows iCloud progress and can be cancelled', async () => {
  let report: (event: { id: string; ratio: number }) => void = () => {}
  native.addListener.mockImplementation((_name, listener) => {
    report = listener as typeof report
    return { remove: jest.fn() } as never
  })
  native.openAsset.mockImplementation(() => new Promise(() => {}))
  const onCancel = jest.fn()
  await render(<Opening assetId="A1" onOpened={jest.fn()} onCancel={onCancel} />)
  await act(async () => report({ id: 'A1', ratio: 0.25 }))
  expect(screen.getByText(t.mobile.downloading(25))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('cancel-opening'))
  expect(native.cancelOpen).toHaveBeenCalledWith('A1')
  expect(onCancel).toHaveBeenCalled()
})

it('a link to a set that cannot be opened says so', async () => {
  native.openAsset.mockRejectedValue(new Error('missing'))
  await render(<Opening assetId="A1" onOpened={jest.fn()} onCancel={jest.fn()} />)
  expect(await screen.findByText(t.mobile.openFailed)).toBeTruthy()
})
