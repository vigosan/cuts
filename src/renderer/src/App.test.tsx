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

  it('flags a clip over 59 s and blocks export so Instagram never rejects an upload', async () => {
    render(<App />)
    const video = await loadVideo()
    await userEvent.click(screen.getByTestId('choose-folder'))
    await markClip(video, 10, 70)
    expect(screen.getByTestId('clip-row-1')).toHaveAttribute('data-over-limit', 'true')
    expect(screen.getByTestId('export')).toBeDisabled()
    await userEvent.click(screen.getByTestId('clip-delete-1'))
    await markClip(video, 10, 69)
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
})
