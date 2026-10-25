import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api, ExportResult } from '@shared/api'
import { App } from './App'
import { t } from './i18n'

const VIDEO = '/Users/vicent/Movies/2026-10-22 22-33-13.mov'

function makeApi(): Api {
  return {
    platform: 'darwin',
    pathForFile: vi.fn(() => VIDEO),
    openVideo: vi.fn(async () => VIDEO),
    chooseFolder: vi.fn(async () => '/Users/vicent/Movies/Instagram'),
    moviesDir: vi.fn(async () => '/Users/vicent/Movies'),
    exportClips: vi.fn(async () => ({ ok: true as const, files: ['/Users/vicent/Movies/Instagram/x-1.mp4'] })),
    onExportProgress: vi.fn(() => () => {}),
    reveal: vi.fn(),
    cancelExport: vi.fn(),
    share: vi.fn(),
    loadSession: vi.fn(async () => null),
    frameRate: vi.fn(async () => 50),
    saveSession: vi.fn(),
    thumbnail: vi.fn(async (_path: string, time: number) => `data:image/jpeg;base64,${time}`),
    waveform: vi.fn(async () => new Float32Array(4880 * 50).fill(0.5)),
    onMenuOpenVideo: vi.fn((callback: () => void) => {
      menuOpenVideo = callback
      return () => {}
    }),
    onMenuCommand: vi.fn((callback: (command: 'undo' | 'redo') => void) => {
      menuCommand = callback
      return () => {}
    })
  }
}

let api: Api
let menuOpenVideo: () => void
let menuCommand: (command: 'undo' | 'redo') => void

beforeEach(() => {
  api = makeApi()
  Object.assign(window, { api })
})

async function loadVideo() {
  await userEvent.click(screen.getByTestId('open-video'))
  const video = screen.getByTestId('video') as HTMLVideoElement
  Object.defineProperty(video, 'duration', { configurable: true, value: 4880 })
  Object.defineProperty(video, 'videoWidth', { configurable: true, value: 1280 })
  Object.defineProperty(video, 'videoHeight', { configurable: true, value: 720 })
  fireEvent(video, new Event('loadedmetadata'))
  return video
}

function seek(video: HTMLVideoElement, time: number) {
  Object.defineProperty(video, 'currentTime', { configurable: true, writable: true, value: time })
  fireEvent(video, new Event('timeupdate'))
}

async function markClip(video: HTMLVideoElement, start: number, end: number) {
  seek(video, start)
  await userEvent.click(screen.getByTestId('mark-start'))
  seek(video, end)
  await userEvent.click(screen.getByTestId('mark-end'))
}

describe('App', () => {
  it('loads the dropped video by its path so the file is streamed, not copied', async () => {
    render(<App />)
    const file = new File([''], '2026-10-22 22-33-13.mov')
    fireEvent.drop(screen.getByTestId('app'), { dataTransfer: { files: [file] } })
    const video = await screen.findByTestId('video')
    expect(video.getAttribute('src')).toBe('media://file/' + encodeURIComponent(VIDEO))
    expect(screen.getByTestId('base-name')).toHaveValue('2026-10-22 22-33-13')
  })

  it('lists a marked clip with its times and duration', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 584, 643)
    const row = screen.getByTestId('clip-row-1')
    expect(row).toHaveTextContent('00:09:44')
    expect(row).toHaveTextContent('00:10:43')
    expect(row).toHaveTextContent('0:59')
    expect(row).not.toHaveAttribute('data-over-limit', 'true')
  })

  it('warns about clips over 59 s but still exports them, because a regular post can be longer than a carousel clip', async () => {
    render(<App />)
    const video = await loadVideo()
    await userEvent.click(screen.getByTestId('choose-folder'))
    await markClip(video, 10, 120)
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('data-over-limit', 'true')
    expect(screen.getByTestId('clip-duration-1')).toHaveAttribute('title', t.overLimit(59))
    expect(screen.getByTestId('export')).toBeEnabled()
  })

  it('marks with the I and O keys like in Final Cut', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 100)
    await userEvent.keyboard('i')
    seek(video, 130)
    await userEvent.keyboard('o')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('0:30')
  })

  it('leaves Command and Control shortcuts to the menu, so Command-O opens a video instead of marking an end', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 100)
    await userEvent.keyboard('i')
    seek(video, 130)
    const shortcut = new KeyboardEvent('keydown', { key: 'o', code: 'KeyO', metaKey: true, cancelable: true })
    window.dispatchEvent(shortcut)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', code: 'KeyO', ctrlKey: true, cancelable: true }))
    expect(shortcut.defaultPrevented).toBe(false)
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
  })

  it('exports every clip in order with the chosen name, folder, fades and format', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 600, 650)
    await markClip(video, 100, 140)
    await userEvent.click(screen.getByTestId('choose-folder'))
    await userEvent.clear(screen.getByTestId('base-name'))
    await userEvent.type(screen.getByTestId('base-name'), 'sesion-22-oct')
    await userEvent.selectOptions(screen.getByTestId('format'), '4:5')
    expect(screen.getByTestId('fade-video')).toHaveValue('black')
    expect(screen.getByTestId('fade-audio')).toHaveValue('natural')
    await userEvent.selectOptions(screen.getByTestId('fade-video'), 'white')
    await userEvent.selectOptions(screen.getByTestId('fade-seconds'), '2')
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(api.exportClips).toHaveBeenCalledWith({
      input: VIDEO,
      folder: '/Users/vicent/Movies/Instagram/2026-10-22 22-33-13',
      baseName: 'sesion-22-oct',
      format: '4:5',
      clips: [
        expect.objectContaining({ start: 600, end: 650, videoFade: 'white', audioFade: 'natural', fadeSeconds: 2 }),
        expect.objectContaining({ start: 100, end: 140, videoFade: 'white', audioFade: 'natural', fadeSeconds: 2 })
      ]
    })
    expect(await screen.findByTestId('export-done')).toBeInTheDocument()
  })

  it('shows export errors instead of failing silently', async () => {
    vi.mocked(api.exportClips).mockResolvedValue({ ok: false, error: 'No se encontró ffmpeg' })
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 10, 20)
    await userEvent.click(screen.getByTestId('choose-folder'))
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(await screen.findByTestId('export-error')).toHaveTextContent('No se encontró ffmpeg')
  })

  it('keeps space as play/pause after using an export option, so shortcuts never silently change export settings', async () => {
    render(<App />)
    const video = await loadVideo()
    const play = vi.fn(async () => {})
    Object.assign(video, { play })
    await userEvent.selectOptions(screen.getByTestId('format'), '1:1')
    await userEvent.keyboard(' ')
    expect(screen.getByTestId('format')).toHaveValue('1:1')
    expect(play).toHaveBeenCalled()
  })

  it('asks before an accidental drop replaces the video and its marked clips', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 10, 20)
    fireEvent.drop(screen.getByTestId('app'), { dataTransfer: { files: [new File([''], 'clip.mp4')] } })
    expect(confirm).toHaveBeenCalled()
    expect(screen.getByTestId('clip-row-1')).toBeInTheDocument()
    confirm.mockRestore()
  })

  it('replaces the pending start when marking start again, because he often corrects the in-point by ear', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 100)
    await userEvent.click(screen.getByTestId('mark-start'))
    seek(video, 130)
    await userEvent.click(screen.getByTestId('mark-start'))
    expect(screen.getByTestId('pending')).toHaveTextContent('00:02:10')
    seek(video, 170)
    await userEvent.click(screen.getByTestId('mark-end'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:02:10')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('0:40')
    expect(screen.queryByTestId('clip-row-2')).not.toBeInTheDocument()
  })

  it('labels the per-clip adjust buttons with the playhead time they will apply', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 383, 419)
    await userEvent.click(screen.getByTestId('clip-row-1'))
    seek(video, 473)
    expect(screen.getByTestId('clip-set-end-1')).toHaveAttribute('title', expect.stringContaining('00:07:53'))
    await userEvent.click(screen.getByTestId('clip-set-end-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:07:53')
  })

  it('disables an adjustment that would put the start after the end, instead of silently ignoring the click', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 383, 419)
    await userEvent.click(screen.getByTestId('clip-row-1'))
    seek(video, 473)
    expect(screen.getByTestId('clip-set-start-1')).toHaveAttribute('title', expect.stringContaining('00:07:53'))
    expect(screen.getByTestId('clip-set-start-1')).toBeDisabled()
    seek(video, 390)
    expect(screen.getByTestId('clip-set-start-1')).toBeEnabled()
    expect(screen.getByTestId('clip-set-end-1')).toBeEnabled()
    seek(video, 300)
    expect(screen.getByTestId('clip-set-end-1')).toBeDisabled()
  })

  it('drags the end edge of a clip on the timeline to trim it, jumping the video there to hear the new cut', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1100)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-handle-end-1'), { clientX: 1100 })
    fireEvent.pointerMove(window, { clientX: 1059 })
    expect(video.currentTime).toBe(1059)
    fireEvent.pointerUp(window, { clientX: 1059 })
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('0:59')
    expect(screen.getByTestId('clip-row-1')).not.toHaveAttribute('data-over-limit', 'true')
  })

  it('moves a whole clip along the timeline keeping its length', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1050)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-block-1'), { clientX: 1020 })
    fireEvent.pointerMove(window, { clientX: 1220 })
    fireEvent.pointerUp(window, { clientX: 1220 })
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:20:00')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:20:50')
  })

  it('drags the zoomed timeline back and forth without moving the playhead, to look around before jumping', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 1000)
    await userEvent.click(screen.getByTestId('zoom-120'))
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:15:40')
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 1200, top: 0, height: 32, right: 1200, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(timeline, { clientX: 900 })
    fireEvent.pointerMove(window, { clientX: 300 })
    fireEvent.pointerUp(window, { clientX: 300 })
    fireEvent.click(timeline, { clientX: 300 })
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:16:40')
    expect(video.currentTime).toBe(1000)
    fireEvent.pointerDown(timeline, { clientX: 300 })
    fireEvent.pointerMove(window, { clientX: 1200 })
    fireEvent.pointerUp(window, { clientX: 1200 })
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:15:10')
    seek(video, 2000)
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:32:20')
  })

  it('zooms the timeline to 2 minutes around the playhead for second-accurate dragging', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 3000, 3070)
    await userEvent.click(screen.getByTestId('zoom-120'))
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:50:10')
    expect(screen.getByTestId('view-end')).toHaveTextContent('00:52:10')
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 1200, top: 0, height: 32, right: 1200, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-handle-end-1'), { clientX: 700 })
    fireEvent.pointerMove(window, { clientX: 590 })
    fireEvent.pointerUp(window, { clientX: 590 })
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:50:59')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('0:59')
  })

  it('ignores the click that ends a drag, so releasing the mouse off the clip does not jump the playhead away from the new cut', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1100)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-handle-end-1'), { clientX: 1100 })
    fireEvent.pointerMove(window, { clientX: 1059 })
    fireEvent.pointerUp(window, { clientX: 1059 })
    fireEvent.click(timeline, { clientX: 1059 - 300 })
    expect(video.currentTime).toBe(1059)
    await new Promise((resolve) => setTimeout(resolve, 0))
    fireEvent.click(timeline, { clientX: 2000 })
    expect(video.currentTime).toBe(2000)
  })

  it('seeks when clicking inside a clip without dragging, so the whole bar works for navigating', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1050)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-block-1'), { clientX: 1020 })
    fireEvent.pointerUp(window, { clientX: 1020 })
    expect(video.currentTime).toBe(1020)
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:16:40')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:17:30')
  })

  it('drags a clip to the top of the carousel so it becomes the first exported file and the cover', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await markClip(video, 300, 350)
    fireEvent.dragStart(screen.getByTestId('clip-row-3'))
    fireEvent.dragOver(screen.getByTestId('clip-row-1'))
    fireEvent.drop(screen.getByTestId('clip-row-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:05:00')
    expect(screen.getByTestId('clip-row-2')).toHaveTextContent('00:01:40')
    expect(screen.getByTestId('clip-block-1')).toHaveTextContent('1')
    expect(screen.getByTestId('clip-block-1').style.left).toBe(`${(300 / 4880) * 100}%`)
  })

  it('shows where image fades happen, with the cover clip starting sharp, so the export is predictable', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    expect(screen.queryByTestId('clip-fade-in-1')).not.toBeInTheDocument()
    expect(screen.getByTestId('clip-fade-out-1')).toBeInTheDocument()
    expect(screen.getByTestId('clip-fade-in-2')).toBeInTheDocument()
    expect(screen.getByTestId('clip-cover-1')).toBeInTheDocument()
    expect(screen.getByTestId('clip-block-1')).toHaveAttribute('data-fade-in', 'false')
    expect(screen.getByTestId('clip-block-2')).toHaveAttribute('data-fade-in', 'true')
    await userEvent.selectOptions(screen.getByTestId('fade-video'), 'none')
    expect(screen.queryByTestId('clip-fade-out-1')).not.toBeInTheDocument()
    expect(screen.queryByTestId('clip-fade-in-2')).not.toBeInTheDocument()
    expect(screen.getByTestId('clip-block-2')).toHaveAttribute('data-fade-out', 'false')
  })

  it('edits the fades of the selected clip only, so each carousel slide can have its own transition', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await markClip(video, 300, 350)
    await userEvent.click(screen.getByTestId('clip-row-2'))
    expect(screen.getByTestId('clip-row-2')).toHaveAttribute('aria-current', 'true')
    await userEvent.selectOptions(screen.getByTestId('fade-video'), 'white')
    await userEvent.selectOptions(screen.getByTestId('fade-audio'), 'none')
    await userEvent.click(screen.getByTestId('clip-row-1'))
    expect(screen.getByTestId('fade-video')).toHaveValue('black')
    expect(screen.getByTestId('fade-audio')).toHaveValue('natural')
    await userEvent.click(screen.getByTestId('clip-row-2'))
    expect(screen.getByTestId('fade-video')).toHaveValue('white')
    expect(screen.getByTestId('fade-audio')).toHaveValue('none')
    await userEvent.click(screen.getByTestId('choose-folder'))
    await act(() => userEvent.click(screen.getByTestId('export')))
    const { clips } = vi.mocked(api.exportClips).mock.calls[0][0]
    expect(clips.map((c) => [c.videoFade, c.audioFade])).toEqual([
      ['black', 'natural'],
      ['white', 'none'],
      ['black', 'natural']
    ])
  })

  it('applies fade changes to every clip when none is selected', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await userEvent.click(screen.getByTestId('clip-row-2'))
    await userEvent.selectOptions(screen.getByTestId('fade-video'), 'white')
    await userEvent.click(screen.getByTestId('clip-row-2'))
    expect(screen.getByTestId('clip-row-2')).toHaveAttribute('aria-current', 'false')
    await userEvent.selectOptions(screen.getByTestId('fade-video'), 'none')
    await userEvent.click(screen.getByTestId('choose-folder'))
    await act(() => userEvent.click(screen.getByTestId('export')))
    const { clips } = vi.mocked(api.exportClips).mock.calls[0][0]
    expect(clips.map((c) => c.videoFade)).toEqual(['none', 'none'])
  })

  it('selects a clip when clicking its times instead of moving them, so choosing a clip never edits it by accident', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 383, 419)
    await userEvent.click(screen.getByTestId('clip-set-end-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:06:59')
    seek(video, 473)
    await userEvent.click(screen.getByTestId('clip-set-end-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:07:53')
  })

  it('exports to Movies/Cuts/<video name> by default, so no folder has to be chosen', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    expect(await screen.findByTestId('choose-folder')).toHaveTextContent('Movies/Cuts')
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(api.exportClips).toHaveBeenCalledWith(
      expect.objectContaining({ folder: '/Users/vicent/Movies/Cuts/2026-10-22 22-33-13' })
    )
  })

  it('previews the exact file names and folder the export will write, so what is promised is what lands on disk', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.clear(screen.getByTestId('base-name'))
    await userEvent.type(screen.getByTestId('base-name'), 'set 22:30')
    const preview = await screen.findByTestId('export-preview')
    expect(preview).toHaveTextContent('set 22-30-1.mp4')
    expect(preview).toHaveAttribute('title', '/Users/vicent/Movies/Cuts/2026-10-22 22-33-13/set 22-30-1.mp4')
  })

  it('names the clips and the default folder after the video on Windows, whose paths use backslashes', async () => {
    vi.mocked(api.openVideo).mockResolvedValue('C:\\Users\\vicent\\Videos\\set.mov')
    vi.mocked(api.moviesDir).mockResolvedValue('C:\\Users\\vicent\\Videos')
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    expect(await screen.findByTestId('choose-folder')).toHaveTextContent('Videos/Cuts')
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(api.exportClips).toHaveBeenCalledWith(
      expect.objectContaining({ baseName: 'set', folder: 'C:\\Users\\vicent\\Videos/Cuts/set' })
    )
  })

  it('shows the interface in the user language, here English from the test environment', async () => {
    render(<App />)
    expect(screen.getByTestId('open-video')).toHaveTextContent('Choose video…')
    const video = await loadVideo()
    await markClip(video, 100, 150)
    expect(screen.getByTestId('export')).toHaveTextContent('Export 1 clip')
    expect(screen.getByTestId('mark-start')).toHaveAttribute('title', 'Mark start (I)')
  })

  it('opens the folder picker at the current destination instead of wherever macOS last was', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await screen.findByText('Movies/Cuts')
    await userEvent.click(screen.getByTestId('choose-folder'))
    expect(api.chooseFolder).toHaveBeenCalledWith('/Users/vicent/Movies/Cuts')
  })

  it('highlights the selected clip on the timeline too, so list and timeline always point at the same clip', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await userEvent.click(screen.getByTestId('clip-row-2'))
    expect(screen.getByTestId('clip-block-2')).toHaveAttribute('aria-current', 'true')
    expect(screen.getByTestId('clip-block-1')).toHaveAttribute('aria-current', 'false')
  })

  it('selects a clip in the list when clicking its block on the timeline', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-block-1'), { clientX: 120 })
    fireEvent.pointerUp(window, { clientX: 120 })
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('aria-current', 'true')
    expect(video.currentTime).toBe(120)
  })

  it('opens another video from the File menu, so the title bar stays clean', async () => {
    render(<App />)
    await loadVideo()
    vi.mocked(api.openVideo).mockClear()
    await act(async () => menuOpenVideo())
    expect(api.openVideo).toHaveBeenCalled()
  })

  it('listens to the File menu once instead of on every frame of playback, so the IPC listeners never churn', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 10)
    seek(video, 20)
    seek(video, 30)
    expect(api.onMenuOpenVideo).toHaveBeenCalledTimes(1)
  })

  it('listens to the keyboard once per video instead of on every frame of playback', async () => {
    const listen = vi.spyOn(window, 'addEventListener')
    render(<App />)
    const video = await loadVideo()
    seek(video, 10)
    seek(video, 20)
    seek(video, 30)
    expect(listen.mock.calls.filter(([type]) => type === 'keydown')).toHaveLength(1)
    listen.mockRestore()
  })

  it('ignores opening another video while exporting, so the running export never reports onto a different video', async () => {
    vi.mocked(api.exportClips).mockReturnValue(new Promise(() => {}))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('export'))
    vi.mocked(api.openVideo).mockClear()
    await act(async () => menuOpenVideo())
    fireEvent.drop(screen.getByTestId('app'), { dataTransfer: { files: [new File([''], 'other.mov')] } })
    expect(api.openVideo).not.toHaveBeenCalled()
    expect(api.pathForFile).not.toHaveBeenCalled()
    vi.mocked(window.confirm).mockRestore()
  })

  it('shows an error when the export call itself fails instead of staying on Exporting… forever', async () => {
    vi.mocked(api.exportClips).mockRejectedValue(new Error('IPC failed'))
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(await screen.findByTestId('export-error')).toHaveTextContent('IPC failed')
  })

  it('shows frames of the video along the timeline, like the filmstrip in Final Cut', async () => {
    render(<App />)
    await loadVideo()
    const frames = await screen.findAllByTestId('filmstrip-frame')
    expect(frames.length).toBeGreaterThan(5)
    expect(frames[0].getAttribute('src')).toMatch(/^data:image\/jpeg;base64,/)
    expect(api.thumbnail).toHaveBeenCalledWith(VIDEO, expect.any(Number))
  })

  it('reads the waveform once per video, since decoding a whole session takes a few seconds', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('zoom-120'))
    expect(screen.getByTestId('waveform')).toBeInTheDocument()
    expect(api.waveform).toHaveBeenCalledTimes(1)
    expect(api.waveform).toHaveBeenCalledWith(VIDEO)
  })

  it('labels the button just Export while there is nothing to export, instead of Export 0 clips', async () => {
    render(<App />)
    await loadVideo()
    expect(screen.getByTestId('export')).toHaveTextContent(/^Export$/)
  })

  it('cancels a running export from the export panel', async () => {
    vi.mocked(api.exportClips).mockReturnValue(new Promise(() => {}))
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('export'))
    await userEvent.click(await screen.findByTestId('export-cancel'))
    expect(api.cancelExport).toHaveBeenCalled()
  })

  it('offers the framing choice only for Instagram formats, since the original keeps the whole frame', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    expect(screen.queryByTestId('framing-fit')).not.toBeInTheDocument()
    await userEvent.selectOptions(screen.getByTestId('format'), '4:5')
    expect(screen.getByTestId('framing-crop')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('framing-fit')).toHaveAttribute('aria-pressed', 'false')
  })

  it('exports the selected clip with the whole frame over a blurred background, leaving the others cropped', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await userEvent.selectOptions(screen.getByTestId('format'), '4:5')
    await userEvent.click(screen.getByTestId('clip-row-2'))
    await userEvent.click(screen.getByTestId('framing-fit'))
    await userEvent.click(screen.getByTestId('choose-folder'))
    await act(() => userEvent.click(screen.getByTestId('export')))
    const { clips } = vi.mocked(api.exportClips).mock.calls[0][0]
    expect(clips.map((c) => c.framing)).toEqual(['crop', 'fit'])
  })

  it('moves the crop zone by dragging the frame over the video, to keep the part that matters in shot', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.selectOptions(screen.getByTestId('format'), '9:16')
    const frame = await screen.findByTestId('crop-frame')
    fireEvent.pointerDown(frame, { clientX: 100, clientY: 10 })
    fireEvent.pointerMove(window, { clientX: 40, clientY: 10 })
    fireEvent.pointerUp(window, { clientX: 40, clientY: 10 })
    await userEvent.click(screen.getByTestId('choose-folder'))
    await act(() => userEvent.click(screen.getByTestId('export')))
    const { clips } = vi.mocked(api.exportClips).mock.calls[0][0]
    expect(clips[0].cropX).toBeLessThan(0.5)
  })

  it('brings back the clips and settings saved for a video when it is opened again', async () => {
    vi.mocked(api.loadSession).mockResolvedValue({
      clips: [{ id: 'saved', start: 584, end: 643 }],
      clipSettings: {},
      defaultSettings: { videoFade: 'white', audioFade: 'natural', fadeSeconds: 1, framing: 'crop', cropX: 0.5, cropY: 0.5 },
      format: '4:5',
      baseName: 'set-22-oct'
    })
    render(<App />)
    await loadVideo()
    expect(await screen.findByTestId('clip-row-1')).toHaveTextContent('00:09:44')
    expect(screen.getByTestId('format')).toHaveValue('4:5')
    expect(screen.getByTestId('base-name')).toHaveValue('set-22-oct')
    expect(screen.getByTestId('fade-video')).toHaveValue('white')
    expect(api.loadSession).toHaveBeenCalledWith(VIDEO)
  })

  it('saves the work for this video as it changes, and never overwrites it before it is restored', async () => {
    render(<App />)
    const video = await loadVideo()
    await waitFor(() => expect(api.saveSession).toHaveBeenCalled())
    vi.mocked(api.saveSession).mockClear()
    await markClip(video, 100, 150)
    await waitFor(() =>
      expect(api.saveSession).toHaveBeenLastCalledWith(VIDEO, expect.objectContaining({ clips: [expect.objectContaining({ start: 100, end: 150 })] }))
    )
  })

  it('undoes and redoes deleting a clip from the Edit menu', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('clip-delete-1'))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
    await act(async () => menuCommand('undo'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:01:40')
    await act(async () => menuCommand('redo'))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
  })

  it('undoes a whole drag on the timeline in one step', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1050)
    const timeline = screen.getByTestId('timeline')
    timeline.getBoundingClientRect = () => ({ left: 0, width: 4880, top: 0, height: 32, right: 4880, bottom: 32, x: 0, y: 0, toJSON: () => ({}) })
    fireEvent.pointerDown(screen.getByTestId('clip-block-1'), { clientX: 1020 })
    for (const x of [1060, 1100, 1220]) fireEvent.pointerMove(window, { clientX: x })
    fireEvent.pointerUp(window, { clientX: 1220 })
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:20:00')
    await act(async () => menuCommand('undo'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:16:40')
  })

  it('starts a fresh history for each video, so Command-Z never brings back clips from another one', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await act(async () => menuOpenVideo())
    await act(async () => menuCommand('undo'))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
    vi.mocked(window.confirm).mockRestore()
  })

  it('steps one frame with comma and period, and one second with Shift, to place cuts precisely', async () => {
    render(<App />)
    const video = await loadVideo()
    seek(video, 100)
    await waitFor(() => expect(api.frameRate).toHaveBeenCalledWith(VIDEO))
    fireEvent.keyDown(window, { key: '.', code: 'Period' })
    expect(video.currentTime).toBeCloseTo(100.02)
    fireEvent.keyDown(window, { key: ',', code: 'Comma' })
    fireEvent.keyDown(window, { key: ',', code: 'Comma' })
    expect(video.currentTime).toBeCloseTo(99.98)
    fireEvent.keyDown(window, { key: ':', code: 'Period', shiftKey: true })
    expect(video.currentTime).toBeCloseTo(100.98)
  })

  it('shuttles with J, K and L like a video editor', async () => {
    render(<App />)
    const video = await loadVideo()
    const play = vi.fn(async () => {})
    const pause = vi.fn()
    Object.assign(video, { play, pause })
    seek(video, 100)
    fireEvent.keyDown(window, { key: 'l', code: 'KeyL' })
    expect(play).toHaveBeenCalled()
    expect(video.playbackRate).toBe(1)
    fireEvent.keyDown(window, { key: 'l', code: 'KeyL' })
    expect(video.playbackRate).toBe(2)
    fireEvent.keyDown(window, { key: 'k', code: 'KeyK' })
    expect(pause).toHaveBeenCalled()
    expect(video.playbackRate).toBe(1)
    fireEvent.keyDown(window, { key: 'j', code: 'KeyJ' })
    expect(video.currentTime).toBe(95)
  })

  it('jumps to the clip picked in the list and centers it on the timeline when it fits the zoom', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 1000, 1060)
    await markClip(video, 3000, 3030)
    await userEvent.click(screen.getByTestId('zoom-120'))
    await userEvent.click(screen.getByTestId('clip-row-1'))
    expect(video.currentTime).toBe(1000)
    expect(screen.getByTestId('view-start')).toHaveTextContent('00:16:10')
  })

  it('suggests the drops of the session as clips, with 30 s of build-up before each one and 29 s of the mix after it', async () => {
    const peaks = new Float32Array(4880 * 50)
    for (let i = 0; i < peaks.length; i++) {
      const second = Math.floor(i / 50)
      peaks[i] = second >= 980 && second < 1000 ? 0.02 : second >= 1000 && second < 1030 ? 0.3 : 0.2
    }
    let finish: (value: Float32Array) => void = () => {}
    vi.mocked(api.waveform).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<App />)
    await loadVideo()
    await userEvent.click(screen.getByTestId('suggest'))
    expect(screen.getByTestId('suggest')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByTestId('suggest')).toHaveAccessibleName(t.suggestMoments)
    await act(async () => finish(peaks))
    expect(screen.getByTestId('suggest')).toHaveAttribute('aria-busy', 'false')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:16:10')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:17:09')
    expect(screen.queryByTestId('clip-row-2')).not.toBeInTheDocument()
    await act(async () => menuCommand('undo'))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
  })

  it('keeps the clips marked while the suggestions are being read, since reading a whole session takes seconds', async () => {
    let finish: (value: Float32Array) => void = () => {}
    vi.mocked(api.waveform).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<App />)
    const video = await loadVideo()
    await userEvent.click(screen.getByTestId('suggest'))
    await markClip(video, 2000, 2030)
    const peaks = new Float32Array(4880 * 50).fill(0.2)
    peaks.fill(0.02, 980 * 50, 1000 * 50)
    peaks.fill(0.3, 1000 * 50, 1030 * 50)
    await act(async () => finish(peaks))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:33:20')
    expect(screen.getByTestId('clip-row-2')).toHaveTextContent('00:16:10')
  })

  it('lets the suggestions be asked again when the audio cannot be read, instead of failing in the background', async () => {
    vi.mocked(api.waveform).mockRejectedValue(new Error('Invalid data found'))
    render(<App />)
    await loadVideo()
    await userEvent.click(screen.getByTestId('suggest'))
    await waitFor(() => expect(screen.getByTestId('suggest')).toBeEnabled())
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
  })

  it('drops suggestions that arrive after another video was opened, so they never land on the wrong video', async () => {
    let finish: (value: Float32Array) => void = () => {}
    vi.mocked(api.waveform).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<App />)
    await loadVideo()
    await userEvent.click(screen.getByTestId('suggest'))
    vi.mocked(api.openVideo).mockResolvedValue('/Users/vicent/Movies/other.mov')
    await act(async () => menuOpenVideo())
    const peaks = new Float32Array(4880 * 50).fill(0.2)
    peaks.fill(0.02, 980 * 50, 1000 * 50)
    peaks.fill(0.3, 1000 * 50, 1030 * 50)
    await act(async () => finish(peaks))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
  })

  it('removes every clip at once and brings them back with undo, so starting over is one click and never a loss', async () => {
    render(<App />)
    const video = await loadVideo()
    expect(screen.queryByTestId('clear-clips')).not.toBeInTheDocument()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await userEvent.click(screen.getByTestId('clear-clips'))
    expect(screen.queryByTestId('clip-row-1')).not.toBeInTheDocument()
    await act(async () => menuCommand('undo'))
    expect(screen.getByTestId('clip-row-2')).toBeInTheDocument()
  })

  it('plays a clip on loop from its row, the way Instagram plays carousel videos', async () => {
    render(<App />)
    const video = await loadVideo()
    const play = vi.fn(async () => {})
    Object.assign(video, { play })
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('clip-play-1'))
    expect(play).toHaveBeenCalled()
    expect(video.currentTime).toBe(100)
    expect(screen.getByTestId('clip-play-1')).toHaveAttribute('aria-pressed', 'true')
    seek(video, 150.1)
    expect(video.currentTime).toBe(100)
  })

  it('keeps one frame watcher running while a clip loops instead of restarting it on every render', async () => {
    render(<App />)
    const video = await loadVideo()
    Object.assign(video, { play: vi.fn(async () => {}) })
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('clip-play-1'))
    fireEvent(video, new Event('play'))
    const cancel = vi.spyOn(window, 'cancelAnimationFrame')
    seek(video, 110)
    seek(video, 120)
    seek(video, 130)
    expect(cancel).not.toHaveBeenCalled()
    cancel.mockRestore()
  })

  it('plays on into the next clip and back to the first, so the whole carousel can be heard in posting order', async () => {
    render(<App />)
    const video = await loadVideo()
    Object.assign(video, { play: vi.fn(async () => {}) })
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await markClip(video, 300, 350)
    await userEvent.click(screen.getByTestId('clip-play-2'))
    expect(video.currentTime).toBe(200)
    seek(video, 250.1)
    expect(video.currentTime).toBe(300)
    expect(screen.getByTestId('clip-play-3')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('clip-play-2')).toHaveAttribute('aria-pressed', 'false')
    seek(video, 350.1)
    expect(video.currentTime).toBe(100)
    expect(screen.getByTestId('clip-play-1')).toHaveAttribute('aria-pressed', 'true')
  })

  it('stops looping when the clip button is pressed again or playback is paused', async () => {
    render(<App />)
    const video = await loadVideo()
    const pause = vi.fn()
    Object.assign(video, { play: vi.fn(async () => {}), pause })
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('clip-play-1'))
    await userEvent.click(screen.getByTestId('clip-play-1'))
    expect(pause).toHaveBeenCalled()
    expect(screen.getByTestId('clip-play-1')).toHaveAttribute('aria-pressed', 'false')
    seek(video, 150.1)
    expect(video.currentTime).toBe(150.1)
  })

  it('shares the exported clips through the macOS share menu, so they reach Photos or AirDrop in one click', async () => {
    vi.mocked(api.exportClips).mockResolvedValue({ ok: true, files: ['/Movies/Cuts/x/x-1.mp4', '/Movies/Cuts/x/x-2.mp4'] })
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    await act(() => userEvent.click(screen.getByTestId('export')))
    await userEvent.click(screen.getByTestId('export'))
    expect(api.share).toHaveBeenCalledWith(['/Movies/Cuts/x/x-1.mp4', '/Movies/Cuts/x/x-2.mp4'])
  })

  it('shows the progress inside the export button, so the panel never changes height while exporting', async () => {
    let report: (progress: { index: number; ratio: number }) => void = () => {}
    vi.mocked(api.onExportProgress).mockImplementation((callback) => {
      report = callback
      return () => {}
    })
    vi.mocked(api.exportClips).mockReturnValue(new Promise(() => {}))
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await markClip(video, 200, 250)
    const status = screen.getByTestId('export-status')
    await userEvent.click(screen.getByTestId('export'))
    act(() => report({ index: 0, ratio: 1 }))
    const button = screen.getByTestId('export')
    expect(button).toHaveTextContent('Exporting 2 of 2')
    expect(button).toContainElement(screen.getByTestId('export-progress'))
    expect(screen.getByTestId('export-progress')).toHaveStyle({ width: '50%' })
    expect(screen.getByTestId('export-status')).toBe(status)
    expect(status).toContainElement(screen.getByTestId('export-cancel'))
  })

  it('turns the export button into Share once the clips are ready, because sending them to the phone is the next step', async () => {
    vi.mocked(api.exportClips).mockResolvedValue({ ok: true, files: ['/Movies/Cuts/x/x-1.mp4'] })
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(screen.getByTestId('export')).toHaveTextContent(t.share)
    expect(screen.getByTestId('export-status')).toHaveTextContent(t.exportedClips(1))
    await userEvent.click(screen.getByTestId('export'))
    expect(api.share).toHaveBeenCalledWith(['/Movies/Cuts/x/x-1.mp4'])
    expect(api.exportClips).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByTestId('reveal'))
    expect(api.reveal).toHaveBeenCalledWith('/Movies/Cuts/x/x-1.mp4')
  })

  it('opens the folder with the clips instead of sharing them on Windows and Linux, which have no share menu', async () => {
    api.platform = 'win32'
    vi.mocked(api.exportClips).mockResolvedValue({ ok: true, files: ['C:\\Videos\\Cuts\\x\\x-1.mp4'] })
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(screen.getByTestId('export')).toHaveTextContent(t.showInFolder)
    expect(screen.queryByTestId('reveal')).toBeNull()
    await userEvent.click(screen.getByTestId('export'))
    expect(api.reveal).toHaveBeenCalledWith('C:\\Videos\\Cuts\\x\\x-1.mp4')
    expect(api.share).not.toHaveBeenCalled()
  })

  it('draws its own title bar only on macOS, where the window controls sit inside it', async () => {
    render(<App />)
    await loadVideo()
    expect(screen.getByTestId('titlebar')).toHaveTextContent('2026-10-22 22-33-13.mov')
  })

  it('names the window after the video on Windows and Linux, whose native title bar shows it', async () => {
    api.platform = 'linux'
    vi.mocked(api.openVideo).mockResolvedValue('C:\\Users\\vicent\\Videos\\set.mov')
    render(<App />)
    await loadVideo()
    expect(screen.queryByTestId('titlebar')).toBeNull()
    expect(document.title).toBe('set.mov')
  })

  it('offers Export again after any change, so shared files always match what is on screen', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(screen.getByTestId('export')).toHaveTextContent(t.share)
    await userEvent.selectOptions(screen.getByTestId('format'), '4:5')
    expect(screen.getByTestId('export')).toHaveTextContent('Export 1 clip')
  })

  it('offers Export again when something changed while exporting, so a share never sends outdated clips', async () => {
    let finish: (result: ExportResult) => void = () => {}
    vi.mocked(api.exportClips).mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 100, 150)
    await userEvent.click(screen.getByTestId('export'))
    await userEvent.selectOptions(screen.getByTestId('format'), '4:5')
    await act(async () => finish({ ok: true, files: ['/Movies/Cuts/x/x-1.mp4'] }))
    expect(screen.getByTestId('export')).toHaveTextContent('Export 1 clip')
  })
})
