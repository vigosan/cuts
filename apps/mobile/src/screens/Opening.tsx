import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { OpeningProgress } from '../components/OpeningProgress'
import { t } from '../i18n'
import { cancelOpen, openAsset, type AssetInfo } from '../media'
import { useTheme } from '../theme'
import { Tap } from '../components/Tap'

type Props = { assetId: string; onOpened: (asset: AssetInfo) => void; onCancel: () => void }

export function Opening({ assetId, onOpened, onCancel }: Props) {
  const theme = useTheme()
  const [ratio, setRatio] = useState(0)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let live = true
    openAsset(assetId, (next) => live && setRatio(next)).then(
      (asset) => live && onOpened(asset),
      () => live && setFailed(true)
    )
    return () => {
      live = false
    }
  }, [assetId, onOpened])

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background, padding: 16, justifyContent: 'center' }}>
      {failed ? (
        <View style={{ gap: 12 }}>
          <Text style={{ color: theme.ink, fontSize: 15 }}>{t.mobile.openFailed}</Text>
          <Tap testID="back" onPress={onCancel}>
            <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>{t.mobile.back}</Text>
          </Tap>
        </View>
      ) : (
        <OpeningProgress
          ratio={ratio}
          theme={theme}
          onCancel={() => {
            cancelOpen(assetId)
            onCancel()
          }}
        />
      )}
    </SafeAreaView>
  )
}
