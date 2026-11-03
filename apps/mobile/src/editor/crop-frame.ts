type Zone = { cropX: number; cropY: number }

const STEP = 0.1

export function stepCrop(zone: Zone, direction: 1 | -1): Zone {
  return { ...zone, cropX: Math.min(1, Math.max(0, Math.round((zone.cropX + direction * STEP) * 100) / 100)) }
}

type Size = { width: number; height: number }
type Box = { left: number; top: number; width: number; height: number }

export function croppedVideoLayout(video: Size, target: Size, box: Box, zone: Zone): Box {
  const cropWidth = Math.min(video.width, (video.height * target.width) / target.height)
  const cropHeight = (cropWidth * target.height) / target.width
  const scale = box.width / cropWidth
  return {
    left: box.left - (video.width - cropWidth) * zone.cropX * scale,
    top: box.top - (video.height - cropHeight) * zone.cropY * scale,
    width: video.width * scale,
    height: video.height * scale
  }
}
