import { router } from 'expo-router'
import { ExportClips } from '../../../screens/ExportClips'

export default function ExportClipRoute() {
  return <ExportClips onlySelected onClose={() => router.back()} />
}
