import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { clampPlacement, defaultPlacement, outputFrame } from '@cuts/core/overlay'
import { ExportSheet } from '../components/ExportSheet'
import { useEditor } from '../editor/session'
import { t } from '../i18n'
import { pickOverlay } from '../media'
import { useTheme } from '../theme'

export function ExportClips({ onClose, onlySelected = false }: { onClose: () => void; onlySelected?: boolean }) {
  const theme = useTheme()
  const { asset, clips, selectedClip, exportLabel, format, setFormat, overlay, setOverlay, baseName, setBaseName, exporting, startExport, stopExport, resetExport } = useEditor()
  const [overlayInvalid, setOverlayInvalid] = useState(false)
  const running = exporting.status === 'running'
  const only = onlySelected ? selectedClip : null
  useEffect(() => resetExport, [resetExport])
  const chooseOverlay = async (source: 'files' | 'photos') => {
    const chosen = await pickOverlay(source).catch(() => 'invalid' as const)
    setOverlayInvalid(chosen === 'invalid')
    if (!chosen || chosen === 'invalid') return
    const frame = outputFrame(format, asset)
    setOverlay({ ...chosen, ...(overlay ? clampPlacement(overlay, chosen.aspect, frame) : defaultPlacement(chosen.aspect, frame)) })
  }
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
        overlay={overlay}
        overlayInvalid={overlayInvalid}
        onChooseOverlay={(source) => void chooseOverlay(source)}
        onRemoveOverlay={() => {
          setOverlayInvalid(false)
          setOverlay(null)
        }}
        onName={setBaseName}
        onStart={() => void startExport(only?.id)}
        onStop={stopExport}
        onClose={() => !running && onClose()}
      />
    </>
  )
}
