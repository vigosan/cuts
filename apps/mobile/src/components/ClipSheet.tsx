import { Text, View } from 'react-native'
import { FADE_OPTIONS } from '@cuts/core/clips'
import { AUDIO_FADES, nearestFadeSeconds, VIDEO_FADES, type ClipSettings } from '@cuts/core/fades'
import type { OutputFormat } from '@cuts/core/formats'
import { haptics } from '../haptics'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { FormatList } from './FormatList'
import { Tap } from './Tap'

type Props = {
  title: string
  settings: ClipSettings
  format: OutputFormat
  onFormat: (format: OutputFormat) => void
  theme: Theme
  onChange: (change: Partial<ClipSettings>) => void
  onClose: () => void
}

export function ClipSheet({ title, settings, format, onFormat, theme, onChange, onClose }: Props) {
  return (
    <Sheet theme={theme} title={title} onClose={onClose}>
      <Label theme={theme}>{t.format}</Label>
      <FormatList theme={theme} value={format} onChange={onFormat} />
      <Label theme={theme}>{t.framing}</Label>
      {format === 'original' && <Text style={{ color: theme.muted, fontSize: 13 }}>{t.mobile.framingNeedsFormat}</Text>}
      <Segments
        theme={theme}
        prefix="framing"
        value={settings.framing}
        options={[
          ['crop', t.framingCrop],
          ['fit', t.framingFit]
        ]}
        onChange={(framing) => onChange({ framing })}
      />
      <Label theme={theme}>{t.imageFade}</Label>
      <Segments theme={theme} prefix="video-fade" value={settings.videoFade} options={VIDEO_FADES.map((fade) => [fade, t.videoFades[fade]])} onChange={(videoFade) => onChange({ videoFade })} />
      <Label theme={theme}>{t.audioFade}</Label>
      <Segments theme={theme} prefix="audio-fade" value={settings.audioFade} options={AUDIO_FADES.map((fade) => [fade, t.audioFades[fade]])} onChange={(audioFade) => onChange({ audioFade })} />
      <Label theme={theme}>{t.fadeLength}</Label>
      <Segments
        theme={theme}
        prefix="fade-seconds"
        value={String(nearestFadeSeconds(settings.fadeSeconds))}
        options={FADE_OPTIONS.map((seconds) => [String(seconds), t.fadeSeconds(seconds)])}
        onChange={(seconds) => onChange({ fadeSeconds: Number(seconds) })}
      />
    </Sheet>
  )
}

export function Sheet({ title, theme, onClose, children }: { title: string; theme: Theme; onClose: () => void; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: theme.card, padding: 16, paddingTop: 20, paddingBottom: 32, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
        <Text style={{ flex: 1, color: theme.ink, fontSize: 17, fontWeight: '700' }}>{title}</Text>
        <Tap testID="close-sheet" onPress={onClose} hitSlop={12} style={{ minHeight: 44, justifyContent: 'center' }}>
          <Text style={{ color: theme.ink, fontSize: 17, fontWeight: '600' }}>{t.mobile.done}</Text>
        </Tap>
      </View>
      {children}
    </View>
  )
}

function Label({ theme, children }: { theme: Theme; children: string }) {
  return <Text style={{ color: theme.muted, fontSize: 13 }}>{children}</Text>
}

type SegmentsProps<T extends string> = { theme: Theme; prefix: string; value: T; options: [T, string][]; onChange: (value: T) => void }

export function Segments<T extends string>({ theme, prefix, value, options, onChange }: SegmentsProps<T>) {
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: theme.fill, borderRadius: 9, padding: 2 }}>
      {options.map(([option, label]) => (
        <Tap
          key={option}
          testID={`${prefix}-${option}`}
          accessibilityRole="tab"
          accessibilityState={{ selected: option === value }}
          onPress={() => {
            if (option !== value) haptics.tick()
            onChange(option)
          }}
          style={{ flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7, backgroundColor: option === value ? theme.card : theme.fill }}
        >
          <Text style={{ fontSize: 13, color: option === value ? theme.ink : theme.muted, fontWeight: option === value ? '600' : '400' }}>{label}</Text>
        </Tap>
      ))}
    </View>
  )
}
