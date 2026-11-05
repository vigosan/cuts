import { useEffect, useState } from 'react'
import { ActionSheetIOS, Image, Linking, Text, TextInput, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import type { OutputFormat } from '@cuts/core/formats'
import type { Overlay } from '@cuts/core/overlay'
import type { ExportOutcome } from '../editor/export-run'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Sheet } from './ClipSheet'
import { FormatList } from './FormatList'
import { Tap } from './Tap'

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
}

const INSTAGRAM = 'instagram://app'

const SOURCES = [null, 'files', 'photos'] as const

export function ExportSheet({ theme, label, format, baseName, state, onFormat, overlay, overlayInvalid, onChooseOverlay, onRemoveOverlay, onName, onStart, onStop, onClose }: Props) {
  const [instagram, setInstagram] = useState(false)
  useEffect(() => {
    void Linking.canOpenURL(INSTAGRAM).then(setInstagram, () => setInstagram(false))
  }, [])
  const button = (testID: string, text: string, onPress: () => void, primary = true) => (
    <Tap testID={testID} onPress={onPress} style={{ backgroundColor: primary ? theme.ink : theme.fill, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
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
                  <Image testID="overlay-thumb" source={{ uri: overlay.path }} resizeMode="contain" style={{ position: 'absolute', inset: 0 }} />
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
          {button('start-export', label, onStart)}
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
