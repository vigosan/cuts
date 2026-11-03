import { useEffect, useRef, useState } from 'react'
import { Animated, Image, Linking, ScrollView, Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SymbolView, type SFSymbol } from 'expo-symbols'
import { formatTime } from '@cuts/core/clips'
import { recents, removeRecent, type KeyValue, type Recent } from '../editor/sessions'
import { t } from '../i18n'
import { OpeningProgress } from '../components/OpeningProgress'
import { cancelOpen, openAsset, pickFile, pickVideo, poster, requestLibraryAccess, type AssetInfo } from '../media'
import { useTheme } from '../theme'
import { Tap } from '../components/Tap'

type Props = { store: KeyValue; onOpen: (asset: AssetInfo) => void; visits?: number }

export function Home({ store, onOpen, visits = 0 }: Props) {
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

  const chooseFile = async () => {
    setProblem(null)
    const id = await pickFile()
    if (id) await open(id)
  }

  const cancel = () => {
    opening.current++
    if (openingId) cancelOpen(openingId)
    setDownload(null)
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        <View style={{ alignItems: 'center', gap: 4, paddingTop: 24, paddingBottom: 8 }}>
          <Image
            testID="home-logo"
            source={require('../../assets/images/icon.png')}
            accessibilityIgnoresInvertColors
            style={{ width: 88, height: 88, borderRadius: 20, borderCurve: 'continuous', marginBottom: 12 }}
          />
          <Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 34, fontWeight: '700', letterSpacing: -0.6 }}>
            Cuts
          </Text>
          <Text style={{ color: theme.muted, fontSize: 17 }}>{t.mobile.tagline}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <SourceTile testID="choose-video" icon="photo.on.rectangle" label={t.mobile.fromPhotos} accessibilityLabel={t.mobile.chooseFromPhotos} primary onPress={() => void choose()} />
          <SourceTile testID="choose-file" icon="folder" label={t.mobile.fromFiles} accessibilityLabel={t.mobile.chooseFromFiles} onPress={() => void chooseFile()} />
        </View>
        {problem && (
          <View style={{ gap: 8 }}>
            <Text style={{ color: theme.ink, fontSize: 15 }}>{problem}</Text>
            {needsSettings && (
              <Tap testID="open-settings" onPress={() => Linking.openSettings()}>
                <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>{t.mobile.openSettings}</Text>
              </Tap>
            )}
          </View>
        )}
        {download !== null && <OpeningProgress ratio={download} theme={theme} onCancel={cancel} />}
        <Recents key={visits} store={store} onPress={open} />
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 }}>
          <Tap testID="privacy-link" onPress={() => void Linking.openURL(t.privacyUrl)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t.menuPrivacy}</Text>
          </Tap>
          <Tap testID="support-link" onPress={() => void Linking.openURL(t.supportUrl)} style={{ minHeight: 44, justifyContent: 'center' }}>
            <Text style={{ color: theme.muted, fontSize: 13 }}>{t.menuSupport}</Text>
          </Tap>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

type SourceTileProps = { testID: string; icon: SFSymbol; label: string; accessibilityLabel: string; primary?: boolean; onPress: () => void }

function SourceTile({ testID, icon, label, accessibilityLabel, primary = false, onPress }: SourceTileProps) {
  const theme = useTheme()
  const color = primary ? theme.inverse : theme.ink
  return (
    <Tap
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ flex: 1, height: 104, padding: 16, justifyContent: 'space-between', borderRadius: 18, borderCurve: 'continuous', backgroundColor: primary ? theme.ink : theme.card }}
    >
      <SymbolView name={icon} size={28} tintColor={color} />
      <Text style={{ color, fontSize: 17, fontWeight: '600' }}>{label}</Text>
    </Tap>
  )
}

function Steps() {
  const theme = useTheme()
  return (
    <View testID="home-steps" style={{ gap: 14, backgroundColor: theme.card, borderRadius: 18, borderCurve: 'continuous', padding: 16 }}>
      {t.mobile.steps.map((step, index) => (
        <View key={step} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: theme.fill, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.ink, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{index + 1}</Text>
          </View>
          <Text style={{ flex: 1, color: theme.ink, fontSize: 15 }}>{step}</Text>
        </View>
      ))}
    </View>
  )
}

const REMOVE_WIDTH = 88
const POSTER_HEIGHT = 80

function Recents({ store, onPress }: { store: KeyValue; onPress: (id: string) => Promise<void> }) {
  const theme = useTheme()
  const [list, setList] = useState(() => recents(store))
  if (list.length === 0) return <Steps />
  const remove = (assetId: string) => {
    removeRecent(store, assetId)
    setList(recents(store))
  }
  return (
    <View style={{ gap: 8 }}>
      <Text accessibilityRole="header" style={{ color: theme.ink, fontSize: 22, fontWeight: '700', letterSpacing: -0.3, marginTop: 8 }}>
        {t.recentVideos}
      </Text>
      {list.map((recent) => (
        <RecentRow key={recent.assetId} recent={recent} onPress={() => void onPress(recent.assetId)} onRemove={() => remove(recent.assetId)} />
      ))}
    </View>
  )
}

function RecentRow({ recent, onPress, onRemove }: { recent: Recent; onPress: () => void; onRemove: () => void }) {
  const theme = useTheme()
  const [image, setImage] = useState<string | null>(null)
  const [x] = useState(() => new Animated.Value(0))
  const [open, setOpen] = useState(false)
  const [revealed, setRevealed] = useState(false)
  useEffect(() => {
    void poster(recent.assetId, POSTER_HEIGHT).then(setImage, () => {})
  }, [recent.assetId])
  const slide = (to: number) => {
    setOpen(to !== 0)
    Animated.spring(x, { toValue: to, useNativeDriver: true, bounciness: 0, speed: 18 }).start(({ finished }) => finished && to === 0 && setRevealed(false))
  }
  const swipe = usePanGesture({
    runOnJS: true,
    activeOffsetX: [-12, 12],
    failOffsetY: [-10, 10],
    onActivate: () => setRevealed(true),
    onUpdate: (event) => x.setValue(Math.min(0, (open ? -REMOVE_WIDTH : 0) + event.translationX)),
    onDeactivate: (event) => slide((open ? -REMOVE_WIDTH : 0) + event.translationX < -REMOVE_WIDTH / 2 || event.velocityX < -300 ? -REMOVE_WIDTH : 0)
  })
  return (
    <View style={{ borderRadius: 12, borderCurve: 'continuous', overflow: 'hidden' }}>
      {revealed && (
      <Tap
        testID={`remove-${recent.assetId}`}
        onPress={onRemove}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: REMOVE_WIDTH, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.danger }}
      >
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>{t.mobile.removeRecent}</Text>
      </Tap>
      )}
      <GestureDetector gesture={swipe}>
        <Animated.View style={{ transform: [{ translateX: x }] }}>
          <Tap
            testID={`recent-${recent.assetId}`}
            onPress={() => (open ? slide(0) : onPress())}
            accessibilityActions={[{ name: 'delete', label: t.mobile.removeRecent }]}
            onAccessibilityAction={(event) => event.nativeEvent.actionName === 'delete' && onRemove()}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.card, padding: 10 }}
          >
            <View style={{ width: 64, height: 40, borderRadius: 6, overflow: 'hidden', backgroundColor: theme.fill }}>
              {image && <Image source={{ uri: image }} style={{ width: 64, height: 40 }} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text numberOfLines={1} style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>
                {recent.name}
              </Text>
              <Text style={{ color: theme.muted, fontSize: 13, fontVariant: ['tabular-nums'] }}>
                {formatTime(recent.duration)} · {t.recentClips(recent.clips)}
              </Text>
            </View>
          </Tap>
        </Animated.View>
      </GestureDetector>
    </View>
  )
}
