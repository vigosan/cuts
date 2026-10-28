import type { Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { ClipFraming } from '@cuts/core/framing'
import type { OutputFormat } from '@cuts/core/formats'

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

export type FrameRequest = ClipFraming & {
  input: string
  folder: string
  baseName: string
  format: OutputFormat
  time: number
}

export type ExportResult = { ok: true; files: string[] } | { ok: false; error: string }

export type ExportProgress = { index: number; ratio: number }

export type Api = {
  platform: NodeJS.Platform
  pathForFile(file: File): string
  openVideo(): Promise<string | null>
  chooseFolder(current: string | null): Promise<string | null>
  moviesDir(): Promise<string>
  exportClips(request: ExportRequest): Promise<ExportResult>
  exportFrame(request: FrameRequest): Promise<ExportResult>
  onExportProgress(callback: (progress: ExportProgress) => void): () => void
  reveal(path: string): void
  cancelExport(): void
  share(files: string[]): void
  onMenuOpenVideo(callback: () => void): () => void
  onOpenPath(callback: (path: string) => void): () => void
  onMenuExportFrame(callback: () => void): () => void
  onMenuShortcuts(callback: () => void): () => void
  onMenuCommand(callback: (command: 'undo' | 'redo') => void): () => void
  onUpdateReady(callback: (version: string) => void): () => void
  restartToUpdate(): void
  thumbnail(path: string, time: number): Promise<string>
  loadSession(videoPath: string): Promise<Session | null>
  saveSession(videoPath: string, session: Session): void
  waveform(path: string): Promise<Float32Array>
  frameRate(path: string): Promise<number>
}
