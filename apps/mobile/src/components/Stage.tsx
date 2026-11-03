import { useEffect, useRef, useState } from 'react'
import { Image, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { VideoView, type VideoPlayer } from 'expo-video'
import { cropBox, dragCrop, videoBox, type Box } from '@cuts/core/crop'
import type { ClipSettings } from '@cuts/core/fades'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import { stepCrop } from '../editor/crop-frame'
import { t } from '../i18n'
import { thumbnail, type AssetInfo } from '../media'

type Zone = { cropX: number; cropY: number }

type Props = {
  player: VideoPlayer
  asset: AssetInfo
  format: OutputFormat
  settings: ClipSettings
  currentTime: number
  onCrop: (zone: Zone) => void
}

const DIM = 'rgba(0,0,0,0.55)'

export function Stage({ player, asset, format, settings, currentTime, onCrop }: Props) {
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
