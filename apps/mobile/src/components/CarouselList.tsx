import { useEffect, useRef, useState } from 'react'
import { Animated, Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { SymbolView } from 'expo-symbols'
import { clipDuration, formatDuration, formatTime, isOverLimit, isPastCarousel, MAX_CAROUSEL_ITEMS, type Clip } from '@cuts/core/clips'
import { reorderTarget, rowShift } from '../editor/physics'
import { haptics } from '../haptics'
import { t } from '../i18n'
import type { Theme } from '../theme'
import { Tap } from './Tap'

type Props = {
  clips: Clip[]
  selectedId: string | null
  picked: string[] | null
  progress?: Record<string, number>
  theme: Theme
  onPress: (clip: Clip) => void
  onReorder: (from: number, to: number) => void
}

const ROW_HEIGHT = 44
const GAP = 4
const settle = (value: Animated.Value, toValue: number) =>
  Animated.spring(value, { toValue, useNativeDriver: true, bounciness: 0, speed: 16 }).start()

export function CarouselList({ clips, selectedId, picked, progress = {}, theme, onPress, onReorder }: Props) {
  const [dragging, setDragging] = useState<{ index: number; offset: number; height: number } | null>(null)
  const [settled, setSettled] = useState<{ id: string; from: number; at: number } | null>(null)
  const target = dragging ? reorderTarget(dragging.index, dragging.offset, dragging.height + GAP, clips.length) : null
  return (
    <View style={{ gap: GAP }}>
      {clips.map((clip, index) => (
        <Row
          key={clip.id}
          clip={clip}
          index={index}
          count={clips.length}
          selected={clip.id === selectedId}
          picked={picked ? picked.includes(clip.id) : null}
          progress={progress[clip.id]}
          lifted={dragging?.index === index}
          offset={dragging?.index === index ? dragging.offset : dragging && target !== null ? rowShift(index, dragging.index, target, dragging.height + GAP) : 0}
          settleFrom={settled?.id === clip.id ? settled : null}
          theme={theme}
          onPress={() => onPress(clip)}
          onMove={(to) => onReorder(index, to)}
          onDrag={(offset, height) => setDragging(offset === null ? null : { index, offset, height })}
          onDrop={(offset, height) => {
            const to = reorderTarget(index, offset, height + GAP, clips.length)
            setDragging(null)
            setSettled({ id: clip.id, from: offset - (to - index) * (height + GAP), at: Date.now() })
            if (to !== index) onReorder(index, to)
          }}
        />
      ))}
    </View>
  )
}

type RowProps = {
  clip: Clip
  index: number
  count: number
  selected: boolean
  picked: boolean | null
  progress?: number
  lifted: boolean
  offset: number
  settleFrom: { from: number; at: number } | null
  theme: Theme
  onPress: () => void
  onMove: (to: number) => void
  onDrag: (offset: number | null, height: number) => void
  onDrop: (offset: number, height: number) => void
}

function Row({ clip, index, count, selected, picked, progress, lifted, offset, settleFrom, theme, onPress, onMove, onDrag, onDrop }: RowProps) {
  const past = isPastCarousel(index)
  const clamp = (to: number) => Math.min(count - 1, Math.max(0, to))
  const height = useRef(ROW_HEIGHT)
  const done = progress !== undefined && progress >= 1
  const [y] = useState(() => new Animated.Value(0))
  const [lift] = useState(() => new Animated.Value(0))

  useEffect(() => {
    if (lifted) y.setValue(offset)
    else if (offset === 0) y.setValue(0)
    else settle(y, offset)
  }, [lifted, offset, y])

  useEffect(() => {
    if (!settleFrom) return
    y.setValue(settleFrom.from)
    settle(y, 0)
  }, [settleFrom, y])

  useEffect(() => settle(lift, lifted ? 1 : 0), [lifted, lift])
  const reorder = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 250,
    onActivate: () => {
      haptics.lift()
      onDrag(0, height.current)
    },
    onUpdate: (event) => onDrag(event.translationY, height.current),
    onDeactivate: (event) => {
      haptics.drop()
      onDrop(event.translationY, height.current)
    }
  })
  return (
    <Animated.View
      style={{
        zIndex: lifted ? 2 : 0,
        shadowColor: '#000',
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: lifted ? 0.18 : 0,
        transform: [{ translateY: y }, { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) }]
      }}
    >
    <Tap
      testID={`clip-row-${clip.id}`}
      onPress={onPress}
      accessibilityHint={past ? t.pastCarousel(MAX_CAROUSEL_ITEMS) : undefined}
      accessibilityActions={[
        { name: 'moveUp', label: t.mobile.moveUp },
        { name: 'moveDown', label: t.mobile.moveDown }
      ]}
      onAccessibilityAction={(event) => onMove(clamp(index + (event.nativeEvent.actionName === 'moveUp' ? -1 : 1)))}
      onLayout={(event) => {
        height.current = event.nativeEvent.layout.height
      }}
      style={{
        minHeight: ROW_HEIGHT,
        overflow: 'hidden',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
        opacity: past ? 0.45 : 1,
        backgroundColor: selected || picked ? theme.fill : theme.card
      }}
    >
      {progress !== undefined && !done && (
        <View testID={`clip-progress-${clip.id}`} style={{ position: 'absolute', left: 0, bottom: 0, height: 3, width: `${progress * 100}%`, backgroundColor: theme.ink }} />
      )}
      {picked !== null && <SymbolView name={picked ? 'checkmark.circle.fill' : 'circle'} size={20} tintColor={theme.ink} />}
      <View
        accessibilityLabel={index === 0 ? t.cover : undefined}
        style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: index === 0 || selected ? theme.ink : theme.fill }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: index === 0 || selected ? theme.inverse : theme.ink }}>{index + 1}</Text>
      </View>
      <Text style={{ flexShrink: 1, color: theme.ink, fontSize: 15, fontVariant: ['tabular-nums'] }}>
        {`${formatTime(clip.start)} → ${formatTime(clip.end)}`}
      </Text>
      <Text
        style={{
          marginLeft: 'auto',
          fontSize: 12,
          fontVariant: ['tabular-nums'],
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: 6,
          overflow: 'hidden',
          color: isOverLimit(clip) ? theme.danger : theme.ink,
          backgroundColor: theme.fill
        }}
      >
        {formatDuration(clipDuration(clip))}
      </Text>
      {done && (
        <View testID={`clip-done-${clip.id}`} accessibilityLabel={t.clipExported}>
          <SymbolView name="checkmark.circle.fill" size={20} tintColor={theme.ink} />
        </View>
      )}
      <GestureDetector gesture={reorder}>
        <View accessibilityLabel={t.mobile.reorder} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
          <SymbolView name="line.3.horizontal" size={16} tintColor={theme.muted} />
        </View>
      </GestureDetector>
    </Tap>
    </Animated.View>
  )
}
