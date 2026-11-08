import type { Clip } from '@cuts/core/clips'
import type { ClipSettings } from '@cuts/core/fades'
import type { ClipFraming } from '@cuts/core/framing'
import type { OutputFormat } from '@cuts/core/formats'
import type { ExportOverlay, Size } from '@cuts/core/overlay'

export type ExportClip = Clip & ClipSettings & { position: number }

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
  overlay: ExportOverlay | null
  kind: 'clips' | 'full'
  background: ExportBackground | null
  extras: AudioExtras
  frame: Size
}

export type FrameRequest = ClipFraming & {
  input: string
  folder: string
  baseName: string
  format: OutputFormat
  time: number
  overlay: ExportOverlay | null
  background: ExportBackground | null
}

export type ExportResult = { ok: true; files: string[] } | { ok: false; error: string }

export type ExportProgress = { index: number; ratio: number }

export type RecentVideo = { path: string; name: string; folder: string; openedAt: number; clips: number; poster: string | null }

export type ImportedOverlay = { path: string; aspect: number; name: string }

export type BackgroundKind = 'video' | 'image'

export type ImportedBackground = { path: string; kind: BackgroundKind; name: string }

export type ExportBackground = { path: string; kind: BackgroundKind }

export type AudioExtras = { waveform: boolean; progressBar: boolean; color: string; opacity: number }

export const WAVE_OPACITIES = [0.1, 0.3, 0.5, 0.8, 1]

export type Api = {
  platform: NodeJS.Platform
  pathForFile(file: File): string
  openVideo(): Promise<string | null>
  chooseOverlay(): Promise<ImportedOverlay | 'invalid' | null>
  importOverlayFile(file: File): Promise<ImportedOverlay | 'invalid'>
  chooseBackground(): Promise<ImportedBackground | 'invalid' | 'too-big' | null>
  importBackgroundFile(file: File): Promise<ImportedBackground | 'invalid' | 'too-big'>
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
  recentVideos(): Promise<RecentVideo[]>
  openRecent(path: string): Promise<string | null>
}
