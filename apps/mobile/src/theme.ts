import { useColorScheme } from 'react-native'

const light = {
  background: '#f4f3f1',
  card: '#ffffff',
  ink: '#1c1c1e',
  muted: '#6e6e73',
  fill: '#e8e7e3',
  inverse: '#ffffff',
  danger: '#d70015',
  accent: '#fde047',
  onAccent: '#1c1c1e',
  tile: '#1c1c1e'
}

const dark: typeof light = {
  background: '#000000',
  card: '#1c1c1e',
  ink: '#f2f2f7',
  muted: '#98989f',
  fill: '#2c2c2e',
  inverse: '#1c1c1e',
  danger: '#ff6961',
  accent: '#fde047',
  onAccent: '#1c1c1e',
  tile: '#d1d1d6'
}

export type Theme = typeof light

export const palettes = { light, dark }

export function useTheme(): Theme {
  return useColorScheme() === 'dark' ? dark : light
}
