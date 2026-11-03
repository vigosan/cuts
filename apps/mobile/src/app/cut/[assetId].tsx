import { router, useLocalSearchParams } from 'expo-router'
import { useCallback, useState } from 'react'
import type { AssetInfo } from '../../media'
import { openedAsset, rememberOpened } from '../../opened'
import { Cut } from '../../screens/Cut'
import { Opening } from '../../screens/Opening'
import { store } from '../../store'

export default function CutRoute() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  const [asset, setAsset] = useState<AssetInfo | null>(() => openedAsset(assetId))
  const opened = useCallback((next: AssetInfo) => {
    rememberOpened(next)
    setAsset(next)
  }, [])

  if (!asset) return <Opening assetId={assetId} onOpened={opened} onCancel={() => router.back()} />
  return <Cut asset={asset} store={store} onBack={() => router.back()} />
}
