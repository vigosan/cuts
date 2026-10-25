import { FADE_OPTIONS } from '@cuts/core/clips'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import { AUDIO_FADES, VIDEO_FADES, type AudioFade, type ClipSettings, type VideoFade } from '@cuts/core/fades'
import { t } from '../i18n'
import { ImageIcon, SpeakerIcon } from './icons'

type Props = {
  settings: ClipSettings
  format: OutputFormat
  onChange: (change: Partial<ClipSettings>) => void
}

const field =
  'h-8 w-full rounded-lg bg-sunken px-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors hover:bg-sunken/80'

export function ClipControls({ settings, format, onChange }: Props) {
  return (
    <section data-testid="fade-controls" className="flex flex-col gap-2 px-4 pb-4">
      {formatSize(format) && (
        <div className="flex rounded-lg bg-sunken p-0.5 text-sm" role="group" aria-label={t.framing}>
          {(['crop', 'fit'] as const).map((framing) => (
            <button
              key={framing}
              data-testid={`framing-${framing}`}
              aria-pressed={settings.framing === framing}
              title={framing === 'crop' ? t.framingCropHint : t.framingFitHint}
              className={`flex-1 rounded-md px-2 py-1 transition-colors ${settings.framing === framing ? 'bg-surface font-medium text-ink shadow-sm' : 'text-ink-2 hover:text-ink'}`}
              onClick={() => onChange({ framing })}
            >
              {framing === 'crop' ? t.framingCrop : t.framingFit}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
        <span className="relative">
          <ImageIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
          <select
            id="fade-video"
            data-testid="fade-video"
            aria-label={t.imageFade}
            title={t.imageFade}
            className={`${field} pl-7`}
            value={settings.videoFade}
            onChange={(e) => onChange({ videoFade: e.target.value as VideoFade })}
          >
            {VIDEO_FADES.map((id) => (
              <option key={id} value={id}>
                {t.videoFades[id]}
              </option>
            ))}
          </select>
        </span>
        <span className="relative">
          <SpeakerIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
          <select
            data-testid="fade-audio"
            aria-label={t.audioFade}
            title={t.audioFade}
            className={`${field} pl-7`}
            value={settings.audioFade}
            onChange={(e) => onChange({ audioFade: e.target.value as AudioFade })}
          >
            {AUDIO_FADES.map((id) => (
              <option key={id} value={id}>
                {t.audioFades[id]}
              </option>
            ))}
          </select>
        </span>
        <select
          data-testid="fade-seconds"
          aria-label={t.fadeLength}
          title={t.fadeLength}
          className={`${field} disabled:opacity-40`}
          value={settings.fadeSeconds}
          disabled={settings.videoFade === 'none' && settings.audioFade === 'none'}
          onChange={(e) => onChange({ fadeSeconds: Number(e.target.value) })}
        >
          {FADE_OPTIONS.map((seconds) => (
            <option key={seconds} value={seconds}>
              {t.fadeSeconds(seconds)}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}
