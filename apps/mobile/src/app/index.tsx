import { router, useFocusEffect } from 'expo-router'
import { useCallback, useState } from 'react'
import { loadSession, touchRecent } from '../editor/sessions'
import { rememberOpened } from '../opened'
import { Home } from '../screens/Home'
import { store } from '../store'

export default function HomeRoute() {
  const [visits, setVisits] = useState(0)
  useFocusEffect(useCallback(() => setVisits((count) => count + 1), []))
  return (
    <Home
      store={store}
      visits={visits}
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
