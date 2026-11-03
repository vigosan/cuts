import { useState } from 'react'
import { Text, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { Canvas, Circle, Line, vec } from '@shopify/react-native-skia'
import { AUDIO_FADES, VIDEO_FADES, type ClipSettings } from '@cuts/core/fades'
import { FORMATS, type OutputFormat } from '@cuts/core/formats'
import { fadeHandleX, fadeSecondsAt, stepFade } from '../editor/fade-line'
import { haptics } from '../haptics'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Tap } from './Tap'

type Props = {
  title: string
  settings: ClipSettings
  format: OutputFormat
  onFormat: (format: OutputFormat) => void
  clipLength: number
  theme: Theme
  onChange: (change: Partial<ClipSettings>) => void
  onClose: () => void
}

export function ClipSheet({ title, settings, format, onFormat, clipLength, theme, onChange, onClose }: Props) {
  return (
    <Sheet theme={theme} title={title} onClose={onClose}>
      <Label theme={theme}>{t.format}</Label>
      <Segments theme={theme} prefix="format" value={format} options={FORMATS.map((option) => [option.id, option.id === 'original' ? t.formats.original : option.id])} onChange={onFormat} />
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
      <Label theme={theme} trailing={t.fadeSeconds(settings.fadeSeconds)}>
        {t.audioFade}
      </Label>
      <Segments theme={theme} prefix="audio-fade" value={settings.audioFade} options={AUDIO_FADES.map((fade) => [fade, t.audioFades[fade]])} onChange={(audioFade) => onChange({ audioFade })} />
      <FadeLine theme={theme} seconds={settings.fadeSeconds} clipLength={clipLength} onChange={(fadeSeconds) => onChange({ fadeSeconds })} />
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

function Label({ theme, trailing, children }: { theme: Theme; trailing?: string; children: string }) {
  return (
    <View style={{ flexDirection: 'row' }}>
      <Text style={{ flex: 1, color: theme.muted, fontSize: 13 }}>{children}</Text>
      {trailing && <Text style={{ color: theme.muted, fontSize: 13, fontVariant: ['tabular-nums'] }}>{trailing}</Text>}
    </View>
  )
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

function FadeLine({ theme, seconds, clipLength, onChange }: { theme: Theme; seconds: number; clipLength: number; onChange: (seconds: number) => void }) {
  const [width, setWidth] = useState(0)
  const handle = fadeHandleX(seconds, width, clipLength)
  const pan = usePanGesture({
    runOnJS: true,
    minDistance: 0,
    onUpdate: (event) => onChange(fadeSecondsAt(event.x < width / 2 ? event.x : width - event.x, width, clipLength))
  })
  const top = 4
  const bottom = 30
  return (
    <GestureDetector gesture={pan}>
      <View
        testID="fade-handle"
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={t.mobile.fadeHandle}
        accessibilityValue={{ text: t.fadeSeconds(seconds) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(event) => onChange(stepFade(seconds, event.nativeEvent.actionName === 'increment' ? 1 : -1))}
        onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
        style={{ height: 36 }}
      >
        <Canvas style={{ position: 'absolute', inset: 0 }}>
          <Line p1={vec(0, bottom)} p2={vec(handle, top)} color={theme.ink} strokeWidth={2} />
          <Line p1={vec(handle, top)} p2={vec(width - handle, top)} color={theme.ink} strokeWidth={2} />
          <Line p1={vec(width - handle, top)} p2={vec(width, bottom)} color={theme.ink} strokeWidth={2} />
          <Circle cx={handle} cy={top} r={6} color={theme.ink} />
          <Circle cx={width - handle} cy={top} r={6} color={theme.ink} />
        </Canvas>
      </View>
    </GestureDetector>
  )
}
