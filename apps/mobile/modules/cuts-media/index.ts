import { NativeModule, requireNativeModule } from 'expo'

type Events = {
  onDownload(event: { id: string; ratio: number }): void
  onExportProgress(event: { ratio: number }): void
}

export type NativeAsset = { id: string; name: string; duration: number; width: number; height: number; uri: string }

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
}

export type NativeFrameJob = { format: string; framing: string; cropX: number; cropY: number }

declare class CutsMediaModule extends NativeModule<Events> {
  requestLibraryAccess(): Promise<'granted' | 'limited' | 'denied'>
  pickVideo(): Promise<string | null>
  openAsset(id: string): Promise<NativeAsset>
  readPeaks(id: string): Promise<number[] | null>
  thumbnail(id: string, time: number, height: number): Promise<string>
  exportClip(id: string, job: NativeJob): Promise<string>
  cancelExport(): void
  saveToCutsAlbum(uris: string[]): Promise<void>
  saveFrame(id: string, time: number, job: NativeFrameJob): Promise<void>
}

export default requireNativeModule<CutsMediaModule>('CutsMedia')
