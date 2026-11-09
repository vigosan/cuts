import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { ActionSheetIOS } from 'react-native'
import { DEFAULT_EXTRAS } from '@cuts/core/audio-layers'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { loadPreferences, savePreferences } from '../editor/preferences'
import { saveSession } from '../editor/sessions'
import { t } from '../i18n'
import { CutHarness } from '../test-utils/CutHarness'

const native = jest.mocked(CutsMedia)
const recording = { id: 'file:set.wav', name: 'set.wav', duration: 600, width: 0, height: 0, frameRate: 30, uri: 'file:///set.wav', kind: 'audio' as const }
const film = { id: 'A1', name: 'set.mov', duration: 600, width: 1920, height: 1080, frameRate: 30, uri: 'file:///set.mov', kind: 'video' as const }
const background = { path: 'background-1.mp4', kind: 'video' as const, name: 'loop.mp4', width: 1920, height: 1080 }

const storeFor = (assetId: string) => {
  const store = memoryStore()
  savePreferences(store, { format: '16:9', background, extras: { ...DEFAULT_EXTRAS, waveform: true, progressBar: true } })
  saveSession(store, assetId, { clips: [{ id: 'a', start: 10, end: 69 }], clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, baseName: 'set' })
  return store
}

const exportFrom = async (asset: typeof recording | typeof film) => {
  await render(<CutHarness asset={asset} store={storeFor(asset.id)} />)
  await act(async () => {})
  await fireEvent.press(screen.getByTestId('export'))
  await fireEvent.press(screen.getByTestId('start-export'))
}

beforeEach(() => {
  jest.clearAllMocks()
  native.exportClip.mockImplementation(async (_id, job) => `file:///tmp/${job.fileName}`)
})

it('an audio recording exports over its background with the layers that are on, at the lighter bitrate', async () => {
  await exportFrom(recording)
  const [, job] = native.exportClip.mock.calls[0]
  expect(job).toMatchObject({ backgroundPath: 'file:///app-support/backgrounds/background-1.mp4', backgroundKind: 'video', bitrate: 4_000_000 })
  expect(job.waveWidth).toBeGreaterThan(0)
  expect(job.barWidth).toBe(1)
})

it('a video opened after an audio session exports exactly as before, with no background or layers', async () => {
  await exportFrom(film)
  const [, job] = native.exportClip.mock.calls[0]
  expect(job).not.toHaveProperty('backgroundPath')
  expect(job).not.toHaveProperty('waveWidth')
  expect(job).not.toHaveProperty('bitrate')
})

const openSheet = async (asset: typeof recording | typeof film, store = memoryStore()) => {
  saveSession(store, asset.id, { clips: [{ id: 'a', start: 10, end: 69 }], clipSettings: {}, defaultSettings: DEFAULT_SETTINGS, baseName: 'set' })
  await render(<CutHarness asset={asset} store={store} />)
  await act(async () => {})
  await fireEvent.press(screen.getByTestId('export'))
  return store
}

const pickFrom = (button: number) => jest.spyOn(ActionSheetIOS, 'showActionSheetWithOptions').mockImplementation((_options, callback) => callback(button))

describe('the export sheet for an audio recording', () => {
  afterEach(() => jest.restoreAllMocks())

  it('a video has no background or layer rows, since they only apply to recordings', async () => {
    await openSheet(film)
    expect(screen.queryByTestId('background-add')).toBeNull()
    expect(screen.queryByTestId('extras-waveform')).toBeNull()
  })

  it('without a background it cannot export yet and says why', async () => {
    await openSheet(recording)
    expect(screen.getByText(t.backgroundMissing)).toBeTruthy()
    await fireEvent.press(screen.getByTestId('start-export'))
    expect(native.exportClip).not.toHaveBeenCalled()
  })

  it('Add… offers Files and Photos and shows the picked background by name, ready to export', async () => {
    const sheet = pickFrom(1)
    native.pickBackground.mockResolvedValueOnce(background)
    const store = await openSheet(recording)
    await fireEvent.press(screen.getByTestId('background-add'))
    expect(sheet.mock.calls[0][0].options).toEqual([t.cancel, t.mobile.overlayFromFiles, t.mobile.overlayFromPhotos])
    expect(native.pickBackground).toHaveBeenCalledWith('files')
    expect(await screen.findByTestId('background-name')).toHaveTextContent('loop.mp4')
    expect(loadPreferences(store).background).toEqual(background)
    expect(screen.queryByText(t.backgroundMissing)).toBeNull()
  })

  it('a file that is too big or not a video or image says which', async () => {
    pickFrom(1)
    native.pickBackground.mockResolvedValueOnce('too-big').mockResolvedValueOnce('invalid')
    await openSheet(recording)
    await fireEvent.press(screen.getByTestId('background-add'))
    expect(await screen.findByText(t.backgroundTooBig)).toBeTruthy()
    await fireEvent.press(screen.getByTestId('background-add'))
    expect(await screen.findByText(t.backgroundInvalid)).toBeTruthy()
  })

  it('✕ removes the background', async () => {
    const store = memoryStore()
    savePreferences(store, { background })
    await openSheet(recording, store)
    await fireEvent.press(screen.getByTestId('background-remove'))
    expect(screen.getByTestId('background-add')).toBeTruthy()
    expect(loadPreferences(store).background).toBeNull()
  })

  it('the waveform and progress bar switches start off and show their colour and opacity only when on', async () => {
    await openSheet(recording)
    expect(screen.getByTestId('extras-waveform').props.value).toBe(false)
    expect(screen.getByTestId('extras-progress').props.value).toBe(false)
    expect(screen.queryByTestId('extras-color')).toBeNull()
    await fireEvent(screen.getByTestId('extras-waveform'), 'valueChange', true)
    expect(screen.getByTestId('extras-color')).toBeTruthy()
    expect(screen.getByTestId('extras-opacity-0.3').props.accessibilityState).toEqual({ selected: true })
  })

  it('colour opens the iOS colour picker and opacity is picked from the same steps as the Mac', async () => {
    native.pickColor.mockResolvedValueOnce('#ff0000').mockResolvedValueOnce('#00ff00')
    const store = await openSheet(recording)
    await fireEvent(screen.getByTestId('extras-waveform'), 'valueChange', true)
    await fireEvent(screen.getByTestId('extras-progress'), 'valueChange', true)
    await fireEvent.press(screen.getByTestId('extras-color'))
    expect(native.pickColor).toHaveBeenCalledWith('#ffffff')
    await fireEvent.press(screen.getByTestId('bar-color'))
    await fireEvent.press(screen.getByTestId('extras-opacity-0.5'))
    await fireEvent.press(screen.getByTestId('bar-opacity-1'))
    await act(async () => {})
    expect(loadPreferences(store).extras).toMatchObject({ waveform: true, progressBar: true, color: '#ff0000', barColor: '#00ff00', opacity: 0.5, barOpacity: 1 })
  })
})
