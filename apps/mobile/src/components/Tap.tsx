import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

type Props = Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle>; testOnly_pressed?: boolean }

const PRESSED = 0.55

export function Tap({ style, ...props }: Props) {
  return <Pressable unstable_pressDelay={0} {...props} style={({ pressed }) => [style, { opacity: pressed ? PRESSED : 1 }]} />
}
