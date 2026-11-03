import '../polyfills'
import { Stack } from 'expo-router'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Cuts', headerLargeTitleEnabled: true, headerTransparent: true }} />
        <Stack.Screen name="cut/[assetId]" options={{ headerShown: false }} />
      </Stack>
    </GestureHandlerRootView>
  )
}
