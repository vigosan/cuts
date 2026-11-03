import { useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useEvent } from 'expo'
import { randomUUID } from 'expo-crypto'
import { Stack } from 'expo-router'
import { SymbolView, type SFSymbol } from 'expo-symbols'
import { useVideoPlayer } from 'expo-video'
import { snapToBeat } from '@cuts/core/beats'
import { formatTime, type Clip } from '@cuts/core/clips'
import { PEAKS_PER_SECOND } from '@cuts/core/filmstrip'
import { CarouselList } from '../components/CarouselList'
import { Stage } from '../components/Stage'
import { Timeline } from '../components/Timeline'
import { endHere, startHere } from '../editor/marks'
import { panelExpanded, panelOffset } from '../editor/physics'
import { useEditor } from '../editor/session'
import { t } from '../i18n'
import { saveFrame } from '../media'
import { seek } from '../seek'
import { haptics } from '../haptics'
import { useTheme, type Theme } from '../theme'
import { backItem, cutHeaderItems } from './cut-header'
import { Tap } from '../components/Tap'

export type SheetKind = 'clip' | 'export'

type Props = { onBack: () => void; onOpenSheet: (sheet: SheetKind) => void }

export function Cut({ onBack, onOpenSheet }: Props) {
  const theme = useTheme()
  const { asset, state, dispatch, clips, shownSettings, baseName, format, peaks, suggest, exportLabel, progress, notice, setNotice } = useEditor()
  const player = useVideoPlayer(asset.uri, (created) => {
    created.timeUpdateEventInterval = 0.1
  })
  const { currentTime: playedTime } = useEvent(player, 'timeUpdate', { currentTime: 0, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 })
  const [sought, setSought] = useState<{ time: number; after: number } | null>(null)
  const currentTime = sought && sought.after === playedTime ? sought.time : playedTime
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing, oldIsPlaying: false })
  const selected = state.selectedId
  const picking = state.picked !== null
  const [expanded, setExpanded] = useState(false)
  const [travel, setTravel] = useState(200)
  const [lift] = useState(() => new Animated.Value(0))
  const settle = (from: number) => {
    lift.setValue(from)
    Animated.spring(lift, { toValue: 0, useNativeDriver: true, bounciness: 0, speed: 18 }).start()
  }
  const resize = (next: boolean, at: number) => {
    if (next === expanded) return settle(at)
    setExpanded(next)
    settle(next ? at + travel : at - travel)
  }
  const grow = usePanGesture({
    runOnJS: true,
    activeOffsetY: [-6, 6],
    onUpdate: (event) => lift.setValue(panelOffset(expanded, event.translationY, travel)),
    onDeactivate: (event) =>
      resize(panelExpanded(expanded, event.translationY, event.velocityY, travel), panelOffset(expanded, event.translationY, travel))
  })

  const at = (time: number) => (state.magnet && peaks && time * PEAKS_PER_SECOND < peaks.length ? snapToBeat(time, peaks, PEAKS_PER_SECOND) : time)
  const seekTo = (time: number) => {
    seek(player, time, asset.duration)
    setSought({ time: player.currentTime, after: playedTime })
  }
  const step = (frames: number) => {
    player.pause()
    seekTo(player.currentTime + frames / asset.frameRate)
  }

  const split = () => {
    const time = player.currentTime
    const inside = (clip: Clip) => clip.start < time && time < clip.end
    const chosen = clips.find((clip) => clip.id === selected && inside(clip)) ?? clips.find(inside)
    if (chosen) dispatch({ type: 'split', id: chosen.id, time, newId: randomUUID() })
  }

  const pressRow = (clip: Clip) => {
    if (state.picked) return dispatch({ type: 'pick', id: clip.id })
    if (clip.id === selected) return dispatch({ type: 'select', id: null })
    dispatch({ type: 'select', id: clip.id })
    seekTo(clip.start)
  }

  const saveCurrentFrame = async () => {
    await saveFrame(asset.id, player.currentTime, { format, framing: shownSettings.framing, cropX: shownSettings.cropX, cropY: shownSettings.cropY })
    setNotice(t.mobile.frameSaved)
  }

  return (
    <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          title: baseName,
          unstable_headerLeftItems: () => backItem(onBack),
          unstable_headerRightItems: () =>
            cutHeaderItems({
              canUndo: state.history.past.length > 0,
              canRedo: state.history.future.length > 0,
              onUndo: () => dispatch({ type: 'undo' }),
              onRedo: () => dispatch({ type: 'redo' }),
              onSaveFrame: () => void saveCurrentFrame()
            })
        }}
      />
      <View style={{ flex: 1, paddingHorizontal: 12, paddingTop: 8, gap: 8 }}>
        <Stage
          player={player}
          asset={asset}
          format={format}
          settings={shownSettings}
          currentTime={currentTime}
          onCrop={(zone) => dispatch({ type: 'settings', change: zone })}
        />
        {!expanded && (
          <View onLayout={(event) => setTravel(event.nativeEvent.layout.height + 8)} style={{ gap: 8 }}>
            <View style={{ backgroundColor: theme.card, borderRadius: 14, padding: 8, gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Tap
                  testID="play"
                  accessibilityLabel={isPlaying ? t.mobile.pause : t.mobile.play}
                  onPress={() => (isPlaying ? player.pause() : player.play())}
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.ink, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Icon name={isPlaying ? 'pause.fill' : 'play.fill'} theme={theme} inverse />
                </Tap>
                <Text style={{ color: theme.ink, fontSize: 15, fontVariant: ['tabular-nums'] }}>
                  {formatTime(currentTime)} <Text style={{ color: theme.muted }}>/ {formatTime(asset.duration)}</Text>
                </Text>
                <Tap
                  testID="magnet"
                  accessibilityLabel={state.magnet ? t.mobile.magnetOn : t.mobile.magnetOff}
                  accessibilityState={{ selected: state.magnet }}
                  onPress={() => {
                    haptics.tick()
                    dispatch({ type: 'magnet' })
                  }}
                  style={{ marginLeft: 'auto', height: 44, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: state.magnet ? theme.ink : theme.fill }}
                >
                  <Icon name="metronome" theme={theme} inverse={state.magnet} />
                  <Text style={{ color: state.magnet ? theme.inverse : theme.ink, fontSize: 15, fontWeight: '600' }}>{t.mobile.beat}</Text>
                </Tap>
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
                onPressClip={pressRow}
                onDragStart={() => dispatch({ type: 'checkpoint' })}
                onDrag={(clip) => {
                  const before = clips.find((candidate) => candidate.id === clip.id)
                  if (state.magnet && peaks && before && (before.start !== clip.start || before.end !== clip.end)) haptics.tick()
                  dispatch({ type: 'replace', clip, transient: true })
                }}
              />
              {state.history.present.pendingStart !== null && (
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 36, paddingLeft: 10, borderRadius: 10, backgroundColor: theme.fill }}>
                  <Text style={{ flex: 1, color: theme.ink, fontSize: 14, fontVariant: ['tabular-nums'] }}>
                    {t.mobile.markingFrom(formatTime(state.history.present.pendingStart))}
                  </Text>
                  <Tap testID="cancel-mark" onPress={() => dispatch({ type: 'cancelMark' })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 12 }}>
                    <Text style={{ color: theme.ink, fontSize: 14, fontWeight: '600' }}>{t.cancel}</Text>
                  </Tap>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Pill testID="start-here" label={selected ? t.mobile.moveStartHere : t.mobile.startHere} theme={theme} grow onPress={() => {
                    haptics.mark()
                    dispatch(startHere(state.history.present, at(player.currentTime), selected))
                  }} />
                <Pill testID="previous-frame" icon="chevron.left" label={t.mobile.previousFrame} theme={theme} onPress={() => step(-1)} />
                <Pill testID="next-frame" icon="chevron.right" label={t.mobile.nextFrame} theme={theme} onPress={() => step(1)} />
                <Pill
                  testID="end-here"
                  label={selected ? t.mobile.moveEndHere : t.mobile.endHere}
                  theme={theme}
                  grow
                  onPress={() => {
                    haptics.mark()
                    dispatch(endHere(state.history.present, at(player.currentTime), selected, randomUUID()))
                  }}
                />
              </View>
            </View>
            {!picking && (
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {selected && <Pill testID="split" icon="scissors" label={t.mobile.split} theme={theme} onPress={split} />}
              <Pill testID="clip-settings" label={selected ? t.mobile.fadesAndFraming : `${t.mobile.fadesAndFraming} · ${t.settingsScopeAll}`} theme={theme} grow onPress={() => onOpenSheet('clip')} />
              {selected && <Pill testID="delete-clip" icon="trash" label={t.deleteClip} theme={theme} onPress={() => {
                  dispatch({ type: 'remove', id: selected })
                  setNotice(t.mobile.clipDeleted, true)
                }} />}
            </View>
            )}
          </View>
        )}
        <Animated.View style={{ flex: 1, zIndex: 1, backgroundColor: theme.card, borderRadius: 14, padding: 8, paddingTop: 0, gap: 6, transform: [{ translateY: lift }] }}>
          <GestureDetector gesture={grow}>
            <View>
              <Tap
                testID="carousel-header"
                accessibilityRole="button"
                accessibilityLabel={expanded ? t.mobile.carouselShrink : t.mobile.carouselGrow}
                onPress={() => resize(!expanded, 0)}
                hitSlop={{ top: 8, bottom: 8 }}
                style={{ alignItems: 'center', paddingVertical: 8 }}
              >
                <View style={{ width: 36, height: 5, borderRadius: 3, backgroundColor: theme.fill }} />
              </Tap>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }}>
                <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '700' }}>{t.carousel}</Text>
                {clips.length > 0 && (
                  <>
                    <Tap testID="suggest" onPress={() => void suggest()} style={{ marginLeft: 'auto', minHeight: 36, justifyContent: 'center', backgroundColor: theme.ink, borderRadius: 10, paddingHorizontal: 12 }}>
                      <Text style={{ color: theme.inverse, fontSize: 15, fontWeight: '600' }}>✦ {t.suggestShort}</Text>
                    </Tap>
                    <Tap testID="select" onPress={() => dispatch({ type: 'pickMode', on: !picking })} style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 }}>
                      <Text style={{ color: theme.ink, fontSize: 15 }}>{picking ? t.mobile.done : t.mobile.select}</Text>
                    </Tap>
                  </>
                )}
              </View>
            </View>
          </GestureDetector>
          {clips.length === 0 ? (
            <View testID="suggest-empty" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 }}>
              <Tap testID="suggest-moments" onPress={() => void suggest()} style={{ alignSelf: 'stretch', backgroundColor: theme.ink, borderRadius: 12, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={{ color: theme.inverse, fontSize: 16, fontWeight: '600' }}>✦ {t.suggestMoments}</Text>
              </Tap>
              <Text style={{ color: theme.muted, fontSize: 13, textAlign: 'center' }}>{t.mobile.suggestExplain}</Text>
            </View>
          ) : (
            <CarouselList
              clips={clips}
              selectedId={selected}
              picked={state.picked}
              theme={theme}
              onPress={pressRow}
              progress={progress}
              onReorder={(from, to) => dispatch({ type: 'reorder', from, to })}
            />
          )}
        </Animated.View>
        <Tap testID="export" onPress={() => clips.length > 0 && onOpenSheet('export')} style={{ alignSelf: 'stretch', backgroundColor: theme.ink, borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
          <Text style={{ color: theme.inverse, fontSize: 17, fontWeight: '600' }}>{exportLabel}</Text>
        </Tap>
        {notice && (
          <View testID="notice" style={{ position: 'absolute', bottom: 72, alignSelf: 'center', zIndex: 2, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.ink, paddingLeft: 14, paddingRight: notice.undo ? 4 : 14, minHeight: 44, borderRadius: 12 }}>
            <Text style={{ color: theme.inverse, fontSize: 15 }}>{notice.text}</Text>
            {notice.undo && (
              <Tap
                testID="notice-undo"
                onPress={() => {
                  dispatch({ type: 'undo' })
                  setNotice(null)
                }}
                style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 10 }}
              >
                <Text style={{ color: theme.accent, fontSize: 15, fontWeight: '600' }}>{t.mobile.undo}</Text>
              </Tap>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  )
}

function Icon({ name, theme, inverse }: { name: SFSymbol; theme: Theme; inverse?: boolean }) {
  return <SymbolView name={name} size={20} tintColor={inverse ? theme.inverse : theme.ink} />
}

type PillProps = { testID: string; label: string; icon?: SFSymbol; theme: Theme; grow?: boolean; onPress: () => void }

function Pill({ testID, label, icon, theme, grow, onPress }: PillProps) {
  return (
    <Tap
      testID={testID}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexGrow: grow ? 1 : 0, minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.fill, borderRadius: 10, paddingHorizontal: 12 }}
    >
      {icon ? <Icon name={icon} theme={theme} /> : <Text style={{ color: theme.ink, fontSize: 15, fontWeight: '600' }}>{label}</Text>}
    </Tap>
  )
}
