import { router, Stack, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import { EditorProvider } from '../../../editor/session'
import type { AssetInfo } from '../../../media'
import { openedAsset, rememberOpened } from '../../../opened'
import { Opening } from '../../../screens/Opening'
import { store } from '../../../store'

export default function CutLayout() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  const [asset, setAsset] = useState<AssetInfo | null>(() => openedAsset(assetId))
  const opened = useCallback((next: AssetInfo) => {
    rememberOpened(next)
    setAsset(next)
  }, [])

  if (!asset) return <Opening assetId={assetId} onOpened={opened} onCancel={() => router.back()} />
  return (
    <EditorProvider asset={asset} store={store}>
      <Stack>
        <Stack.Screen name="index" options={{ headerTransparent: false }} />
        <Stack.Screen
          name="clip"
          options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: [0.6, 0.9], sheetLargestUndimmedDetentIndex: 0, sheetGrabberVisible: true }}
        />
        <Stack.Screen name="export" options={{ presentation: 'formSheet', headerShown: false, sheetAllowedDetents: 'fitToContents', sheetGrabberVisible: true }} />
      </Stack>
    </EditorProvider>
  )
}
