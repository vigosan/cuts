import { act, fireEvent, render, screen, within } from '@testing-library/react-native'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { saveSession } from '../editor/sessions'
import { t } from '../i18n'
import { CutHarness } from '../test-utils/CutHarness'

const native = jest.mocked(CutsMedia)
const player = jest.requireMock('expo-video').__player as { currentTime: number }
const asset = { id: 'A1', name: 'set.mov', duration: 600, width: 1920, height: 1080, frameRate: 25, uri: 'file:///set.mov' }

const setWithADropAt180 = () => Array.from({ length: 600 * 50 }, (_, i) => (i >= 150 * 50 && i < 180 * 50 ? 0.02 : 0.5))

const storeWith = (clips: { id: string; start: number; end: number }[]) => {
  const store = memoryStore()
  saveSession(store, 'A1', { clips, clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, baseName: 'set' })
  return store
}

const renderCut = async (store = memoryStore()) => {
  await render(<CutHarness asset={asset} store={store} />)
  await act(async () => {})
}

const rowIds = () => screen.getAllByTestId(/^clip-row-/).map((row) => row.props.testID.replace('clip-row-', ''))

beforeEach(() => {
  jest.clearAllMocks()
  player.currentTime = 0
  native.readPeaks.mockResolvedValue(setWithADropAt180())
})

it('an empty carousel offers Suggest moments first', async () => {
  await renderCut()
  expect(within(screen.getByTestId('suggest-empty')).getByText(t.suggestMoments, { exact: false })).toBeTruthy()
})

it('Suggest adds clips without touching the ones I marked', async () => {
  await renderCut(storeWith([{ id: 'mine', start: 10, end: 20 }]))
  await fireEvent.press(screen.getByTestId('suggest'))
  expect(rowIds()).toHaveLength(2)
  expect(rowIds()[0]).toBe('mine')
  expect(screen.getByText('00:02:31 → 00:03:30')).toBeTruthy()
})

it('no audio: Suggest explains it cannot listen', async () => {
  native.readPeaks.mockResolvedValue(null)
  await renderCut()
  await fireEvent.press(screen.getByTestId('suggest-moments'))
  expect(await screen.findByText(t.suggestNoAudio)).toBeTruthy()
})

it('reordering changes the carousel order and so the export numbering', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 10, end: 15 }]))
  await fireEvent(screen.getByTestId('clip-row-b'), 'accessibilityAction', { nativeEvent: { actionName: 'moveUp' } })
  expect(rowIds()).toEqual(['b', 'a'])
})

it('Split cuts the selected clip at the playhead', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 10 }]))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  player.currentTime = 4
  await fireEvent.press(screen.getByTestId('split'))
  expect(screen.getByText('00:00:00 → 00:00:04')).toBeTruthy()
  expect(screen.getByText('00:00:04 → 00:00:10')).toBeTruthy()
})

it('delete removes the selected clip', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 10 }, { id: 'b', start: 20, end: 30 }]))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent.press(screen.getByTestId('delete-clip'))
  expect(rowIds()).toEqual(['b'])
})

it('clips past 20 are marked as outside the carousel', async () => {
  await renderCut(storeWith(Array.from({ length: 21 }, (_, i) => ({ id: `c${i}`, start: i * 10, end: i * 10 + 5 }))))
  expect(screen.getByTestId('clip-row-c20').props.accessibilityHint).toBe(t.pastCarousel(20))
  expect(screen.getByTestId('clip-row-c19').props.accessibilityHint).toBeUndefined()
})

it('the carousel header has no Choose button, so Export always takes the whole carousel', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 10, end: 15 }]))
  expect(screen.queryByTestId('select')).toBeNull()
  expect(screen.getByText(t.exportClips(2))).toBeTruthy()
})

it('the carousel can grow over the timeline to focus on the clips, and shrink back', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 5 }]))
  expect(screen.getByTestId('timeline')).toBeTruthy()
  await fireEvent.press(screen.getByTestId('carousel-header'))
  expect(screen.queryByTestId('timeline')).toBeNull()
  expect(screen.getByTestId('clip-row-a')).toBeTruthy()
  await fireEvent.press(screen.getByTestId('carousel-header'))
  expect(screen.getByTestId('timeline')).toBeTruthy()
})

it('tapping the selected clip again deselects it, so settings go back to all clips', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 5 }, { id: 'b', start: 10, end: 15 }]))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  expect(screen.getByTestId('delete-clip')).toBeTruthy()
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  expect(screen.queryByTestId('delete-clip')).toBeNull()
  expect(screen.getByText(`${t.mobile.fadesAndFraming} · ${t.settingsScopeAll}`)).toBeTruthy()
})

it('with a clip selected, the mark buttons say they move its edges', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 10 }]))
  expect(screen.getByText(t.mobile.startHere)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  expect(screen.getByText(t.mobile.moveStartHere)).toBeTruthy()
  expect(screen.getByText(t.mobile.moveEndHere)).toBeTruthy()
})

it('a half-marked clip shows where it started and can be cancelled', async () => {
  await renderCut()
  player.currentTime = 423
  await fireEvent.press(screen.getByTestId('start-here'))
  expect(screen.getByText(t.mobile.markingFrom('00:07:03'))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('cancel-mark'))
  expect(screen.queryByTestId('cancel-mark')).toBeNull()
})

it('deleting a clip says so and offers to undo it', async () => {
  await renderCut(storeWith([{ id: 'a', start: 0, end: 10 }, { id: 'b', start: 20, end: 30 }]))
  await fireEvent.press(screen.getByTestId('clip-row-a'))
  await fireEvent.press(screen.getByTestId('delete-clip'))
  expect(screen.getByText(t.mobile.clipDeleted)).toBeTruthy()
  await fireEvent.press(screen.getByTestId('notice-undo'))
  expect(rowIds()).toEqual(['a', 'b'])
})

it('Suggest says how many moments it added and can undo them', async () => {
  await renderCut()
  await fireEvent.press(screen.getByTestId('suggest-moments'))
  expect(await screen.findByText(t.mobile.momentsAdded(1))).toBeTruthy()
  await fireEvent.press(screen.getByTestId('notice-undo'))
  expect(screen.queryAllByTestId(/^clip-row-/)).toHaveLength(0)
})
