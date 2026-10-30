import { outputFileName, safeBaseName } from '@cuts/core/clips'
import { FORMATS, type OutputFormat } from '@cuts/core/formats'
import { t } from '../i18n'
import { field } from './field'
import { FolderIcon } from './icons'

export type ExportState =
  | { status: 'idle' }
  | { status: 'running'; progress: number[] }
  | { status: 'done'; files: string[] }
  | { status: 'error'; error: string }

type Props = {
  positions: number[]
  partial: boolean
  canExport: boolean
  baseName: string
  folder: string | null
  destination: string | null
  format: OutputFormat
  state: ExportState
  onBaseName: (value: string) => void
  onChooseFolder: () => void
  onFormat: (value: OutputFormat) => void
  onExport: () => void
  onReveal: (path: string) => void
  onCancel: () => void
  onShare: (files: string[]) => void
  canShare: boolean
}

export function ExportPanel(p: Props) {
  const running = p.state.status === 'running'
  const overall =
    p.state.status === 'running'
      ? p.state.progress.reduce((a, b) => a + b, 0) / Math.max(1, p.state.progress.length)
      : 0
  const finished = p.state.status === 'running' ? p.state.progress.filter((r) => r >= 1).length : 0
  const folderName = p.folder?.split(/[\\/]/).filter(Boolean).slice(-2).join('/')
  const fileName = (index: number) => outputFileName(safeBaseName(p.baseName), index)

  return (
    <section className="flex flex-col gap-3 border-t border-line p-4">
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
        <label htmlFor="format" className="text-ink-2">
          {t.format}
        </label>
        <select
          id="format"
          data-testid="format"
          className={field}
          value={p.format}
          onChange={(e) => p.onFormat(e.target.value as OutputFormat)}
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {t.formats[f.id]}
            </option>
          ))}
        </select>
      </div>

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
          className={`relative h-10 flex-1 overflow-hidden rounded-xl bg-accent text-sm font-medium text-on-accent transition duration-150 ease-out active:scale-[0.97] ${running ? 'cursor-default' : 'hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3'}`}
          disabled={!p.canExport || running}
          onClick={() => (p.state.status === 'done' ? (p.canShare ? p.onShare(p.state.files) : p.onReveal(p.state.files[0])) : p.onExport())}
        >
          {running && (
            <span
              data-testid="export-progress"
              className="absolute inset-0 origin-left bg-on-accent/20 transition-transform"
              style={{ transform: `scaleX(${overall})` }}
            />
          )}
          <span className="relative">
            {p.state.status === 'running'
              ? t.exportingClip(Math.min(finished + 1, p.state.progress.length), p.state.progress.length)
              : p.state.status === 'done'
                ? p.canShare
                  ? t.share
                  : t.showInFolder
                : p.partial
                  ? p.positions.length === 1
                    ? t.exportClip(p.positions[0] + 1)
                    : t.exportSelected(p.positions.length)
                  : t.exportClips(p.positions.length)}
          </span>
        </button>
      </div>

      <p data-testid="export-status" className="h-4 truncate text-center text-xs leading-4 text-ink-3">
        {p.state.status === 'running' && (
          <button
            data-testid="export-cancel"
            className="cursor-pointer text-ink-2 underline-offset-2 hover:text-ink hover:underline"
            onClick={p.onCancel}
          >
            {t.cancelExport}
          </button>
        )}
        {p.state.status === 'done' && (
          <span data-testid="export-done" className="text-ok">
            {t.exportedClips(p.state.files.length)}
          </span>
        )}
        {p.state.status === 'error' && (
          <span data-testid="export-error" className="text-warn" title={p.state.error}>
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
