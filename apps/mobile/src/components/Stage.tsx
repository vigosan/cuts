import { useEffect, useRef, useState } from 'react'
import { Image, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture, usePinchGesture, type PanGesture } from 'react-native-gesture-handler'
import { VideoView, type VideoPlayer } from 'expo-video'
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
import { overlayUri, thumbnail, type AssetInfo } from '../media'
import { useTheme } from '../theme'

type Zone = { cropX: number; cropY: number }

type Props = {
  player: VideoPlayer
  asset: AssetInfo
  format: OutputFormat
  settings: ClipSettings
  currentTime: number
  onCrop: (zone: Zone) => void
  overlay: Overlay | null
  onOverlay: (placement: OverlayPlacement) => void
  onOverlayMissing: () => void
}

const DIM = 'rgba(0,0,0,0.55)'

export function Stage({ player, asset, format, settings, currentTime, onCrop, overlay, onOverlay, onOverlayMissing }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const target = formatSize(format)
  const frame = previewFrame(size, asset, target ?? null, settings.framing, settings)
  const output = outputFrame(format, asset)
  const touch = useOverlayTouch(overlay, frame, output, onOverlay)
  const video = <VideoView player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
  return (
    <GestureDetector gesture={touch.pinch}>
      <View
        testID="stage"
        onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
        style={{ aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}
      >
        {!target || !size.width ? (
          video
        ) : settings.framing === 'fit' ? (
          <FitPreview box={videoBox(size.width, size.height, target.width, target.height)} assetId={asset.id} time={currentTime}>
            {video}
          </FitPreview>
        ) : (
          <>
            {video}
            <CropFrame
              video={videoBox(size.width, size.height, asset.width, asset.height)}
              target={target}
              zone={{ cropX: settings.cropX, cropY: settings.cropY }}
              onCrop={onCrop}
            />
          </>
        )}
        {overlay && size.width > 0 && <OverlayLayer frame={frame} output={output} overlay={overlay} pan={touch.pan} guides={touch.guides} onMissing={onOverlayMissing} />}
      </View>
    </GestureDetector>
  )
}

function useOverlayTouch(overlay: Overlay | null, frame: Box, output: Size, onChange: (placement: OverlayPlacement) => void) {
  const [guides, setGuides] = useState<Guide[]>([])
  const none = { x: 0, y: 0, width: 0 }
  const touch = useRef({ active: 0, start: none, last: none, x: 0, y: 0, fromX: 0, fromY: 0, scale: 1, fromScale: 1 })
  const begin = () => {
    if (!overlay) return
    const current = touch.current
    const start = current.active++ === 0 ? clampPlacement(overlay, overlay.aspect, output) : current.last
    Object.assign(current, { start, last: start, fromX: current.x, fromY: current.y, fromScale: current.scale })
  }
  const end = () => {
    touch.current.active = Math.max(0, touch.current.active - 1)
    if (touch.current.active === 0) setGuides([])
  }
  const update = () => {
    if (!overlay) return
    const { start, x, y, fromX, fromY, scale, fromScale } = touch.current
    const dx = x - fromX
    const dy = y - fromY
    const ratio = scale / fromScale
    const moved = dx || dy ? moveOverlay(start, dx, dy, overlay.aspect, output) : { placement: start, guides: [] }
    setGuides(ratio === 1 ? heldGuides(moved.placement, moved.guides, overlay.aspect, output) : [])
    touch.current.last = ratio === 1 ? moved.placement : scaleOverlay(moved.placement, ratio, overlay.aspect, output)
    onChange(touch.current.last)
  }
  const pinch = usePinchGesture({
    runOnJS: true,
    testID: 'overlay-pinch',
    enabled: overlay !== null,
    onActivate: () => {
      begin()
      Object.assign(touch.current, { scale: 1, fromScale: 1 })
    },
    onUpdate: (event) => {
      touch.current.scale = event.scale
      update()
    },
    onDeactivate: end
  })
  const pan = usePanGesture({
    runOnJS: true,
    testID: 'overlay-pan',
    hitSlop: 20,
    simultaneousWith: pinch,
    onActivate: () => {
      begin()
      Object.assign(touch.current, { x: 0, y: 0, fromX: 0, fromY: 0 })
    },
    onUpdate: (event) => {
      touch.current.x = event.translationX / frame.width
      touch.current.y = event.translationY / frame.height
      update()
    },
    onDeactivate: end
  })
  return { pinch, pan, guides }
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

function FitPreview({ box, assetId, time, children }: { box: Box; assetId: string; time: number; children: React.ReactNode }) {
  const [backdrop, setBackdrop] = useState<string | null>(null)
  const second = Math.floor(time)
  useEffect(() => {
    let live = true
    void thumbnail(assetId, second, 120).then((uri) => live && setBackdrop(uri), () => {})
    return () => {
      live = false
    }
  }, [assetId, second])
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
