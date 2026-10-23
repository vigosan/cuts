import { FORMATS, type OutputFormat } from '@shared/formats'

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

const field = 'rounded bg-zinc-800 px-2 py-1 text-sm text-zinc-100'

export function ExportPanel(p: Props) {
  const running = p.state.status === 'running'
  const overall =
    p.state.status === 'running' ? p.state.progress.reduce((a, b) => a + b, 0) / Math.max(1, p.clipCount) : 0

  return (
    <section className="flex flex-col gap-3 border-t border-zinc-800 pt-4">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="flex items-center gap-2">
          <input data-testid="fade" type="checkbox" checked={p.fade} onChange={(e) => p.onFade(e.target.checked)} />
          Fade in/out 1 s
        </label>
        <select
          data-testid="format"
          className={field}
          value={p.format}
          onChange={(e) => p.onFormat(e.target.value as OutputFormat)}
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {f.label}
            </option>
          ))}
        </select>
        <input
          data-testid="base-name"
          className={`${field} w-56`}
          value={p.baseName}
          placeholder="Nombre"
          onChange={(e) => p.onBaseName(e.target.value)}
        />
        <button data-testid="choose-folder" className={`${field} hover:bg-zinc-700`} onClick={p.onChooseFolder}>
          {p.folder ?? 'Elegir carpeta…'}
        </button>
        <button
          data-testid="export"
          className="rounded bg-blue-600 px-4 py-1.5 font-medium text-white hover:bg-blue-500 disabled:opacity-40"
          disabled={!p.canExport || running}
          onClick={p.onExport}
        >
          {running ? 'Exportando…' : `Exportar ${p.clipCount} ${p.clipCount === 1 ? 'trozo' : 'trozos'}`}
        </button>
      </div>
      {p.baseName && p.clipCount > 0 && (
        <p className="text-xs text-zinc-500">
          → {p.baseName}-1.mp4{p.clipCount > 1 ? ` … ${p.baseName}-${p.clipCount}.mp4` : ''}
        </p>
      )}
      {running && (
        <div data-testid="export-progress" className="h-2 overflow-hidden rounded bg-zinc-800">
          <div className="h-full bg-blue-500 transition-[width]" style={{ width: `${overall * 100}%` }} />
        </div>
      )}
      {p.state.status === 'done' && (
        <p data-testid="export-done" className="text-sm text-green-400">
          {p.state.files.length} trozos exportados.{' '}
          <button className="underline" onClick={() => p.state.status === 'done' && p.onReveal(p.state.files[0])}>
            Mostrar en Finder
          </button>
        </p>
      )}
      {p.state.status === 'error' && (
        <p data-testid="export-error" className="text-sm text-red-400">
          {p.state.error}
        </p>
      )}
    </section>
  )
}
