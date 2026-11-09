import { describe, expect, it } from 'vitest'
import { DEFAULT_EXTRAS, defaultBarPlacement, defaultWavePlacement } from '@cuts/core/audio-layers'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { audioExport, exportJobs, exportOverlay, fullJob, sourceSize } from './export-jobs'

const clips = [1, 2, 3, 4].map((n) => ({ id: `c${n}`, start: n * 100, end: n * 100 + 59 }))
const settings = () => DEFAULT_SETTINGS

describe('exportJobs', () => {
  it('only the first clip skips the image fade-in, so the carousel cover is a real frame', () => {
    expect(exportJobs(clips, settings, '4:5', 'set').map((j) => j.videoFadeIn)).toEqual([false, true, true, true])
  })

  it('numbering follows list position so the carousel order survives in Photos', () => {
    expect(exportJobs(clips, settings, '4:5', 'set').map((j) => j.fileName)).toEqual(['set-1.mp4', 'set-2.mp4', 'set-3.mp4', 'set-4.mp4'])
  })

  it('the base name is made safe for a file', () => {
    expect(exportJobs(clips.slice(0, 1), settings, 'original', 'a/b:c')[0].fileName).toBe('a-b-c-1.mp4')
  })

  it('carries the clip times, format and settings to the exporter', () => {
    expect(exportJobs(clips.slice(0, 1), settings, '9:16', 'set')[0]).toEqual({
      ...DEFAULT_SETTINGS, start: 100, end: 159, format: '9:16', videoFadeIn: false, fileName: 'set-1.mp4', position: 0
    })
  })
})

const overlay = { path: 'file:///overlays/overlay-1.png', aspect: 1, name: 'logo.png', x: 0.9, y: 0.9, width: 0.25 }
const video = { width: 1920, height: 1080 }

describe('exportOverlay', () => {
  it('clamps to the output frame of the format, so a logo placed for 9:16 stays inside a 1:1 clip', () => {
    const placed = { ...overlay, x: 0.7, y: 0.85, width: 0.25 }
    expect(exportOverlay(placed, '1:1', video)).toEqual({ path: placed.path, x: 0.7, y: 0.75, width: 0.25 })
  })

  it('in Original the output frame is the video itself', () => {
    expect(exportOverlay({ ...overlay, x: 0.1, y: 0.9 }, 'original', video)).toEqual({ path: overlay.path, x: 0.1, y: 1 - (0.25 * 1920) / 1080, width: 0.25 })
  })

  it('no overlay sends nothing, so exports stay exactly as before', () => {
    expect(exportOverlay(null, '4:5', video)).toBeUndefined()
  })
})

describe('exportJobs with an overlay', () => {
  it('every clip carries the same overlay', () => {
    const sent = { path: overlay.path, x: 0.1, y: 0.1, width: 0.25 }
    expect(exportJobs(clips, settings, '4:5', 'set', undefined, sent).map((job) => job.overlay)).toEqual([sent, sent, sent, sent])
  })

  it('without one the jobs have no overlay field at all', () => {
    expect(exportJobs(clips, settings, '4:5', 'set')[0]).not.toHaveProperty('overlay')
  })
})

const background = { path: 'background-1.mp4', kind: 'video' as const, name: 'loop.mp4', width: 1920, height: 1080 }
const recording = { id: 'file:set.wav', name: 'set.wav', duration: 600, width: 0, height: 0, frameRate: 30, uri: 'file:///set.wav', kind: 'audio' as const }
const film = { ...recording, id: 'A1', name: 'set.mov', width: 1920, height: 1080, kind: 'video' as const }
const frame = { width: 1920, height: 1080 }

describe('audio exports', () => {
  it('carry the background and a lighter bitrate, since a still or looping picture needs far less than a filmed set', () => {
    const audio = audioExport(recording, background, DEFAULT_EXTRAS, '16:9')
    const [job] = exportJobs(clips.slice(0, 1), settings, '16:9', 'set', undefined, undefined, audio)
    expect(job.background).toEqual({ path: 'background-1.mp4', kind: 'video' })
    expect(job.bitrate).toBe(4_000_000)
  })

  it('layers that are off are not sent, so the export draws only what the preview shows', () => {
    const [job] = exportJobs(clips.slice(0, 1), settings, '16:9', 'set', undefined, undefined, audioExport(recording, background, DEFAULT_EXTRAS, '16:9'))
    expect(job.wave).toBeUndefined()
    expect(job.bar).toBeUndefined()
  })

  it('a waveform never placed goes where the Mac puts it, with its colour and opacity', () => {
    const extras = { ...DEFAULT_EXTRAS, waveform: true, progressBar: true, color: '#ff0000', opacity: 0.5, barColor: '#00ff00' }
    const [job] = exportJobs(clips.slice(0, 1), settings, '16:9', 'set', undefined, undefined, audioExport(recording, background, extras, '16:9'))
    expect(job.wave).toEqual({ ...defaultWavePlacement(frame), color: '#ff0000', opacity: 0.5 })
    expect(job.bar).toEqual({ ...defaultBarPlacement(frame), color: '#00ff00', opacity: 0.8 })
  })

  it('a waveform dragged past the edge is pulled back inside the clip', () => {
    const extras = { ...DEFAULT_EXTRAS, waveform: true, wave: { x: 0.9, y: 0.5, width: 0.5 } }
    const [job] = exportJobs(clips.slice(0, 1), settings, '16:9', 'set', undefined, undefined, audioExport(recording, background, extras, '16:9'))
    expect(job.wave?.x).toBeCloseTo(0.5)
  })

  it('a video never gets a background or layers, even when they are on for audio recordings', () => {
    expect(audioExport(film, background, { ...DEFAULT_EXTRAS, waveform: true }, '16:9')).toBeUndefined()
  })

  it('an audio recording without a background has nothing to export yet', () => {
    expect(audioExport(recording, null, DEFAULT_EXTRAS, '16:9')).toBeUndefined()
  })

  it('an audio recording is framed by its background, so Original keeps the picture size', () => {
    expect(sourceSize(recording, background)).toEqual({ width: 1920, height: 1080 })
    expect(sourceSize(film, background)).toEqual({ width: 1920, height: 1080 })
    expect(sourceSize({ ...recording }, { ...background, width: 1080, height: 1350 })).toEqual({ width: 1080, height: 1350 })
  })
})

describe('fullJob', () => {
  it('exports the whole recording as one file named -full, fading in like a single clip', () => {
    const job = fullJob(600, DEFAULT_SETTINGS, '16:9', 'set')
    expect(job).toMatchObject({ start: 0, end: 600, fileName: 'set-full.mp4', videoFadeIn: true, position: 0 })
    expect(job).not.toHaveProperty('bitrate')
  })

  it('a full audio recording carries its background and layers too', () => {
    const job = fullJob(600, DEFAULT_SETTINGS, '16:9', 'set', undefined, audioExport(recording, background, DEFAULT_EXTRAS, '16:9'))
    expect(job.background).toEqual({ path: 'background-1.mp4', kind: 'video' })
    expect(job.bitrate).toBe(4_000_000)
  })
})
