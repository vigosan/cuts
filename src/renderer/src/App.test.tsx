import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '@shared/api'
import { App } from './App'
import { t } from './i18n'

const VIDEO = '/Users/vicent/Movies/2026-10-22 22-33-13.mov'

function makeApi(): Api {
  return {
    pathForFile: vi.fn(() => VIDEO),
    openVideo: vi.fn(async () => VIDEO),
    chooseFolder: vi.fn(async () => '/Users/vicent/Movies/Instagram'),
    moviesDir: vi.fn(async () => '/Users/vicent/Movies'),
    exportClips: vi.fn(async () => ({ ok: true as const, files: ['/Users/vicent/Movies/Instagram/x-1.mp4'] })),
    onExportProgress: vi.fn(() => () => {}),
    reveal: vi.fn(),
    thumbnail: vi.fn(async (_path: string, time: number) => `data:image/jpeg;base64,${time}`),
    waveform: vi.fn(async () => new Float32Array(4880 * 50).fill(0.5)),
    onMenuOpenVideo: vi.fn((callback: () => void) => {
      menuOpenVideo = callback
      return () => {}
    })
  }
}

let api: Api
let menuOpenVideo: () => void

beforeEach(() => {
  api = makeApi()
  Object.assign(window, { api })
})

async function loadVideo() {
  await userEvent.click(screen.getByTestId('open-video'))
  const video = screen.getByTestId('video') as HTMLVideoElement
  Object.defineProperty(video, 'duration', { configurable: true, value: 4880 })
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
    expect(screen.getByTestId('clip-row-2')).toHaveAttribute('aria-selected', 'true')
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
    expect(screen.getByTestId('clip-row-2')).toHaveAttribute('aria-selected', 'false')
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
    seek(video, 473)
    await userEvent.click(screen.getByTestId('clip-set-end-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:06:59')
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
    expect(screen.getByTestId('clip-block-2')).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('clip-block-1')).toHaveAttribute('aria-selected', 'false')
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
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('aria-selected', 'true')
    expect(video.currentTime).toBe(120)
  })

  it('opens another video from the File menu, so the title bar stays clean', async () => {
    render(<App />)
    await loadVideo()
    vi.mocked(api.openVideo).mockClear()
    await act(async () => menuOpenVideo())
    expect(api.openVideo).toHaveBeenCalled()
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
})
