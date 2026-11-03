import { useEffect, useRef, useState } from 'react'
import { Image, Modal, Text, View, type LayoutChangeEvent } from 'react-native'
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler'
import { initialWindowMetrics, SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { SymbolView } from 'expo-symbols'
import { VideoView, type VideoPlayer } from 'expo-video'
import { cropBox, dragCrop, videoBox, type Box } from '@cuts/core/crop'
import type { ClipSettings } from '@cuts/core/fades'
import { formatSize, type OutputFormat } from '@cuts/core/formats'
import { croppedVideoLayout, stepCrop } from '../editor/crop-frame'
import { t } from '../i18n'
import { thumbnail, type AssetInfo } from '../media'
import { Tap } from './Tap'

type Zone = { cropX: number; cropY: number }

type Props = {
  player: VideoPlayer
  asset: AssetInfo
  format: OutputFormat
  settings: ClipSettings
  currentTime: number
  isPlaying: boolean
  onTogglePlay: () => void
  onCrop: (zone: Zone) => void
}

const DIM = 'rgba(0,0,0,0.55)'

export function Stage({ player, asset, format, settings, currentTime, isPlaying, onTogglePlay, onCrop }: Props) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [full, setFull] = useState(false)
  const target = formatSize(format)
  const video = <VideoView player={player} nativeControls={false} allowsVideoFrameAnalysis={false} contentFit="contain" style={{ flex: 1 }} />
  return (
    <>
      <Tap testID="stage-tap" accessibilityLabel={t.mobile.fullScreen} onPress={() => setFull(true)}>
        <View
          testID="stage"
          onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)}
          style={{ aspectRatio: 16 / 9, borderRadius: 14, overflow: 'hidden', backgroundColor: '#000' }}
        >
          {full ? null : !target || !size.width ? (
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
      </Tap>
      {full && (
        <FullScreen asset={asset} format={format} target={target} settings={settings} currentTime={currentTime} isPlaying={isPlaying} onTogglePlay={onTogglePlay} onClose={() => setFull(false)}>
          {video}
        </FullScreen>
      )}
    </>
  )
}

type FullScreenProps = {
  asset: AssetInfo
  format: OutputFormat
  target: { width: number; height: number } | undefined
  settings: ClipSettings
  currentTime: number
  isPlaying: boolean
  onTogglePlay: () => void
  onClose: () => void
  children: React.ReactNode
}

function FullScreen({ asset, format, target, settings, currentTime, isPlaying, onTogglePlay, onClose, children }: FullScreenProps) {
  const [size, setSize] = useState({ width: 0, height: 0 })
  const box = target && size.width ? videoBox(size.width, size.height, target.width, target.height) : null
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        <View testID="fullscreen-stage" onLayout={(event: LayoutChangeEvent) => setSize(event.nativeEvent.layout)} style={{ flex: 1 }}>
          {!box ? (
            children
          ) : settings.framing === 'fit' ? (
            <FitPreview box={box} assetId={asset.id} time={currentTime}>
              {children}
            </FitPreview>
          ) : (
            <View testID="fullscreen-crop" style={{ position: 'absolute', left: box.left, top: box.top, width: box.width, height: box.height, overflow: 'hidden' }}>
              <View style={{ position: 'absolute', ...cropped(asset, target!, box, settings) }}>{children}</View>
            </View>
          )}
        </View>
        <SafeAreaView pointerEvents="box-none" style={{ position: 'absolute', inset: 0, justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', padding: 12 }}>
            <Tap testID="close-preview" accessibilityLabel={t.close} onPress={onClose} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <SymbolView name="xmark" size={18} tintColor="#fff" />
            </Tap>
          </View>
          <View style={{ alignItems: 'center', padding: 16 }}>
            <Tap testID="fullscreen-play" accessibilityLabel={isPlaying ? t.mobile.pause : t.mobile.play} onPress={onTogglePlay} style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <SymbolView name={isPlaying ? 'pause.fill' : 'play.fill'} size={24} tintColor="#fff" />
            </Tap>
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 8 }}>{t.formats[format]}</Text>
          </View>
        </SafeAreaView>
      </View>
      </SafeAreaProvider>
    </Modal>
  )
}

const cropped = (asset: AssetInfo, target: { width: number; height: number }, box: Box, settings: ClipSettings) =>
  croppedVideoLayout({ width: asset.width, height: asset.height }, target, { left: 0, top: 0, width: box.width, height: box.height }, settings)

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
