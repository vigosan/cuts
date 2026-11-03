import { Text, View } from 'react-native'
import { SymbolView } from 'expo-symbols'
import { FORMATS, type OutputFormat } from '@cuts/core/formats'
import { haptics } from '../haptics'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Tap } from './Tap'

type Props = { theme: Theme; value: OutputFormat; onChange: (format: OutputFormat) => void }

export function FormatList({ theme, value, onChange }: Props) {
  return (
    <View style={{ backgroundColor: theme.fill, borderRadius: 10, overflow: 'hidden' }}>
      {FORMATS.map((option, index) => (
        <Tap
          key={option.id}
          testID={`format-${option.id}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: option.id === value }}
          onPress={() => {
            if (option.id !== value) haptics.tick()
            onChange(option.id)
          }}
          style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, borderTopWidth: index ? 0.5 : 0, borderColor: theme.background }}
        >
          <Text style={{ flex: 1, color: theme.ink, fontSize: 15 }}>{t.formats[option.id]}</Text>
          {option.id === value && <SymbolView name="checkmark" size={16} tintColor={theme.ink} />}
        </Tap>
      ))}
    </View>
  )
}
