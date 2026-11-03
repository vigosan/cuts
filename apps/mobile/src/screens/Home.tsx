import { useEffect, useRef, useState } from 'react'
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { formatTime } from '@cuts/core/clips'
import { recents, type KeyValue, type Recent } from '../editor/sessions'
import { t } from '../i18n'
import { OpeningProgress } from '../components/OpeningProgress'
import { cancelOpen, openAsset, pickVideo, poster, requestLibraryAccess, type AssetInfo } from '../media'
import { useTheme } from '../theme'

type Props = { store: KeyValue; onOpen: (asset: AssetInfo) => void }

export function Home({ store, onOpen }: Props) {
  const theme = useTheme()
  const [problem, setProblem] = useState<string | null>(null)
  const [needsSettings, setNeedsSettings] = useState(false)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [download, setDownload] = useState<number | null>(null)
  const opening = useRef(0)

  const open = async (id: string) => {
    const attempt = ++opening.current
    setProblem(null)
    setOpeningId(id)
    setDownload(0)
    try {
      const asset = await openAsset(id, (ratio) => attempt === opening.current && setDownload(ratio))
      if (attempt === opening.current) onOpen(asset)
    } catch {
      if (attempt === opening.current) setProblem(t.mobile.openFailed)
    } finally {
      if (attempt === opening.current) setDownload(null)
    }
  }

  const choose = async () => {
    const access = await requestLibraryAccess()
    setNeedsSettings(access !== 'granted')
    if (access !== 'granted') return setProblem(access === 'limited' ? t.mobile.photosLimited : t.mobile.photosDenied)
    setProblem(null)
    const id = await pickVideo()
    if (id) await open(id)
  }

  const cancel = () => {
    opening.current++
    if (openingId) cancelOpen(openingId)
    setDownload(null)
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Pressable
          testID="choose-video"
          onPress={() => void choose()}
          style={{ backgroundColor: theme.ink, borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}
        >
          <Text style={{ color: theme.inverse, fontSize: 17, fontWeight: '600' }}>{t.mobile.chooseFromPhotos}</Text>
        </Pressable>
        {problem && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.ink, fontSize: 15 }}>{problem}</Text>
            {needsSettings && (
              <Pressable testID="open-settings" onPress={() => Linking.openSettings()}>
                <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>{t.mobile.openSettings}</Text>
              </Pressable>
            )}
          </View>
        )}
        {download !== null && <OpeningProgress ratio={download} theme={theme} onCancel={cancel} />}
        <Recents store={store} onPress={open} />
      </ScrollView>
    </SafeAreaView>
  )
}

function Recents({ store, onPress }: { store: KeyValue; onPress: (id: string) => Promise<void> }) {
  const theme = useTheme()
  const list = recents(store)
  if (list.length === 0) return null
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: theme.muted, fontSize: 15, fontWeight: '600', marginTop: 8 }}>{t.recentVideos}</Text>
      {list.map((recent) => (
        <RecentRow key={recent.assetId} recent={recent} onPress={() => void onPress(recent.assetId)} />
      ))}
    </View>
  )
}

function RecentRow({ recent, onPress }: { recent: Recent; onPress: () => void }) {
  const theme = useTheme()
  const [image, setImage] = useState<string | null>(null)
  useEffect(() => {
    void poster(recent.assetId, 80).then(setImage, () => {})
  }, [recent.assetId])
  return (
    <Pressable
      testID={`recent-${recent.assetId}`}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, borderRadius: 12, padding: 10 }}
    >
      <View style={{ width: 64, height: 40, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.fill }}>
        {image && <Image source={{ uri: image }} style={{ width: 64, height: 40 }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>
          {recent.name}
        </Text>
        <Text style={{ color: theme.muted, fontSize: 13 }}>
          {formatTime(recent.duration)} · {t.recentClips(recent.clips)}
        </Text>
      </View>
    </Pressable>
  )
}
