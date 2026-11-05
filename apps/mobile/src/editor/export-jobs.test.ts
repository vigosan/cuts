import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { exportJobs, exportOverlay } from './export-jobs'

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
