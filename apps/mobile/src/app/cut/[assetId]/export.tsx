import { router } from 'expo-router'
import { ExportClips } from '../../../screens/ExportClips'

export default function ExportRoute() {
  return <ExportClips onClose={() => router.back()} />
}
