import { useState } from 'react'
import { Text, View } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { SymbolView } from 'expo-symbols'
import { clipDuration, formatDuration, formatTime, isOverLimit, isPastCarousel, MAX_CAROUSEL_ITEMS, type Clip } from '@cuts/core/clips'
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

const ROW_HEIGHT = 36

export function CarouselList({ clips, selectedId, picked, progress = {}, theme, onPress, onReorder }: Props) {
  const [dragging, setDragging] = useState<{ index: number; offset: number } | null>(null)
  return (
    <View>
      {clips.map((clip, index) => (
        <Row
          key={clip.id}
          clip={clip}
          index={index}
          count={clips.length}
          selected={clip.id === selectedId}
          picked={picked ? picked.includes(clip.id) : null}
          progress={progress[clip.id]}
          offset={dragging?.index === index ? dragging.offset : 0}
          theme={theme}
          onPress={() => onPress(clip)}
          onMove={(to) => onReorder(index, to)}
          onDrag={(offset) => setDragging(offset === null ? null : { index, offset })}
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
  offset: number
  theme: Theme
  onPress: () => void
  onMove: (to: number) => void
  onDrag: (offset: number | null) => void
}

function Row({ clip, index, count, selected, picked, progress, offset, theme, onPress, onMove, onDrag }: RowProps) {
  const past = isPastCarousel(index)
  const clamp = (to: number) => Math.min(count - 1, Math.max(0, to))
  const reorder = usePanGesture({
    runOnJS: true,
    activateAfterLongPress: 250,
    onActivate: () => haptics.lift(),
    onUpdate: (event) => onDrag(event.translationY),
    onDeactivate: (event) => {
      haptics.drop()
      onDrag(null)
      const to = clamp(index + Math.round(event.translationY / ROW_HEIGHT))
      if (to !== index) onMove(to)
    },
    onFinalize: () => onDrag(null)
  })
  return (
    <Tap
      testID={`clip-row-${clip.id}`}
      onPress={onPress}
      accessibilityHint={past ? t.pastCarousel(MAX_CAROUSEL_ITEMS) : undefined}
      accessibilityActions={[
        { name: 'moveUp', label: t.mobile.moveUp },
        { name: 'moveDown', label: t.mobile.moveDown }
      ]}
      onAccessibilityAction={(event) => onMove(clamp(index + (event.nativeEvent.actionName === 'moveUp' ? -1 : 1)))}
      style={{
        height: ROW_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 6,
        borderRadius: 8,
        opacity: past ? 0.45 : 1,
        backgroundColor: selected || picked ? theme.fill : theme.card,
        transform: [{ translateY: offset }],
        zIndex: offset ? 1 : 0
      }}
    >
      {progress !== undefined && (
        <View testID={`clip-progress-${clip.id}`} style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${progress * 100}%`, borderRadius: 8, backgroundColor: theme.fill }} />
      )}
      {picked !== null && <SymbolView name={picked ? 'checkmark.circle.fill' : 'circle'} size={20} tintColor={theme.ink} />}
      <View
        accessibilityLabel={index === 0 ? t.cover : undefined}
        style={{ width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: index === 0 || selected ? theme.ink : theme.fill }}
      >
        <Text style={{ fontSize: 11, fontWeight: '700', color: index === 0 || selected ? theme.inverse : theme.ink }}>{index + 1}</Text>
      </View>
      <Text style={{ color: theme.ink, fontSize: 14, fontVariant: ['tabular-nums'] }}>
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
      <GestureDetector gesture={reorder}>
        <View accessibilityLabel={t.mobile.reorder} style={{ paddingHorizontal: 6, paddingVertical: 8 }}>
          <SymbolView name="line.3.horizontal" size={16} tintColor={theme.muted} />
        </View>
      </GestureDetector>
    </Tap>
  )
}
