import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { ExportSheet } from '../components/ExportSheet'
import { useEditor } from '../editor/session'
import { t } from '../i18n'
import { useTheme } from '../theme'

export function ExportClips({ onClose, onlySelected = false }: { onClose: () => void; onlySelected?: boolean }) {
  const theme = useTheme()
  const { clips, selectedClip, exportLabel, format, setFormat, baseName, setBaseName, exporting, startExport, stopExport, resetExport } = useEditor()
  const running = exporting.status === 'running'
  const only = onlySelected ? selectedClip : null
  useEffect(() => resetExport, [resetExport])
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !running }} />
      <ExportSheet
        theme={theme}
        label={only ? t.exportClip(clips.indexOf(only) + 1) : exportLabel}
        format={format}
        baseName={baseName}
        state={exporting}
        onFormat={setFormat}
        onName={setBaseName}
        onStart={() => void startExport(only?.id)}
        onStop={stopExport}
        onClose={() => !running && onClose()}
      />
    </>
  )
}
