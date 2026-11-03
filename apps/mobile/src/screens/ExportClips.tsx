import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { ExportSheet } from '../components/ExportSheet'
import { useEditor } from '../editor/session'
import { useTheme } from '../theme'

export function ExportClips({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const { exportLabel, format, setFormat, baseName, setBaseName, exporting, startExport, stopExport, resetExport } = useEditor()
  const running = exporting.status === 'running'
  useEffect(() => resetExport, [resetExport])
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !running }} />
      <ExportSheet
        theme={theme}
        label={exportLabel}
        format={format}
        baseName={baseName}
        state={exporting}
        onFormat={setFormat}
        onName={setBaseName}
        onStart={() => void startExport()}
        onStop={stopExport}
        onClose={() => !running && onClose()}
      />
    </>
  )
}
