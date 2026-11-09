import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Image, Text, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture, usePinchGesture, type PanGesture, type PinchGesture } from 'react-native-gesture-handler'
import { useVideoPlayer, VideoView, type VideoPlayer } from 'expo-video'
import { SymbolView } from 'expo-symbols'
import { BAR_ASPECT, WAVE_ASPECT, defaultBarPlacement, defaultWavePlacement, type AudioExtras } from '@cuts/core/audio-layers'
import { cropBox, dragCrop, videoBox, type Box } from '@cuts/core/crop'
import type { ClipSettings } from '@cuts/core/fades'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import {
  clampPlacement,
  heldGuides,
  moveOverlay,
  OVERLAY_MARGIN,
  outputFrame,
  overlayBox,
  previewFrame,
  scaleOverlay,
  type Guide,
  type Overlay,
  type OverlayPlacement,
  type Size
} from '@cuts/core/overlay'
import { stepCrop } from '../editor/crop-frame'
import { t } from '../i18n'
import { backgroundUri, overlayUri, thumbnail, type AssetInfo, type Background } from '../media'
import { useTheme } from '../theme'
import { Tap } from './Tap'

type Zone = { cropX: number; cropY: number }

type Props = {
  player: VideoPlayer
  asset: AssetInfo
  format: OutputFormat
  settings: ClipSettings
  currentTime: number
  onCrop: (zone: Zone) => void
  source: Size
  overlay: Overlay | null
  onOverlay: (placement: OverlayPlacement) => void
  onOverlayMissing: () => void
  background?: Background | null
  extras?: AudioExtras
  onExtras?: (extras: AudioExtras) => void
  onAddBackground?: () => void
  onBackgroundMissing?: () => void
}

type LayerKind = 'overlay' | 'wave' | 'bar'

type TouchLayer = { placement: OverlayPlacement; aspect: number; onChange: (placement: OverlayPlacement) => void }

const DIM = 'rgba(0,0,0,0.55)'

export function Stage(props: Props) {
  const { player, asset, format, settings, currentTime, onCrop, source, overlay, onOverlay, onOverlayMissing, background = null, extras, onExtras = () => {} } = props
  const [size, setSize] = useState({ width: 0, height: 0 })
  const target = formatSize(format)
  const frame = previewFrame(size, source, target ?? null, settings.framing, settings)
  const output = outputFrame(format, source)
  const audio = asset.kind === 'audio'
  const wave = audio && extras?.waveform ? clampPlacement(extras.wave ?? defaultWavePlacement(output), WAVE_ASPECT, output) : null
  const bar = audio && extras?.progressBar ? clampPlacement(extras.bar ?? defaultBarPlacement(output), BAR_ASPECT, output) : null
  const touch = useLayerTouch(
    {
      overlay: overlay && { placement: overlay, aspect: overlay.aspect, onChange: onOverlay },
      wave: wave && extras ? { placement: wave, aspect: WAVE_ASPECT, onChange: (placement) => onExtras({ ...extras, wave: placement }) } : null,
      bar: bar && extras ? { placement: bar, aspect: BAR_ASPECT, onChange: (placement) => onExtras({ ...extras, bar: placement }) } : null
    },
    frame,
    output
  )
  const picture = !audio ? (
    <VideoView player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
  ) : background ? (
    <BackgroundPicture background={background} onMissing={props.onBackgroundMissing} />
  ) : (
    <EmptyBackground onPress={props.onAddBackground} />
  )
  const stillBackdrop = audio && background?.kind === 'image' ? backgroundUri(background.path) : null
  return (
    <GestureDetector gesture={touch.pinch}>
      <View
        testID="stage"
        onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
        style={{ aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}
      >
        {!target || !size.width || (audio && !background) ? (
          picture
        ) : settings.framing === 'fit' ? (
          <FitPreview box={videoBox(size.width, size.height, target.width, target.height)} assetId={asset.id} time={currentTime} still={audio ? stillBackdrop : undefined}>
            {picture}
          </FitPreview>
        ) : (
          <>
            {picture}
            <CropFrame
              video={videoBox(size.width, size.height, source.width, source.height)}
              target={target}
              zone={{ cropX: settings.cropX, cropY: settings.cropY }}
              onCrop={onCrop}
            />
          </>
        )}
        {overlay && size.width > 0 && <OverlayLayer frame={frame} output={output} overlay={overlay} pan={touch.pans.overlay} guides={touch.guides} onMissing={onOverlayMissing} />}
        {wave && extras && size.width > 0 && (
          <PlacedLayer testID="wave" frame={frame} placement={wave} aspect={WAVE_ASPECT} pan={touch.pans.wave}>
            <WavePreview color={extras.color} opacity={extras.opacity} />
          </PlacedLayer>
        )}
        {bar && extras && size.width > 0 && (
          <PlacedLayer testID="bar" frame={frame} placement={bar} aspect={BAR_ASPECT} pan={touch.pans.bar}>
            <View testID="bar-fill" style={{ width: `${Math.max(0, Math.min(1, currentTime / asset.duration)) * 100}%`, height: '100%', backgroundColor: extras.barColor, opacity: extras.barOpacity }} />
          </PlacedLayer>
        )}
      </View>
    </GestureDetector>
  )
}

function useLayerTouch(layers: Record<LayerKind, TouchLayer | null>, frame: Box, output: Size) {
  const [guides, setGuides] = useState<Guide[]>([])
  const none = { x: 0, y: 0, width: 0 }
  const touch = useRef({ kind: 'overlay' as LayerKind, selected: 'overlay' as LayerKind, active: 0, start: none, last: none, x: 0, y: 0, fromX: 0, fromY: 0, scale: 1, fromScale: 1 })
  const begin = (kind: LayerKind) => {
    const current = touch.current
    const layer = layers[current.active === 0 ? kind : current.kind]
    if (!layer) return
    if (current.active === 0) current.kind = kind
    const start = current.active++ === 0 ? clampPlacement(layer.placement, layer.aspect, output) : current.last
    Object.assign(current, { start, last: start, fromX: current.x, fromY: current.y, fromScale: current.scale })
  }
  const end = () => {
    touch.current.active = Math.max(0, touch.current.active - 1)
    if (touch.current.active === 0) setGuides([])
  }
  const update = () => {
    const layer = layers[touch.current.kind]
    if (!layer) return
    const { start, x, y, fromX, fromY, scale, fromScale } = touch.current
    const dx = x - fromX
    const dy = y - fromY
    const ratio = scale / fromScale
    const moved = dx || dy ? moveOverlay(start, dx, dy, layer.aspect, output) : { placement: start, guides: [] }
    setGuides(ratio === 1 ? heldGuides(moved.placement, moved.guides, layer.aspect, output) : [])
    touch.current.last = ratio === 1 ? moved.placement : scaleOverlay(moved.placement, ratio, layer.aspect, output)
    layer.onChange(touch.current.last)
  }
  const pinch = usePinchGesture({
    runOnJS: true,
    testID: 'overlay-pinch',
    enabled: Object.values(layers).some(Boolean),
    onActivate: () => {
      begin(touch.current.active > 0 ? touch.current.kind : touch.current.selected)
      Object.assign(touch.current, { scale: 1, fromScale: 1 })
    },
    onUpdate: (event) => {
      touch.current.scale = event.scale
      update()
    },
    onDeactivate: end
  })
  const moves: Moves = {
    select: (kind) => {
      touch.current.selected = kind
    },
    start: (kind) => {
      begin(kind)
      Object.assign(touch.current, { x: 0, y: 0, fromX: 0, fromY: 0 })
    },
    track: (dx, dy) => {
      touch.current.x = dx / frame.width
      touch.current.y = dy / frame.height
      update()
    },
    end,
    pinch
  }
  const pans = {
    overlay: useLayerPan('overlay', layers.overlay !== null, moves),
    wave: useLayerPan('wave', layers.wave !== null, moves),
    bar: useLayerPan('bar', layers.bar !== null, moves)
  }
  return { pinch, pans, guides }
}

type Moves = {
  select: (kind: LayerKind) => void
  start: (kind: LayerKind) => void
  track: (dx: number, dy: number) => void
  end: () => void
  pinch: PinchGesture
}

function useLayerPan(kind: LayerKind, enabled: boolean, { select, start, track, end, pinch }: Moves) {
  return usePanGesture({
    runOnJS: true,
    testID: `${kind}-pan`,
    hitSlop: 20,
    enabled,
    simultaneousWith: pinch,
    onBegin: () => select(kind),
    onActivate: () => start(kind),
    onUpdate: (event) => track(event.translationX, event.translationY),
    onDeactivate: end
  })
}

function PlacedLayer({ testID, frame, placement, aspect, pan, children }: { testID: string; frame: Box; placement: OverlayPlacement; aspect: number; pan: PanGesture; children: ReactNode }) {
  const box = overlayBox(frame, placement, aspect)
  return (
    <GestureDetector gesture={pan}>
      <View testID={testID} style={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height }}>
        {children}
      </View>
    </GestureDetector>
  )
}

const WAVE_BARS = Array.from({ length: 48 }, (_, index) => 0.25 + 0.75 * Math.abs(Math.sin(index * 1.7) * Math.cos(index * 0.6)))

function WavePreview({ color, opacity }: { color: string; opacity: number }) {
  return (
    <View pointerEvents="none" style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', opacity }}>
      {WAVE_BARS.map((height, index) => (
        <View
          key={index}
          style={{
            width: 2,
            height: `${height * 100}%`,
            borderRadius: 1,
            backgroundColor: color,
            opacity: Math.min(1, Math.min(index, WAVE_BARS.length - 1 - index) / (0.22 * WAVE_BARS.length))
          }}
        />
      ))}
    </View>
  )
}

function BackgroundPicture({ background, onMissing }: { background: Background; onMissing?: () => void }) {
  if (background.kind === 'image') {
    return <Image testID="background-image" source={{ uri: backgroundUri(background.path) }} onError={onMissing} resizeMode="contain" style={{ flex: 1 }} />
  }
  return <BackgroundVideo key={background.path} uri={backgroundUri(background.path)} onMissing={onMissing} />
}

function BackgroundVideo({ uri, onMissing }: { uri: string; onMissing?: () => void }) {
  const player = useVideoPlayer(uri, (created) => {
    created.loop = true
    created.muted = true
    created.play()
  })
  useEffect(() => {
    const subscription = player.addListener('statusChange', ({ status }) => status === 'error' && onMissing?.())
    return () => subscription.remove()
  }, [player, onMissing])
  return <VideoView testID="background-video" player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
}

function EmptyBackground({ onPress }: { onPress?: () => void }) {
  return (
    <Tap testID="background-empty" accessibilityRole="button" onPress={() => onPress?.()} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      <SymbolView name="photo.badge.plus" size={28} tintColor="rgba(255,255,255,0.7)" />
      <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '600' }}>{t.backgroundEmpty}</Text>
    </Tap>
  )
}

type OverlayProps = { frame: Box; output: Size; overlay: Overlay; pan: PanGesture; guides: Guide[]; onMissing: () => void }

function guideStyle(guide: Guide, frame: Box) {
  const margin = OVERLAY_MARGIN * frame.width
  switch (guide) {
    case 'centerX':
      return { left: frame.left + frame.width / 2, top: frame.top, width: 1, height: frame.height }
    case 'centerY':
      return { left: frame.left, top: frame.top + frame.height / 2, width: frame.width, height: 1 }
    case 'left':
      return { left: frame.left + margin, top: frame.top, width: 1, height: frame.height }
    case 'right':
      return { left: frame.left + frame.width - margin, top: frame.top, width: 1, height: frame.height }
    case 'top':
      return { left: frame.left, top: frame.top + margin, width: frame.width, height: 1 }
    case 'bottom':
      return { left: frame.left, top: frame.top + frame.height - margin, width: frame.width, height: 1 }
  }
}

function OverlayLayer({ frame, output, overlay, pan, guides, onMissing }: OverlayProps) {
  const theme = useTheme()
  const box = overlayBox(frame, clampPlacement(overlay, overlay.aspect, output), overlay.aspect)
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
      {guides.map((guide) => (
        <View key={guide} testID={`overlay-guide-${guide}`} pointerEvents="none" style={{ position: 'absolute', backgroundColor: theme.accent, ...guideStyle(guide, frame) }} />
      ))}
      <GestureDetector gesture={pan}>
        <View testID="overlay" style={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height }}>
          <Image testID="overlay-image" source={{ uri: overlayUri(overlay.path) }} onError={onMissing} resizeMode="stretch" style={{ width: '100%', height: '100%' }} />
        </View>
      </GestureDetector>
    </View>
  )
}

function FitPreview({ box, assetId, time, still, children }: { box: Box; assetId: string; time: number; still?: string | null; children: ReactNode }) {
  const [fetched, setBackdrop] = useState<string | null>(null)
  const backdrop = still === undefined ? fetched : still
  const second = Math.floor(time)
  useEffect(() => {
    let live = true
    if (still === undefined) void thumbnail(assetId, second, 120).then((uri) => live && setBackdrop(uri), () => {})
    return () => {
      live = false
    }
  }, [assetId, second, still])
  return (
    <View testID="fit-preview" style={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, overflow: 'hidden' }}>
      <Image testID="fit-backdrop" source={backdrop ? { uri: backdrop } : undefined} blurRadius={16} resizeMode="cover" style={{ position: 'absolute', inset: 0 }} />
      <View style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.3)' }} />
      {children}
    </View>
  )
}

type CropProps = { video: Box; target: { width: number; height: number }; zone: Zone; onCrop: (zone: Zone) => void }

function CropFrame({ video, target, zone, onCrop }: CropProps) {
  const start = useRef(zone)
  const frame = cropBox(video, target.width, target.height, zone.cropX, zone.cropY)
  const pan = usePanGesture({
    runOnJS: true,
    onActivate: () => {
      start.current = zone
    },
    onUpdate: (event) => onCrop(dragCrop(video, target.width, target.height, start.current, event.translationX, event.translationY))
  })
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: frame.top, backgroundColor: DIM }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: frame.top + frame.height, bottom: 0, backgroundColor: DIM }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, width: frame.left, top: frame.top, height: frame.height, backgroundColor: DIM }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: frame.left + frame.width, right: 0, top: frame.top, height: frame.height, backgroundColor: DIM }} />
      <GestureDetector gesture={pan}>
        <View
          testID="crop-frame"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={t.mobile.cropFrame}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={(event) => onCrop(stepCrop(zone, event.nativeEvent.actionName === 'increment' ? 1 : -1))}
          style={{ position: 'absolute', left: frame.left, top: frame.top, width: frame.width, height: frame.height, borderWidth: 2, borderColor: '#fff' }}
        />
      </GestureDetector>
    </View>
  )
}
