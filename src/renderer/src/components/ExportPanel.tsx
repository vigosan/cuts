import { FORMATS, type OutputFormat } from '@shared/formats'
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
  fade: boolean
  format: OutputFormat
  state: ExportState
  onBaseName: (value: string) => void
  onChooseFolder: () => void
  onFade: (value: boolean) => void
  onFormat: (value: OutputFormat) => void
  onExport: () => void
  onReveal: (path: string) => void
}

const field =
  'h-8 w-full rounded-lg bg-sunken px-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors hover:bg-sunken/80'
const clipsLabel = (n: number) => `${n} ${n === 1 ? 'clip' : 'clips'}`

export function ExportPanel(p: Props) {
  const running = p.state.status === 'running'
  const overall =
    p.state.status === 'running' ? p.state.progress.reduce((a, b) => a + b, 0) / Math.max(1, p.state.progress.length) : 0
  const folderName = p.folder?.split('/').filter(Boolean).pop()

  return (
    <section className="flex flex-col gap-3 border-t border-line p-4">
      <div className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-2 text-sm">
        <label htmlFor="base-name" className="text-ink-2">
          Nombre
        </label>
        <input
          id="base-name"
          data-testid="base-name"
          className={field}
          value={p.baseName}
          placeholder="Nombre de los archivos"
          onChange={(e) => p.onBaseName(e.target.value)}
        />
        <span className="text-ink-2">Carpeta</span>
        <button
          data-testid="choose-folder"
          className={`${field} flex items-center gap-2 text-left`}
          title={p.folder ?? 'Elegir carpeta de destino'}
          onClick={p.onChooseFolder}
        >
          <FolderIcon className="size-4 text-ink-3" />
          <span className={`truncate ${folderName ? '' : 'text-ink-3'}`}>{folderName ?? 'Elegir…'}</span>
        </button>
        <label htmlFor="format" className="text-ink-2">
          Formato
        </label>
        <div className="flex items-center gap-3">
          <select
            id="format"
            data-testid="format"
            className={`${field} min-w-0 flex-1`}
            value={p.format}
            onChange={(e) => p.onFormat(e.target.value as OutputFormat)}
          >
            {FORMATS.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
          <label className="flex shrink-0 cursor-pointer items-center gap-2 text-ink-2" title="Fundido de 1 s en imagen y audio">
            <input
              data-testid="fade"
              type="checkbox"
              className="peer relative h-5 w-8 cursor-pointer appearance-none rounded-full bg-sunken transition-colors before:absolute before:top-0.5 before:left-0.5 before:size-4 before:rounded-full before:bg-white before:shadow-sm before:transition-transform checked:bg-accent checked:before:translate-x-3"
              checked={p.fade}
              onChange={(e) => p.onFade(e.target.checked)}
            />
            Fundido
          </label>
        </div>
      </div>

      <button
        data-testid="export"
        className="h-10 rounded-xl bg-accent text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-sunken disabled:text-ink-3"
        disabled={!p.canExport || running}
        onClick={p.onExport}
      >
        {running ? 'Exportando…' : `Exportar ${clipsLabel(p.clipCount)}`}
      </button>

      {running && (
        <div data-testid="export-progress" className="h-1.5 overflow-hidden rounded-full bg-sunken">
          <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${overall * 100}%` }} />
        </div>
      )}
      {p.state.status === 'idle' && p.clipCount > 0 && !p.folder && (
        <p className="text-center text-xs text-ink-2">Elige una carpeta para poder exportar</p>
      )}
      {p.state.status === 'idle' && p.baseName && p.clipCount > 0 && p.folder && (
        <p className="truncate text-center text-xs text-ink-3" title={`${p.folder}/${p.baseName}-1.mp4`}>
          {p.baseName}-1.mp4{p.clipCount > 1 ? ` … ${p.baseName}-${p.clipCount}.mp4` : ''}
        </p>
      )}
      {p.state.status === 'done' && (
        <p data-testid="export-done" className="text-center text-sm text-ok">
          {clipsLabel(p.state.files.length)} {p.state.files.length === 1 ? 'exportado' : 'exportados'} ·{' '}
          <button
            className="font-medium underline-offset-2 hover:underline"
            onClick={() => p.state.status === 'done' && p.onReveal(p.state.files[0])}
          >
            Mostrar en Finder
          </button>
        </p>
      )}
      {p.state.status === 'error' && (
        <p data-testid="export-error" className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
          {p.state.error}
        </p>
      )}
    </section>
  )
}
