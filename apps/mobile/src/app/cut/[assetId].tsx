import { useLocalSearchParams } from 'expo-router'
import { Text, View } from 'react-native'
import { openedAsset } from '../../opened'

export default function CutRoute() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  return (
    <View testID="cut" style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{openedAsset(assetId)?.name}</Text>
    </View>
  )
}
