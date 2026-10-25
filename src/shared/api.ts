import type { Clip } from './clips'
import type { ClipSettings } from './fades'
import type { OutputFormat } from './formats'

export type ExportClip = Clip & ClipSettings

export type Session = {
  clips: Clip[]
  clipSettings: Record<string, ClipSettings>
  defaultSettings: ClipSettings
  format: OutputFormat
  baseName: string
}

export type ExportRequest = {
  input: string
  folder: string
  baseName: string
  format: OutputFormat
  clips: ExportClip[]
}

export type ExportResult = { ok: true; files: string[] } | { ok: false; error: string }

export type ExportProgress = { index: number; ratio: number }

export type Api = {
  pathForFile(file: File): string
  openVideo(): Promise<string | null>
  chooseFolder(current: string | null): Promise<string | null>
  moviesDir(): Promise<string>
  exportClips(request: ExportRequest): Promise<ExportResult>
  onExportProgress(callback: (progress: ExportProgress) => void): () => void
  reveal(path: string): void
  cancelExport(): void
  onMenuOpenVideo(callback: () => void): () => void
  onMenuCommand(callback: (command: 'undo' | 'redo') => void): () => void
  thumbnail(path: string, time: number): Promise<string>
  loadSession(videoPath: string): Promise<Session | null>
  saveSession(videoPath: string, session: Session): void
  waveform(path: string): Promise<Float32Array>
  frameRate(path: string): Promise<number>
}
