import { NativeModule, requireNativeModule } from 'expo'

type Events = {
  onDownload(event: { id: string; ratio: number }): void
  onExportProgress(event: { ratio: number }): void
}

export type NativeAsset = { id: string; name: string; duration: number; width: number; height: number; frameRate: number; uri: string }

export type NativeJob = {
  start: number
  end: number
  format: string
  framing: string
  cropX: number
  cropY: number
  videoFade: string
  audioFade: string
  fadeSeconds: number
  videoFadeIn: boolean
  fileName: string
} & NativeOverlayFields

export type NativeOverlayFields = { overlayPath?: string; overlayX?: number; overlayY?: number; overlayWidth?: number }

export type NativeFrameJob = { format: string; framing: string; cropX: number; cropY: number } & NativeOverlayFields

export type NativeOverlay = { path: string; aspect: number; name: string }

declare class CutsMediaModule extends NativeModule<Events> {
  requestLibraryAccess(): Promise<'granted' | 'limited' | 'denied'>
  pickVideo(): Promise<string | null>
  pickFile(): Promise<string | null>
  pickOverlay(source: 'files' | 'photos'): Promise<NativeOverlay | 'invalid' | null>
  openAsset(id: string): Promise<NativeAsset>
  cancelOpen(id: string): void
  poster(id: string, height: number): Promise<string>
  readPeaks(id: string): Promise<number[] | null>
  thumbnail(id: string, time: number, height: number): Promise<string>
  exportClip(id: string, job: NativeJob): Promise<string>
  cancelExport(): void
  saveToCutsAlbum(uris: string[]): Promise<void>
  saveFrame(id: string, time: number, job: NativeFrameJob): Promise<void>
}

export default requireNativeModule<CutsMediaModule>('CutsMedia')
