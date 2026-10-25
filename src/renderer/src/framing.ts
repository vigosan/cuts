export type Box = { left: number; top: number; width: number; height: number }
type Zone = { cropX: number; cropY: number }

const clamp = (value: number) => Math.min(1, Math.max(0, value))

export function videoBox(containerWidth: number, containerHeight: number, videoWidth: number, videoHeight: number): Box {
  const scale = Math.min(containerWidth / videoWidth, containerHeight / videoHeight)
  const width = videoWidth * scale
  const height = videoHeight * scale
  return { left: (containerWidth - width) / 2, top: (containerHeight - height) / 2, width, height }
}

function cropSize(box: Box, targetWidth: number, targetHeight: number) {
  const width = Math.min(box.width, (box.height * targetWidth) / targetHeight)
  return { width, height: (width * targetHeight) / targetWidth }
}

export function cropBox(box: Box, targetWidth: number, targetHeight: number, cropX: number, cropY: number): Box {
  const { width, height } = cropSize(box, targetWidth, targetHeight)
  return {
    left: box.left + (box.width - width) * cropX,
    top: box.top + (box.height - height) * cropY,
    width,
    height
  }
}

export function dragCrop(box: Box, targetWidth: number, targetHeight: number, start: Zone, dx: number, dy: number): Zone {
  const { width, height } = cropSize(box, targetWidth, targetHeight)
  const roomX = box.width - width
  const roomY = box.height - height
  return {
    cropX: roomX > 0.5 ? clamp(start.cropX + dx / roomX) : start.cropX,
    cropY: roomY > 0.5 ? clamp(start.cropY + dy / roomY) : start.cropY
  }
}
