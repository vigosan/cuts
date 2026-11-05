import { useEffect, useRef, useState } from 'react'
import { Image, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler'
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
  const video = <VideoView player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
  return (
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
      {overlay && size.width > 0 && (
        <OverlayLayer
          frame={previewFrame(size, asset, target ?? null, settings.framing, settings)}
          output={outputFrame(format, asset)}
          overlay={overlay}
          onChange={onOverlay}
          onMissing={onOverlayMissing}
        />
      )}
    </View>
  )
}

type OverlayProps = { frame: Box; output: Size; overlay: Overlay; onChange: (placement: OverlayPlacement) => void; onMissing: () => void }

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

function OverlayLayer({ frame, output, overlay, onChange, onMissing }: OverlayProps) {
  const theme = useTheme()
  const [guides, setGuides] = useState<Guide[]>([])
  const placement = clampPlacement(overlay, overlay.aspect, output)
  const box = overlayBox(frame, placement, overlay.aspect)
  const touch = useRef({ active: 0, start: placement, dx: 0, dy: 0, scale: 1 })
  const begin = () => {
    if (touch.current.active++ === 0) touch.current = { active: 1, start: placement, dx: 0, dy: 0, scale: 1 }
  }
  const end = () => {
    touch.current.active = Math.max(0, touch.current.active - 1)
    if (touch.current.active === 0) setGuides([])
  }
  const update = () => {
    const { start, dx, dy, scale } = touch.current
    const moved = dx || dy ? moveOverlay(start, dx, dy, overlay.aspect, output) : { placement: start, guides: [] }
    setGuides(scale === 1 ? heldGuides(moved.placement, moved.guides, overlay.aspect, output) : [])
    onChange(scale === 1 ? moved.placement : scaleOverlay(moved.placement, scale, overlay.aspect, output))
  }
  const pan = usePanGesture({
    runOnJS: true,
    testID: 'overlay-pan',
    onActivate: begin,
    onUpdate: (event) => {
      touch.current.dx = event.translationX / frame.width
      touch.current.dy = event.translationY / frame.height
      update()
    },
    onDeactivate: end
  })
  const pinch = usePinchGesture({
    runOnJS: true,
    testID: 'overlay-pinch',
    onActivate: begin,
    onUpdate: (event) => {
      touch.current.scale = event.scale
      update()
    },
    onDeactivate: end
  })
  const gesture = useSimultaneousGestures(pan, pinch)
  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
      {guides.map((guide) => (
        <View key={guide} testID={`overlay-guide-${guide}`} pointerEvents="none" style={{ position: 'absolute', backgroundColor: theme.accent, ...guideStyle(guide, frame) }} />
      ))}
      <GestureDetector gesture={gesture}>
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
