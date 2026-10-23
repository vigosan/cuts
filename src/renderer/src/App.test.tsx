import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Api } from '@shared/api'
import { App } from './App'

const VIDEO = '/Users/vicent/Movies/2026-10-22 22-33-13.mov'

function makeApi(): Api {
  return {
    pathForFile: vi.fn(() => VIDEO),
    openVideo: vi.fn(async () => VIDEO),
    chooseFolder: vi.fn(async () => '/Users/vicent/Movies/Instagram'),
    exportClips: vi.fn(async () => ({ ok: true as const, files: ['/Users/vicent/Movies/Instagram/x-1.mp4'] })),
    onExportProgress: vi.fn(() => () => {}),
    reveal: vi.fn()
  }
}

let api: Api

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
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('no vale para carrusel')
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
    expect(screen.getByTestId('fade')).toBeChecked()
    await act(() => userEvent.click(screen.getByTestId('export')))
    expect(api.exportClips).toHaveBeenCalledWith({
      input: VIDEO,
      folder: '/Users/vicent/Movies/Instagram',
      baseName: 'sesion-22-oct',
      fade: true,
      format: '4:5',
      clips: [expect.objectContaining({ start: 600, end: 650 }), expect.objectContaining({ start: 100, end: 140 })]
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

  it('keeps space as play/pause after clicking the fade checkbox, so shortcuts never silently change export settings', async () => {
    render(<App />)
    const video = await loadVideo()
    const play = vi.fn(async () => {})
    Object.assign(video, { play })
    await userEvent.click(screen.getByTestId('fade'))
    await userEvent.click(screen.getByTestId('fade'))
    await userEvent.keyboard(' ')
    expect(screen.getByTestId('fade')).toBeChecked()
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
    seek(video, 473)
    expect(screen.getByTestId('clip-set-end-1')).toHaveTextContent('Fin = 00:07:53')
    await userEvent.click(screen.getByTestId('clip-set-end-1'))
    expect(screen.getByTestId('clip-row-1')).toHaveTextContent('00:07:53')
  })

  it('disables an adjustment that would put the start after the end, instead of silently ignoring the click', async () => {
    render(<App />)
    const video = await loadVideo()
    await markClip(video, 383, 419)
    seek(video, 473)
    expect(screen.getByTestId('clip-set-start-1')).toHaveTextContent('Inicio = 00:07:53')
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
})
