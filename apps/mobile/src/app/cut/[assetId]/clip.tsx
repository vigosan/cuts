import { router } from 'expo-router'
import { ClipSettings } from '../../../screens/ClipSettings'

export default function ClipRoute() {
  return <ClipSettings onClose={() => router.back()} />
}
