import { useEffect, useReducer, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEvent } from 'expo'
import { randomUUID } from 'expo-crypto'
import { SymbolView, type SFSymbol } from 'expo-symbols'
import { useVideoPlayer, VideoView } from 'expo-video'
import { snapToBeat } from '@cuts/core/beats'
import { defaultBaseName, formatTime } from '@cuts/core/clips'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { Timeline } from '../components/Timeline'
import { editorReducer, initialEditor } from '../editor/editor'
import { endHere, startHere } from '../editor/marks'
import { loadPreferences } from '../editor/preferences'
import { loadSession, saveSession, touchRecent, type KeyValue } from '../editor/sessions'
import { t } from '../i18n'
import { readPeaks, saveFrame, type AssetInfo } from '../media'
import { seek } from '../seek'
import { useTheme, type Theme } from '../theme'

type Props = { asset: AssetInfo; store: KeyValue; onBack: () => void }

const SAVE_DELAY_MS = 300
const NOTICE_MS = 5000

export function Cut({ asset, store, onBack }: Props) {
  const theme = useTheme()
  const [preferences] = useState(() => loadPreferences(store))
  const [stored] = useState(() => loadSession(store, asset.id))
  const [state, dispatch] = useReducer(editorReducer, null, () =>
    editorReducer(initialEditor(preferences.settings), { type: 'load', session: stored, defaults: preferences.settings })
  )
  const [baseName] = useState(() => stored?.baseName ?? defaultBaseName(asset.name))
  const [peaks, setPeaks] = useState<Float32Array | null>(null)
  const [menu, setMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const player = useVideoPlayer(asset.uri, (created) => {
    created.timeUpdateEventInterval = 0.1
  })
  const { currentTime: playedTime } = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 })
  const [sought, setSought] = useState<{ time: number; after: number } | null>(null)
  const currentTime = sought && sought.after === playedTime ? sought.time : playedTime
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing, oldIsPlaying: false })
  const clips = state.history.present.clips

  useEffect(() => {
    void readPeaks(asset.id).then(setPeaks, () => setPeaks(null))
  }, [asset.id])

  useEffect(() => {
    const timer = setTimeout(() => {
      saveSession(store, asset.id, { clips, clipSettings: state.clipSettings, defaultSettings: state.defaultSettings, baseName })
      touchRecent(store, { assetId: asset.id, name: asset.name, duration: asset.duration, clips: clips.length, openedAt: Date.now() })
    }, SAVE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [store, asset, clips, state.clipSettings, state.defaultSettings, baseName])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), NOTICE_MS)
    return () => clearTimeout(timer)
  }, [notice])

  const at = (time: number) => (state.magnet && peaks ? snapToBeat(time, peaks, PEAKS_PER_SECOND) : time)
  const seekTo = (time: number) => {
    seek(player, time, asset.duration)
    setSought({ time: player.currentTime, after: playedTime })
  }
  const step = (frames: number) => {
    player.pause()
    seekTo(player.currentTime + frames / asset.frameRate)
  }
  const selected = state.selectedId
  const framing = selected ? (state.clipSettings[selected] ?? state.defaultSettings) : state.defaultSettings

  const saveCurrentFrame = async () => {
    setMenu(false)
    await saveFrame(asset.id, player.currentTime, { format: preferences.format, framing: framing.framing, cropX: framing.cropX, cropY: framing.cropY })
    setNotice(t.mobile.frameSaved)
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <View style={{ flex: 1, paddingHorizontal: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, height: 44 }}>
          <Pressable testID="back" onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="chevron.left" theme={theme} />
            <Text style={{ color: theme.ink, fontSize: 17 }}>{t.mobile.back}</Text>
          </Pressable>
          <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', color: theme.ink, fontSize: 17, fontWeight: '600' }}>
            {baseName}
          </Text>
          <Pressable testID="undo" accessibilityLabel={t.menuUndo} onPress={() => dispatch({ type: 'undo' })} disabled={state.history.past.length === 0}>
            <Icon name="arrow.uturn.backward" theme={theme} faded={state.history.past.length === 0} />
          </Pressable>
          <Pressable testID="more" accessibilityLabel={t.mobile.more} onPress={() => setMenu(!menu)}>
            <Icon name="ellipsis.circle" theme={theme} />
          </Pressable>
        </View>
        {menu && (
          <View style={{ position: 'absolute', top: 48, right: 12, zIndex: 10, backgroundColor: theme.card, borderRadius: 12, padding: 4, shadowOpacity: 0.15, shadowRadius: 12 }}>
            <Pressable testID="save-frame" onPress={() => void saveCurrentFrame()} style={{ padding: 12 }}>
              <Text style={{ color: theme.ink, fontSize: 15 }}>{t.mobile.saveFrame}</Text>
            </Pressable>
          </View>
        )}
        <View style={{ aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}>
          <VideoView player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
        </View>
        <View style={{ backgroundColor: theme.card, borderRadius: 14, padding: 8, gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Pressable
              testID="play"
              accessibilityLabel={isPlaying ? t.pause : t.play}
              onPress={() => (isPlaying ? player.pause() : player.play())}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' }}
            >
              <Icon name={isPlaying ? 'pause.fill' : 'play.fill'} theme={theme} inverse />
            </Pressable>
            <Text style={{ color: theme.ink, fontSize: 15, fontVariant: ['tabular-nums'] }}>
              {formatTime(currentTime)} <Text style={{ color: theme.muted }}>/ {formatTime(asset.duration)}</Text>
            </Text>
            <Pressable
              testID="magnet"
              accessibilityLabel={state.magnet ? t.mobile.magnetOn : t.mobile.magnetOff}
              accessibilityState={{ selected: state.magnet }}
              onPress={() => dispatch({ type: 'magnet' })}
              style={{ marginLeft: 'auto', padding: 8, borderRadius: 10, backgroundColor: state.magnet ? theme.ink : theme.fill }}
            >
              <Icon name="metronome" theme={theme} inverse={state.magnet} />
            </Pressable>
          </View>
          <Timeline
            assetId={asset.id}
            duration={asset.duration}
            currentTime={currentTime}
            clips={clips}
            selectedId={selected}
            pendingStart={state.history.present.pendingStart}
            peaks={peaks}
            snap={at}
            onSeek={seekTo}
            onSelect={(id) => dispatch({ type: 'select', id })}
            onDragStart={() => dispatch({ type: 'checkpoint' })}
            onDrag={(clip) => dispatch({ type: 'replace', clip, transient: true })}
          />
          <View style={{ flexDirection: 'row', gap: 6 }}>
            <Pill testID="start-here" label={t.mobile.startHere} theme={theme} grow onPress={() => dispatch(startHere(state.history.present, at(player.currentTime), selected))} />
            <Pill testID="previous-frame" icon="chevron.left" label={t.mobile.previousFrame} theme={theme} onPress={() => step(-1)} />
            <Pill testID="next-frame" icon="chevron.right" label={t.mobile.nextFrame} theme={theme} onPress={() => step(1)} />
            <Pill
              testID="end-here"
              label={t.mobile.endHere}
              theme={theme}
              grow
              onPress={() => dispatch(endHere(state.history.present, at(player.currentTime), selected, randomUUID()))}
            />
          </View>
        </View>
        <View style={{ flex: 1 }} />
        <Pressable testID="export" style={{ backgroundColor: theme.ink, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 }}>
          <Text style={{ color: theme.inverse, fontSize: 17, fontWeight: '600' }}>{t.exportClips(clips.length)}</Text>
        </Pressable>
        {notice && (
          <Text testID="notice" style={{ position: 'absolute', bottom: 72, alignSelf: 'center', color: theme.inverse, backgroundColor: theme.ink, padding: 10, borderRadius: 10, overflow: 'hidden' }}>
            {notice}
          </Text>
        )}
      </View>
    </SafeAreaView>
  )
}

function Icon({ name, theme, inverse, faded }: { name: SFSymbol; theme: Theme; inverse?: boolean; faded?: boolean }) {
  return <SymbolView name={name} size={20} tintColor={inverse ? theme.inverse : faded ? theme.muted : theme.ink} />
}

type PillProps = { testID: string; label: string; icon?: SFSymbol; theme: Theme; grow?: boolean; onPress: () => void }

function Pill({ testID, label, icon, theme, grow, onPress }: PillProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexGrow: grow ? 1 : 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.fill, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }}
    >
      {icon ? <Icon name={icon} theme={theme} /> : <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>}
    </Pressable>
  )
}
