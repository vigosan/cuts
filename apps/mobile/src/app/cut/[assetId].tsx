import { router, useLocalSearchParams } from 'expo-router'
import { useEffect, useState } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { openAsset, type AssetInfo } from '../../media'
import { openedAsset, rememberOpened } from '../../opened'
import { Cut } from '../../screens/Cut'
import { store } from '../../store'

export default function CutRoute() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  const [asset, setAsset] = useState<AssetInfo | null>(() => openedAsset(assetId))

  useEffect(() => {
    if (asset) return
    openAsset(assetId, () => {}).then(
      (opened) => {
        rememberOpened(opened)
        setAsset(opened)
      },
      () => router.back()
    )
  }, [asset, assetId])

  if (!asset) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    )
  }
  return <Cut asset={asset} store={store} onBack={() => router.back()} />
}
