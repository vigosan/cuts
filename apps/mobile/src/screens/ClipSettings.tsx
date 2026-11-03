import { ClipSheet } from '../components/ClipSheet'
import { useEditor } from '../editor/session'
import { t } from '../i18n'
import { useTheme } from '../theme'

export function ClipSettings({ onClose }: { onClose: () => void }) {
  const theme = useTheme()
  const { clips, selectedClip, shownSettings, dispatch, format, setFormat } = useEditor()
  return (
    <ClipSheet
      title={selectedClip ? t.settingsScopeClip(clips.indexOf(selectedClip) + 1) : t.settingsScopeAll}
      settings={shownSettings}
      format={format}
      onFormat={setFormat}
      theme={theme}
      onChange={(change) => dispatch({ type: 'settings', change })}
      onClose={onClose}
    />
  )
}
