import type { Clip } from './clips'
import type { AudioFade, VideoFade } from './fades'
import type { OutputFormat } from './formats'

export type ExportRequest = {
  input: string
  folder: string
  baseName: string
  videoFade: VideoFade
  audioFade: AudioFade
  fadeSeconds: number
  format: OutputFormat
  clips: Clip[]
}

export type ExportResult = { ok: true; files: string[] } | { ok: false; error: string }

export type ExportProgress = { index: number; ratio: number }

export type Api = {
  pathForFile(file: File): string
  openVideo(): Promise<string | null>
  chooseFolder(): Promise<string | null>
  exportClips(request: ExportRequest): Promise<ExportResult>
  onExportProgress(callback: (progress: ExportProgress) => void): () => void
  reveal(path: string): void
}
