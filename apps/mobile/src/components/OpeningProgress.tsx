import { Text, View } from 'react-native'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Tap } from './Tap'

export function OpeningProgress({ ratio, theme, onCancel }: { ratio: number; theme: Theme; onCancel: () => void }) {
  return (
    <View testID="opening-progress" style={{ backgroundColor: theme.card, borderRadius: 12, padding: 14, gap: 10 }}>
      <Text style={{ color: theme.ink, fontSize: 15 }}>{t.mobile.downloading(Math.round(ratio * 100))}</Text>
      <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.fill }}>
        <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.ink, width: `${ratio * 100}%` }} />
      </View>
      <Tap testID="cancel-opening" onPress={onCancel}>
        <Text style={{ color: theme.ink, fontWeight: '600' }}>{t.cancel}</Text>
      </Tap>
    </View>
  )
}
