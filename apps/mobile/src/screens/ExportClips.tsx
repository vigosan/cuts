import { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { clampPlacement, defaultPlacement, outputFrame } from '@cuts/core/overlay'
import { ExportSheet } from '../components/ExportSheet'
import { useEditor } from '../editor/session'
import { t } from '../i18n'
import { pickColor, pickOverlay } from '../media'
import { useTheme } from '../theme'

export function ExportClips({ onClose, onlySelected = false, full = false }: { onClose: () => void; onlySelected?: boolean; full?: boolean }) {
  const theme = useTheme()
  const { asset, background, setBackground, chooseBackground, extras, setExtras, source, clips, selectedClip, exportLabel, format, setFormat, overlay, setOverlay, baseName, setBaseName, exporting, startExport, startFullExport, stopExport, resetExport } = useEditor()
  const [overlayInvalid, setOverlayInvalid] = useState(false)
  const [backgroundProblem, setBackgroundProblem] = useState<'invalid' | 'too-big' | null>(null)
  const running = exporting.status === 'running'
  const only = onlySelected ? selectedClip : null
  useEffect(() => resetExport, [resetExport])
  const chooseOverlay = async (from: 'files' | 'photos') => {
    const chosen = await pickOverlay(from).catch(() => 'invalid' as const)
    setOverlayInvalid(chosen === 'invalid')
    if (!chosen || chosen === 'invalid') return
    const frame = outputFrame(format, source)
    setOverlay({ ...chosen, ...(overlay ? clampPlacement(overlay, chosen.aspect, frame) : defaultPlacement(chosen.aspect, frame)) })
  }
  return (
    <>
      <Stack.Screen options={{ gestureEnabled: !running }} />
      <ExportSheet
        theme={theme}
        label={full ? t.exportFull : only ? t.exportClip(clips.indexOf(only) + 1) : exportLabel}
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
        onStart={() => void (full ? startFullExport() : startExport(only?.id))}
        onStop={stopExport}
        onClose={() => !running && onClose()}
        audio={
          asset.kind === 'audio'
            ? {
                background,
                problem: backgroundProblem,
                extras,
                onChooseBackground: (from) => void chooseBackground(from).then(setBackgroundProblem),
                onRemoveBackground: () => {
                  setBackgroundProblem(null)
                  setBackground(null)
                },
                onExtras: setExtras,
                onPickColor: (layer) =>
                  void pickColor(layer === 'wave' ? extras.color : extras.barColor).then(
                    (color) => color && setExtras(layer === 'wave' ? { ...extras, color } : { ...extras, barColor: color })
                  )
              }
            : undefined
        }
      />
    </>
  )
}
