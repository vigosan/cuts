import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; testOnly_pressed?: boolean; shrink?: boolean }

const PRESSED = 0.7
const SUNK = 0.97

export function Tap({ style, shrink = false, ...props }: Props) {
  return (
    <Pressable
      unstable_pressDelay={0}
      {...props}
      style={({ pressed }) => [style, { opacity: pressed ? PRESSED : 1 }, shrink && pressed && { transform: [{ scale: SUNK }] }]}
    />
  )
}
