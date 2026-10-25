import { FORMATS, type OutputFormat } from '@shared/formats'
import { t } from '../i18n'
import { FolderIcon } from './icons'

export type ExportState =
  | { status: 'idle' }
  | { status: 'running'; progress: number[] }
  | { status: 'done'; files: string[] }
  | { status: 'error'; error: string }

type Props = {
  clipCount: number
  canExport: boolean
  baseName: string
  folder: string | null
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

const field =
  'h-8 w-full rounded-lg bg-sunken px-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors hover:bg-sunken/80'

export function ExportPanel(p: Props) {
  const running = p.state.status === 'running'
  const overall =
    p.state.status === 'running'
      ? p.state.progress.reduce((a, b) => a + b, 0) / Math.max(1, p.state.progress.length)
      : 0
  const finished = p.state.status === 'running' ? p.state.progress.filter((r) => r >= 1).length : 0
  const folderName = p.folder?.split(/[\\/]/).filter(Boolean).slice(-2).join('/')

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

      <button
        data-testid="export"
        className={`relative h-10 overflow-hidden rounded-xl bg-accent text-sm font-medium text-on-accent transition-colors ${running ? 'cursor-default' : 'hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3'}`}
        disabled={!p.canExport || running}
        onClick={() => (p.state.status === 'done' ? (p.canShare ? p.onShare(p.state.files) : p.onReveal(p.state.files[0])) : p.onExport())}
      >
        {running && (
          <span
            data-testid="export-progress"
            className="absolute inset-y-0 left-0 bg-on-accent/20 transition-[width]"
            style={{ width: `${overall * 100}%` }}
          />
        )}
        <span className="relative">
          {p.state.status === 'running'
            ? t.exportingClip(Math.min(finished + 1, p.state.progress.length), p.state.progress.length)
            : p.state.status === 'done'
              ? p.canShare
                ? t.share
                : t.showInFolder
              : t.exportClips(p.clipCount)}
        </span>
      </button>

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
            {p.canShare && (
              <>
                {' '}·{' '}
                <button
                  data-testid="reveal"
                  className="cursor-pointer font-medium underline-offset-2 hover:underline"
                  onClick={() => p.state.status === 'done' && p.onReveal(p.state.files[0])}
                >
                  {t.showInFinder}
                </button>
              </>
            )}
          </span>
        )}
        {p.state.status === 'error' && (
          <span data-testid="export-error" className="text-warn" title={p.state.error}>
            {p.state.error}
          </span>
        )}
        {p.state.status === 'idle' && p.baseName && p.clipCount > 0 && p.folder && (
          <span title={`${p.folder}/${p.baseName}-1.mp4`}>
            {p.baseName}-1.mp4
            {p.clipCount > 1 ? ` … ${p.baseName}-${p.clipCount}.mp4` : ''}
          </span>
        )}
      </p>
    </section>
  )
}
