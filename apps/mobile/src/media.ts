import type { AudioFade, VideoFade } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import type { Framing } from '@cuts/core/framing'
import type { ExportOverlay } from '@cuts/core/overlay'
import CutsMedia, { type NativeAsset, type NativeAudioFields, type NativeBackground, type NativeOverlayFields } from '../modules/cuts-media'

export type AssetInfo = NativeAsset

export type Background = NativeBackground

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
  overlay?: ExportOverlay
  background?: { path: string; kind: 'video' | 'image' }
  wave?: ExportLayer
  bar?: ExportLayer
  bitrate?: number
}

export type ExportLayer = { x: number; y: number; width: number; color: string; opacity: number }

export type FrameJob = { format: OutputFormat; framing: Framing; cropX: number; cropY: number; overlay?: ExportOverlay }

export const overlayUri = (path: string) => (path.includes('/') ? path : CutsMedia.overlayDir + path)

export const backgroundUri = (path: string) => (path.includes('/') ? path : CutsMedia.backgroundDir + path)

function withOverlay<T extends { overlay?: ExportOverlay }>({ overlay, ...job }: T): Omit<T, 'overlay'> & NativeOverlayFields {
  if (!overlay) return job
  return { ...job, overlayPath: overlayUri(overlay.path), overlayX: overlay.x, overlayY: overlay.y, overlayWidth: overlay.width }
}

function withAudio({ background, wave, bar, ...job }: ExportJob): Omit<ExportJob, 'background' | 'wave' | 'bar'> & NativeAudioFields {
  return {
    ...job,
    ...(background && { backgroundPath: backgroundUri(background.path), backgroundKind: background.kind }),
    ...(wave && { waveX: wave.x, waveY: wave.y, waveWidth: wave.width, waveColor: wave.color, waveOpacity: wave.opacity }),
    ...(bar && { barX: bar.x, barY: bar.y, barWidth: bar.width, barColor: bar.color, barOpacity: bar.opacity })
  }
}

export const requestLibraryAccess = () => CutsMedia.requestLibraryAccess()

export const pickVideo = () => CutsMedia.pickVideo()

export const pickFile = () => CutsMedia.pickFile()

export const pickAudio = () => CutsMedia.pickAudio()

export const pickOverlay = (source: 'files' | 'photos') => CutsMedia.pickOverlay(source)

export const pickBackground = (source: 'files' | 'photos') => CutsMedia.pickBackground(source)

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
    return await CutsMedia.exportClip(id, withOverlay(withAudio(job)))
  } finally {
    subscription.remove()
  }
}

export const cancelExport = () => CutsMedia.cancelExport()

export const saveToCutsAlbum = (uris: string[]) => CutsMedia.saveToCutsAlbum(uris)

export const saveFrame = (id: string, time: number, job: FrameJob) => CutsMedia.saveFrame(id, time, withOverlay(job))
