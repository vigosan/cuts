import { FADE_OPTIONS } from '@shared/clips'
import { AUDIO_FADES, VIDEO_FADES, type AudioFade, type ClipFade, type VideoFade } from '@shared/fades'
import { t } from '../i18n'
import { CloseIcon, ImageIcon, SpeakerIcon } from './icons'

type Props = {
  fade: ClipFade
  selectedNumber: number | null
  onChange: (change: Partial<ClipFade>) => void
  onClearSelection: () => void
}

const field =
  'h-8 w-full rounded-lg bg-sunken px-2.5 text-sm text-ink placeholder:text-ink-3 transition-colors hover:bg-sunken/80'

export function FadeControls({ fade, selectedNumber, onChange, onClearSelection }: Props) {
  return (
    <section data-testid="fade-controls" className="flex flex-col gap-2 px-4 pb-4">
      <div className="flex h-5 items-center gap-1.5 text-xs text-ink-3">
        {selectedNumber === null ? (
          t.allClips
        ) : (
          <>
            <span className="grid size-4 place-items-center rounded-full bg-accent text-[10px] font-medium text-on-accent">
              {selectedNumber}
            </span>
            <button
              data-testid="clear-selection"
              className="grid size-4 place-items-center rounded-full hover:bg-sunken hover:text-ink"
              title={t.applyToAll}
              aria-label={t.applyToAll}
              onClick={onClearSelection}
            >
              <CloseIcon className="size-2.5" />
            </button>
          </>
        )}
      </div>
      <div className="grid grid-cols-[1fr_1fr_4.5rem] gap-2">
        <span className="relative">
          <ImageIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-3" />
          <select
            id="fade-video"
            data-testid="fade-video"
            aria-label={t.imageFade}
            title={t.imageFade}
            className={`${field} pl-7`}
            value={fade.videoFade}
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
            value={fade.audioFade}
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
          value={fade.fadeSeconds}
          disabled={fade.videoFade === 'none' && fade.audioFade === 'none'}
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
