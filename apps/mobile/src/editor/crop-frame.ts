type Zone = { cropX: number; cropY: number }

const STEP = 0.1

export function stepCrop(zone: Zone, direction: 1 | -1): Zone {
  return { ...zone, cropX: Math.min(1, Math.max(0, Math.round((zone.cropX + direction * STEP) * 100) / 100)) }
}
