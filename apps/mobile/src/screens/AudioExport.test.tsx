import { act, fireEvent, render, screen } from '@testing-library/react-native'
import { DEFAULT_EXTRAS } from '@cuts/core/audio-layers'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import CutsMedia from '../../modules/cuts-media'
import { memoryStore } from '../editor/memory-store'
import { savePreferences } from '../editor/preferences'
import { saveSession } from '../editor/sessions'
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
