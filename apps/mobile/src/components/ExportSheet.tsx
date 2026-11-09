import { useEffect, useState } from 'react'
import { ActionSheetIOS, Image, Linking, Switch, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { WAVE_OPACITIES, type AudioExtras } from '@cuts/core/audio-layers'
import type { OutputFormat } from '@cuts/core/formats'
import type { Overlay } from '@cuts/core/overlay'
import type { ExportOutcome } from '../editor/export-run'
import { t } from '../i18n'
import { backgroundUri, overlayUri, type Background } from '../media'
import type { Theme } from '../theme'
import { Segments, Sheet } from './ClipSheet'
import { FormatList } from './FormatList'
import { Tap } from './Tap'

export type AudioRows = {
  background: Background | null
  problem: 'invalid' | 'too-big' | null
  extras: AudioExtras
  onChooseBackground: (from: 'files' | 'photos') => void
  onRemoveBackground: () => void
  onExtras: (extras: AudioExtras) => void
  onPickColor: (layer: 'wave' | 'bar') => void
}

export type ExportState = { status: 'idle' } | { status: 'running'; index: number; total: number } | { status: 'done'; outcome: ExportOutcome }

type Props = {
  theme: Theme
  label: string
  format: OutputFormat
  baseName: string
  state: ExportState
  onFormat: (format: OutputFormat) => void
  overlay: Overlay | null
  overlayInvalid: boolean
  onChooseOverlay: (source: 'files' | 'photos') => void
  onRemoveOverlay: () => void
  onName: (name: string) => void
  onStart: () => void
  onStop: () => void
  onClose: () => void
  audio?: AudioRows
}

const INSTAGRAM = 'instagram://app'

const SOURCES = [null, 'files', 'photos'] as const

export function ExportSheet({ theme, label, format, baseName, state, onFormat, overlay, overlayInvalid, onChooseOverlay, onRemoveOverlay, onName, onStart, onStop, onClose, audio }: Props) {
  const [instagram, setInstagram] = useState(false)
  useEffect(() => {
    void Linking.canOpenURL(INSTAGRAM).then(setInstagram, () => setInstagram(false))
  }, [])
  const button = (testID: string, text: string, onPress: () => void, primary = true, disabled = false) => (
    <Tap testID={testID} onPress={onPress} disabled={disabled} accessibilityState={{ disabled }} style={{ backgroundColor: primary ? theme.ink : theme.fill, borderRadius: 12, paddingVertical: 14, alignItems: 'center', opacity: disabled ? 0.4 : 1 }}>
      <Text style={{ color: primary ? theme.inverse : theme.ink, fontSize: 17, fontWeight: '600' }}>{text}</Text>
    </Tap>
  )
  const addOverlay = () =>
    ActionSheetIOS.showActionSheetWithOptions({ options: [t.cancel, t.mobile.overlayFromFiles, t.mobile.overlayFromPhotos], cancelButtonIndex: 0 }, (index) => {
      const source = SOURCES[index]
      if (source) onChooseOverlay(source)
    })
  const field = { backgroundColor: theme.fill, borderRadius: 9, paddingHorizontal: 10, minHeight: 40 }
  return (
    <Sheet theme={theme} title={label} onClose={onClose}>
      {state.status === 'idle' && (
        <>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.format}</Text>
          <FormatList theme={theme} value={format} onChange={onFormat} />
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.overlay}</Text>
          {overlay ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Tap testID="overlay-change" onPress={addOverlay} style={{ ...field, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 24, height: 24, borderRadius: 4, overflow: 'hidden', flexDirection: 'row', flexWrap: 'wrap' }}>
                  {Array.from({ length: 16 }, (_, cell) => (
                    <View key={cell} style={{ width: 6, height: 6, backgroundColor: (cell + Math.floor(cell / 4)) % 2 ? '#d4d4d8' : '#fff' }} />
                  ))}
                  <Image testID="overlay-thumb" source={{ uri: overlayUri(overlay.path) }} resizeMode="contain" style={{ position: 'absolute', inset: 0 }} />
                </View>
                <Text testID="overlay-name" numberOfLines={1} style={{ flex: 1, color: theme.ink, fontSize: 15 }}>
                  {overlay.name}
                </Text>
              </Tap>
              <Tap testID="overlay-remove" accessibilityLabel={t.overlayRemove} onPress={onRemoveOverlay} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
                <SymbolView name="xmark" size={16} tintColor={theme.muted} />
              </Tap>
            </View>
          ) : (
            <Tap testID="overlay-add" onPress={addOverlay} style={{ ...field, justifyContent: 'center' }}>
              <Text style={{ color: theme.muted, fontSize: 15 }}>{t.overlayAdd}</Text>
            </Tap>
          )}
          {overlayInvalid && <Text style={{ color: theme.danger, fontSize: 13 }}>{t.overlayInvalid}</Text>}
          {audio && <AudioRowsView theme={theme} rows={audio} field={field} />}
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.name}</Text>
          <TextInput
            testID="base-name"
            value={baseName}
            onChangeText={onName}
            placeholder={t.fileNamePlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
            style={{ backgroundColor: theme.fill, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 9, fontSize: 15, color: theme.ink }}
          />
          {audio && !audio.background && <Text style={{ color: theme.muted, fontSize: 13 }}>{t.backgroundMissing}</Text>}
          {button('start-export', label, onStart, true, Boolean(audio && !audio.background))}
        </>
      )}
      {state.status === 'running' && (
        <>
          <Text style={{ color: theme.ink, fontSize: 15 }}>{t.exportingClip(state.index + 1, state.total)}</Text>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.mobile.keepOpen}</Text>
          {button('stop-export', t.mobile.stop, onStop, false)}
        </>
      )}
      {state.status === 'done' && (
        <>
          <Text style={{ color: state.outcome.ok ? theme.ink : theme.danger, fontSize: 15 }}>{state.outcome.ok ? t.mobile.savedToAlbum(state.outcome.saved) : state.outcome.error}</Text>
          {instagram && state.outcome.saved > 0 && button('open-instagram', t.mobile.openInstagram, () => void Linking.openURL(INSTAGRAM))}
        </>
      )}
    </Sheet>
  )
}

function chooseFrom(onChoose: (from: 'files' | 'photos') => void) {
  ActionSheetIOS.showActionSheetWithOptions({ options: [t.cancel, t.mobile.overlayFromFiles, t.mobile.overlayFromPhotos], cancelButtonIndex: 0 }, (index) => {
    const source = SOURCES[index]
    if (source) onChoose(source)
  })
}

type LayerRow = {
  testID: string
  label: string
  on: boolean
  toggle: (on: boolean) => void
  colorID: string
  colorLabel: string
  color: string
  onColor: () => void
  prefix: string
  opacity: number
  onOpacity: (value: number) => void
}

const OPACITY_OPTIONS = WAVE_OPACITIES.map((value): [string, string] => [String(value), `${Math.round(value * 100)} %`])

function AudioRowsView({ theme, rows, field }: { theme: Theme; rows: AudioRows; field: object }) {
  const { background, problem, extras, onExtras, onPickColor } = rows
  const choose = () => chooseFrom(rows.onChooseBackground)
  const layer = ({ testID, label, on, toggle, colorID, colorLabel, color, onColor, prefix, opacity, onOpacity }: LayerRow) => (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 40 }}>
        <Text style={{ flex: 1, color: theme.ink, fontSize: 15 }}>{label}</Text>
        <Switch testID={testID} value={on} onValueChange={toggle} />
      </View>
      {on && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Tap testID={colorID} accessibilityRole="button" accessibilityLabel={colorLabel} onPress={onColor} hitSlop={8} style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: theme.muted, backgroundColor: color }} />
          <View style={{ flex: 1 }}>
            <Segments theme={theme} prefix={prefix} value={String(opacity)} options={OPACITY_OPTIONS} onChange={(value) => onOpacity(Number(value))} />
          </View>
        </View>
      )}
    </>
  )
  return (
    <>
      <Text style={{ color: theme.muted, fontSize: 13 }}>{t.background}</Text>
      {background ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Tap testID="background-change" onPress={choose} style={{ ...field, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 24, height: 24, borderRadius: 4, overflow: 'hidden', backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
              {background.kind === 'image' ? (
                <Image source={{ uri: backgroundUri(background.path) }} resizeMode="cover" style={{ width: 24, height: 24 }} />
              ) : (
                <SymbolView name="film" size={14} tintColor={theme.muted} />
              )}
            </View>
            <Text testID="background-name" numberOfLines={1} style={{ flex: 1, color: theme.ink, fontSize: 15 }}>
              {background.name}
            </Text>
          </Tap>
          <Tap testID="background-remove" accessibilityLabel={t.backgroundRemove} onPress={rows.onRemoveBackground} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
            <SymbolView name="xmark" size={16} tintColor={theme.muted} />
          </Tap>
        </View>
      ) : (
        <Tap testID="background-add" onPress={choose} style={{ ...field, justifyContent: 'center' }}>
          <Text style={{ color: theme.muted, fontSize: 15 }}>{t.overlayAdd}</Text>
        </Tap>
      )}
      {problem && <Text style={{ color: theme.danger, fontSize: 13 }}>{problem === 'too-big' ? t.backgroundTooBig : t.backgroundInvalid}</Text>}
      {layer({
        testID: 'extras-waveform', label: t.extrasWaveform, on: extras.waveform, toggle: (waveform) => onExtras({ ...extras, waveform }),
        colorID: 'extras-color', colorLabel: t.extrasColor, color: extras.color, onColor: () => onPickColor('wave'),
        prefix: 'extras-opacity', opacity: extras.opacity, onOpacity: (opacity) => onExtras({ ...extras, opacity })
      })}
      {layer({
        testID: 'extras-progress', label: t.extrasProgress, on: extras.progressBar, toggle: (progressBar) => onExtras({ ...extras, progressBar }),
        colorID: 'bar-color', colorLabel: t.barColor, color: extras.barColor, onColor: () => onPickColor('bar'),
        prefix: 'bar-opacity', opacity: extras.barOpacity, onOpacity: (barOpacity) => onExtras({ ...extras, barOpacity })
      })}
    </>
  )
}
