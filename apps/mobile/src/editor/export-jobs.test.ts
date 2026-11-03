import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import { exportJobs } from './export-jobs'

const clips = [1, 2, 3, 4].map((n) => ({ id: `c${n}`, start: n * 100, end: n * 100 + 59 }))
const settings = () => DEFAULT_SETTINGS

describe('exportJobs', () => {
  it('only the first clip in the list skips the image fade-in, even when exporting a subset', () => {
    expect(exportJobs(clips, null, settings, '4:5', 'set').map((j) => j.videoFadeIn)).toEqual([false, true, true, true])
    expect(exportJobs(clips, ['c2', 'c3'], settings, '4:5', 'set').map((j) => j.videoFadeIn)).toEqual([true, true])
  })

  it('numbering follows list position so the carousel order survives a partial export', () => {
    expect(exportJobs(clips, ['c4', 'c2'], settings, '4:5', 'set').map((j) => j.fileName)).toEqual(['set-2.mp4', 'set-4.mp4'])
  })

  it('the base name is made safe for a file', () => {
    expect(exportJobs(clips.slice(0, 1), null, settings, 'original', 'a/b:c')[0].fileName).toBe('a-b-c-1.mp4')
  })

  it('carries the clip times, format and settings to the exporter', () => {
    expect(exportJobs(clips.slice(0, 1), null, settings, '9:16', 'set')[0]).toEqual({
      ...DEFAULT_SETTINGS, start: 100, end: 159, format: '9:16', videoFadeIn: false, fileName: 'set-1.mp4', position: 0
    })
  })
})
