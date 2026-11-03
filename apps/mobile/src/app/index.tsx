import { router } from 'expo-router'
import { loadSession, touchRecent } from '../editor/sessions'
import { rememberOpened } from '../opened'
import { Home } from '../screens/Home'
import { store } from '../store'

export default function HomeRoute() {
  return (
    <Home
      store={store}
      onOpen={(asset) => {
        rememberOpened(asset)
        touchRecent(store, {
          assetId: asset.id,
          name: asset.name,
          duration: asset.duration,
          clips: loadSession(store, asset.id)?.clips.length ?? 0,
          openedAt: Date.now()
        })
        router.push({ pathname: '/cut/[assetId]', params: { assetId: asset.id } })
      }}
    />
  )
}
