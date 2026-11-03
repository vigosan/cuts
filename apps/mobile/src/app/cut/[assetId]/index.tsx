import { router, useLocalSearchParams } from 'expo-router'
import { Cut } from '../../../screens/Cut'

export default function CutRoute() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>()
  return <Cut onBack={() => router.back()} onOpenSheet={(sheet) => router.push({ pathname: `/cut/[assetId]/${sheet}`, params: { assetId } })} />
}
