import { router } from 'expo-router'
import { ExportClips } from '../../../screens/ExportClips'

export default function ExportFullRoute() {
  return <ExportClips full onClose={() => router.back()} />
}
