import { FORMATS, formatSize, type OutputFormat } from '@cuts/core/formats'
import type { Framing } from '@cuts/core/framing'
import { t } from '../i18n'
import { field } from './field'

type Props = {
  format: OutputFormat
  framing: Framing
  onFormat: (format: OutputFormat) => void
  onFraming: (framing: Framing) => void
}

export function VideoToolbar({ format, framing, onFormat, onFraming }: Props) {
  return (
    <div data-testid="video-toolbar" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
      <label htmlFor="format" className="text-ink-2">
        {t.format}
      </label>
      <span className="w-56">
        <select
          id="format"
          data-testid="format"
          className={field}
          value={format}
          onChange={(e) => onFormat(e.target.value as OutputFormat)}
        >
          {FORMATS.map((f) => (
            <option key={f.id} value={f.id}>
              {t.formats[f.id]}
            </option>
          ))}
        </select>
      </span>
      {formatSize(format) && (
        <div className="flex rounded-lg bg-sunken p-0.5" role="group" aria-label={t.framing}>
          {(['crop', 'fit'] as const).map((option) => (
            <button
              key={option}
              data-testid={`framing-${option}`}
              aria-pressed={framing === option}
              title={option === 'crop' ? t.framingCropHint : t.framingFitHint}
              className={`rounded-md px-3 py-1 transition-colors ${framing === option ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              onClick={() => onFraming(option)}
            >
              {option === 'crop' ? t.framingCrop : t.framingFit}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
