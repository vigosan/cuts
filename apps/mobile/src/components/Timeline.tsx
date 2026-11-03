import { useEffect, useRef, useState } from 'react'
import { Text, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, useCompetingGestures, usePanGesture, usePinchGesture, useTapGesture } from 'react-native-gesture-handler'
import { Canvas, Image, Rect, RoundedRect, useImage } from '@shopify/react-native-skia'
import { formatDuration, isOverLimit, type Clip } from '@cuts/core/clips'
import { filmstripTiles, PEAKS_PER_SECOND, waveformColumns } from '@cuts/core/filmstrip'
import { nextViewStart } from '@cuts/core/timeline-view'
import { beginDrag, dragTo, type Drag } from '../editor/timeline-drag'
import { hitClip, pinch, timeAt, xAt, type View as TimelineView } from '../editor/timeline-geometry'
import { thumbnail } from '../media'
import { useTheme } from '../theme'

type Props = {
  assetId: string
  duration: number
  currentTime: number
  clips: Clip[]
  selectedId: string | null
  pendingStart?: number | null
  peaks: Float32Array | null
  snap: (time: number) => number
  onSeek: (time: number) => void
  onSelect: (id: string | null) => void
  onDragStart: () => void
  onDrag: (clip: Clip) => void
}

const HEIGHT = 64
const FILM = 40
const WAVE = HEIGHT - FILM
const EDGE_SLOP = 16

export function Timeline({ assetId, duration, currentTime, clips, selectedId, pendingStart = null, peaks, snap, onSeek, onSelect, onDragStart, onDrag }: Props) {
  const theme = useTheme()
  const [width, setWidth] = useState(0)
  const [span, setSpan] = useState(duration)
  const [start, setStart] = useState(0)
  const [touching, setTouching] = useState(false)
  const drag = useRef<{ drag: Drag; view: TimelineView } | null>(null)
  const pinchFrom = useRef<TimelineView | null>(null)

  const shownSpan = Math.min(span || duration, duration)
  const followed = touching ? start : nextViewStart(start, currentTime, duration, shownSpan >= duration ? null : shownSpan)
  if (followed !== start) setStart(followed)
  const view: TimelineView = { start: followed, span: shownSpan || 1, width: width || 1 }

  const tap = useTapGesture({
    runOnJS: true,
    onActivate: (event) => {
      const hit = hitClip(clips, view, event.x, EDGE_SLOP)
      if (hit) return onSelect(hit.id)
      onSelect(null)
      onSeek(timeAt(view, event.x))
    }
  })
  const pan = usePanGesture({
    runOnJS: true,
    maxPointers: 1,
    minDistance: 4,
    onActivate: (event) => {
      setTouching(true)
      const begun = beginDrag(clips, view, event.x - event.translationX, EDGE_SLOP)
      drag.current = { drag: begun, view }
      if (begun.kind === 'clip') {
        onSelect(begun.clip.id)
        onDragStart()
      }
    },
    onUpdate: (event) => {
      const current = drag.current
      if (!current) return
      const moved = dragTo(current.drag, event.translationX, current.view, duration, snap)
      if (moved) onDrag(moved)
      else onSeek(timeAt(view, event.x))
    },
    onFinalize: () => {
      drag.current = null
      setTouching(false)
    }
  })
  const zoom = usePinchGesture({
    runOnJS: true,
    onActivate: () => {
      setTouching(true)
      pinchFrom.current = view
    },
    onUpdate: (event) => {
      if (!pinchFrom.current) return
      const next = pinch(pinchFrom.current, duration, event.scale, event.focalX)
      setSpan(next.span)
      setStart(next.start)
    },
    onFinalize: () => {
      pinchFrom.current = null
      setTouching(false)
    }
  })
  const gesture = useCompetingGestures(zoom, pan, tap)

  const tileWidth = Math.round((FILM * 16) / 9)
  const tiles = width ? filmstripTiles(view.start, view.span, width, tileWidth, duration) : []
  const columns = peaks && width ? waveformColumns(peaks, PEAKS_PER_SECOND, view.start, view.span, Math.floor(width / 3)) : null
  const pending = pendingStart !== null ? { start: pendingStart, end: Math.max(pendingStart, currentTime) } : null

  return (
    <GestureDetector gesture={gesture}>
      <View testID="timeline" onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)} style={{ height: HEIGHT, borderRadius: 8, overflow: 'hidden', backgroundColor: '#8a8a8a' }}>
        <Canvas style={{ position: 'absolute', left: 0, top: 0, width, height: HEIGHT }}>
          {tiles.map((tile) => (
            <Tile key={`${tile.time}`} assetId={assetId} time={tile.time} x={(tile.left / 100) * width} width={tileWidth} />
          ))}
          <Rect x={0} y={FILM} width={width} height={WAVE} color="#3a3a3c" />
          {columns &&
            Array.from(columns, (peak, column) => (
              <Rect key={column} x={column * 3} y={FILM + WAVE / 2 - (peak * WAVE) / 2} width={2} height={Math.max(1, peak * WAVE)} color="#c7c7cc" />
            ))}
          {clips.map((clip) => (
            <RoundedRect
              key={clip.id}
              x={xAt(view, clip.start)}
              y={1.5}
              width={Math.max(2, xAt(view, clip.end) - xAt(view, clip.start))}
              height={HEIGHT - 3}
              r={5}
              style="stroke"
              strokeWidth={clip.id === selectedId ? 3 : 2}
              color={clip.id === selectedId ? theme.accent : '#ffffff'}
            />
          ))}
          {pending && <Rect x={xAt(view, pending.start)} y={0} width={Math.max(2, xAt(view, pending.end) - xAt(view, pending.start))} height={HEIGHT} color="rgba(253,224,71,0.35)" />}
          <Rect x={xAt(view, currentTime) - 1} y={0} width={2} height={HEIGHT} color="#ef4444" />
        </Canvas>
        {clips.map((clip, index) => (
          <ClipLabel key={clip.id} left={xAt(view, clip.start)} number={index + 1} />
        ))}
        {clips
          .filter((clip) => clip.id === selectedId)
          .map((clip) => (
            <Duration key={clip.id} testID={`clip-duration-${clip.id}`} right={width - xAt(view, clip.end)} seconds={clip.end - clip.start} over={isOverLimit(clip)} danger={theme.danger} />
          ))}
        {pending && (
          <Duration testID="pending-duration" right={width - xAt(view, pending.end)} seconds={pending.end - pending.start} over={isOverLimit({ id: '', ...pending })} danger={theme.danger} />
        )}
      </View>
    </GestureDetector>
  )
}

function Tile({ assetId, time, x, width }: { assetId: string; time: number; x: number; width: number }) {
  const [uri, setUri] = useState<string | null>(null)
  useEffect(() => {
    let live = true
    void thumbnail(assetId, time, FILM * 2).then((file) => live && setUri(file), () => {})
    return () => {
      live = false
    }
  }, [assetId, time])
  const image = useImage(uri)
  if (!image) return null
  return <Image image={image} x={x} y={0} width={width} height={FILM} fit="cover" />
}

function ClipLabel({ left, number }: { left: number; number: number }) {
  return (
    <Text style={{ position: 'absolute', left: left + 4, top: 4, color: '#fff', backgroundColor: 'rgba(0,0,0,0.6)', fontSize: 10, paddingHorizontal: 3, borderRadius: 3, overflow: 'hidden' }}>
      {number}
    </Text>
  )
}

function Duration({ testID, right, seconds, over, danger }: { testID: string; right: number; seconds: number; over: boolean; danger: string }) {
  return (
    <Text
      testID={testID}
      style={{ position: 'absolute', right: right + 4, bottom: 4, fontSize: 11, fontWeight: '600', fontVariant: ['tabular-nums'], color: over ? danger : '#fff', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 4, borderRadius: 4, overflow: 'hidden' }}
    >
      {formatDuration(seconds)}
    </Text>
  )
}
