import { MAX_CLIP_SECONDS, outputFileName, safeBaseName } from '@cuts/core/clips'
import { t } from '../i18n'
import { field } from './field'
import { FolderIcon, StopIcon } from './icons'

export type ExportState =
  | { status: 'idle' }
  | { status: 'running'; progress: number[] }
  | { status: 'done'; files: string[] }
  | { status: 'error'; error: string }

type Props = {
  positions: number[]
  partial: boolean
  overLimit: number
  canExport: boolean
  baseName: string
  folder: string | null
  destination: string | null
  state: ExportState
  onBaseName: (value: string) => void
  onChooseFolder: () => void
  onExport: () => void
  onCancel: () => void
  onReveal: (path: string) => void
  onShare: (files: string[]) => void
  canShare: boolean
}

function exportProgress(state: ExportState): { overall: number; finished: number } {
  if (state.status !== 'running') return { overall: 0, finished: 0 }
  return {
    overall: state.progress.reduce((a, b) => a + b, 0) / Math.max(1, state.progress.length),
    finished: state.progress.filter((r) => r >= 1).length
  }
}

function exportLabel(positions: number[], partial: boolean): string {
  if (!partial) return t.exportClips(positions.length)
  return positions.length === 1 ? t.exportClip(positions[0] + 1) : t.exportSelected(positions.length)
}

function runningLabel(progress: number[]): string {
  const finished = progress.filter((ratio) => ratio >= 1).length
  return t.exportingClip(Math.min(finished + 1, progress.length), progress.length)
}

export function ExportPanel(p: Props) {
  const folderName = p.folder?.split(/[\\/]/).filter(Boolean).slice(-2).join('/')
  const fileName = (index: number) => outputFileName(safeBaseName(p.baseName), index)

  return (
    <section data-testid="export-panel" className="flex flex-col gap-3 border-t border-line p-4">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label htmlFor="base-name" className="text-ink-2">
          {t.name}
        </label>
        <input
          id="base-name"
          data-testid="base-name"
          className={field}
          value={p.baseName}
          placeholder={t.fileNamePlaceholder}
          onChange={(e) => p.onBaseName(e.target.value)}
        />
        <span className="text-ink-2">{t.folder}</span>
        <button
          data-testid="choose-folder"
          className={`${field} flex items-center gap-2 text-left`}
          title={p.folder ?? t.chooseFolder}
          onClick={p.onChooseFolder}
        >
          <FolderIcon className="size-4 text-ink-3" />
          <span className={`truncate ${folderName ? '' : 'text-ink-3'}`}>{folderName ?? t.choose}</span>
        </button>
      </div>

      {p.overLimit > 0 && (
        <p data-testid="over-limit-summary" className="flex items-center gap-1.5 text-xs text-warn">
          <span className="size-1.5 shrink-0 rounded-full bg-warn" />
          {t.clipsOverLimit(p.overLimit, MAX_CLIP_SECONDS)}
        </p>
      )}

      <div className="flex gap-2">
        {p.state.status === 'done' && p.canShare && (
          <button
            data-testid="reveal"
            className="h-10 flex-1 rounded-xl bg-sunken text-sm font-medium text-ink transition duration-150 ease-out active:scale-[0.97] hover:bg-accent-soft hover:text-accent"
            onClick={() => p.state.status === 'done' && p.onReveal(p.state.files[0])}
          >
            {t.showInFinder}
          </button>
        )}
        <button
          data-testid="export"
          aria-label={p.state.status === 'running' ? `${t.stopExport} (${runningLabel(p.state.progress)})` : undefined}
          className="group relative h-10 flex-1 overflow-hidden rounded-xl bg-accent text-sm font-medium text-on-accent transition duration-150 ease-out active:scale-[0.97] hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3"
          disabled={!p.canExport && p.state.status !== 'running'}
          onClick={() =>
            p.state.status === 'running'
              ? p.onCancel()
              : p.state.status === 'done'
                ? p.canShare
                  ? p.onShare(p.state.files)
                  : p.onReveal(p.state.files[0])
                : p.onExport()
          }
        >
          {p.state.status === 'running' ? (
            <>
              <span
                data-testid="export-progress"
                className="absolute inset-0 origin-left bg-on-accent/20 transition-transform group-hover:opacity-0 group-focus-visible:opacity-0"
                style={{ transform: `scaleX(${exportProgress(p.state).overall})` }}
              />
              <span className="relative grid">
                <span className="col-start-1 row-start-1 group-hover:invisible group-focus-visible:invisible">
                  {runningLabel(p.state.progress)}
                </span>
                <span
                  data-testid="export-stop-label"
                  className="invisible col-start-1 row-start-1 flex items-center justify-center gap-1.5 group-hover:visible group-focus-visible:visible"
                >
                  <StopIcon data-testid="export-stop-icon" />
                  {t.stopExport}
                </span>
              </span>
            </>
          ) : (
            <span className="relative">
              {p.state.status === 'done' ? (p.canShare ? t.share : t.showInFolder) : exportLabel(p.positions, p.partial)}
            </span>
          )}
        </button>
      </div>

      <p data-testid="export-status" className={`min-h-4 text-center text-xs leading-4 text-ink-3 ${p.state.status === 'error' ? '' : 'h-4 truncate'}`}>
        {p.state.status === 'done' && (
          <span data-testid="export-done" className="text-ok">
            {t.exportedClips(p.state.files.length)}
          </span>
        )}
        {p.state.status === 'error' && (
          <span data-testid="export-error" className="text-warn [overflow-wrap:anywhere]" title={p.state.error}>
            {p.state.error}
          </span>
        )}
        {p.state.status === 'idle' && p.baseName && p.positions.length > 0 && p.destination && (
          <span data-testid="export-preview" title={`${p.destination}/${fileName(p.positions[0])}`}>
            {p.partial
              ? p.positions.map(fileName).join(', ')
              : `${fileName(0)}${p.positions.length > 1 ? ` … ${fileName(p.positions.length - 1)}` : ''}`}
          </span>
        )}
      </p>
    </section>
  )
}
