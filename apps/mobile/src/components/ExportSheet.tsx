import { useEffect, useState } from 'react'
import { Linking, Text, TextInput } from 'react-native'
import { FORMATS, type OutputFormat } from '@cuts/core/formats'
import type { ExportOutcome } from '../editor/export-run'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Segments, Sheet } from './ClipSheet'
import { Tap } from './Tap'

export type ExportState = { status: 'idle' } | { status: 'running'; index: number; total: number } | { status: 'done'; outcome: ExportOutcome }

type Props = {
  theme: Theme
  label: string
  format: OutputFormat
  baseName: string
  state: ExportState
  onFormat: (format: OutputFormat) => void
  onName: (name: string) => void
  onStart: () => void
  onStop: () => void
  onClose: () => void
}

const INSTAGRAM = 'instagram://app'

export function ExportSheet({ theme, label, format, baseName, state, onFormat, onName, onStart, onStop, onClose }: Props) {
  const [instagram, setInstagram] = useState(false)
  useEffect(() => {
    void Linking.canOpenURL(INSTAGRAM).then(setInstagram, () => setInstagram(false))
  }, [])
  const button = (testID: string, text: string, onPress: () => void, primary = true) => (
    <Tap testID={testID} onPress={onPress} style={{ backgroundColor: primary ? theme.ink : theme.fill, borderRadius: 12, paddingVertical: 14, alignItems: 'center' }}>
      <Text style={{ color: primary ? theme.inverse : theme.ink, fontSize: 17, fontWeight: '600' }}>{text}</Text>
    </Tap>
  )
  return (
    <Sheet theme={theme} title={label} onClose={onClose}>
      {state.status === 'idle' && (
        <>
          <Text style={{ color: theme.muted, fontSize: 13 }}>{t.format}</Text>
          <Segments theme={theme} prefix="format" value={format} options={FORMATS.map((option) => [option.id, option.id === 'original' ? t.formats.original : option.id])} onChange={onFormat} />
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
