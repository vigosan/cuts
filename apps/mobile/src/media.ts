import type { AudioFade, VideoFade } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { Framing } from '@cuts/core/framing'
import CutsMedia, { type NativeAsset } from '../modules/cuts-media'

export type AssetInfo = NativeAsset

export type ExportJob = {
  start: number
  end: number
  format: OutputFormat
  framing: Framing
  cropX: number
  cropY: number
  videoFade: VideoFade
  audioFade: AudioFade
  fadeSeconds: number
  videoFadeIn: boolean
  fileName: string
  position: number
}

export type FrameJob = { format: OutputFormat; framing: Framing; cropX: number; cropY: number }

export const requestLibraryAccess = () => CutsMedia.requestLibraryAccess()

export const pickVideo = () => CutsMedia.pickVideo()

export const pickFile = () => CutsMedia.pickFile()

export async function openAsset(id: string, onDownload: (ratio: number) => void): Promise<AssetInfo> {
  const subscription = CutsMedia.addListener('onDownload', (event) => event.id === id && onDownload(event.ratio))
  try {
    return await CutsMedia.openAsset(id)
  } finally {
    subscription.remove()
  }
}

export const cancelOpen = (id: string) => CutsMedia.cancelOpen(id)

export const poster = (id: string, height: number) => CutsMedia.poster(id, height)

export async function readPeaks(id: string): Promise<Float32Array | null> {
  const peaks = await CutsMedia.readPeaks(id)
  return peaks ? Float32Array.from(peaks) : null
}

export const thumbnail = (id: string, time: number, height: number) => CutsMedia.thumbnail(id, time, height)

export async function exportClip(id: string, job: ExportJob, onProgress: (ratio: number) => void): Promise<string> {
  const subscription = CutsMedia.addListener('onExportProgress', (event) => onProgress(event.ratio))
  try {
    return await CutsMedia.exportClip(id, job)
  } finally {
    subscription.remove()
  }
}

export const cancelExport = () => CutsMedia.cancelExport()

export const saveToCutsAlbum = (uris: string[]) => CutsMedia.saveToCutsAlbum(uris)

export const saveFrame = (id: string, time: number, job: FrameJob) => CutsMedia.saveFrame(id, time, job)
