import { dirname, join, resolve } from 'node:path'
import type { Size } from '@cuts/core/overlay'
import type { ImportedOverlay } from '../shared/api'

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const HEADER_BYTES = 24

export type OverlayDeps = {
  read(path: string): Promise<Uint8Array>
  write(path: string, bytes: Uint8Array): Promise<void>
  list(dir: string): Promise<string[]>
  remove(path: string): Promise<void>
  now(): number
}

export function pngSize(bytes: Uint8Array): Size | null {
  if (bytes.length < HEADER_BYTES || SIGNATURE.some((byte, index) => bytes[index] !== byte)) return null
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const width = view.getUint32(16)
  const height = view.getUint32(20)
  return width > 0 && height > 0 ? { width, height } : null
}

export async function importOverlay(source: string, dir: string, deps: OverlayDeps): Promise<ImportedOverlay | null> {
  const bytes = await deps.read(source)
  const size = pngSize(bytes)
  if (!size) return null
  const path = join(dir, `overlay-${deps.now()}.png`)
  await deps.write(path, bytes)
  const previous = (await deps.list(dir)).filter((name) => join(dir, name) !== path)
  await Promise.all(previous.map((name) => deps.remove(join(dir, name))))
  return { path, aspect: size.height / size.width }
}

export function isOwnedOverlay(path: string, dir: string): boolean {
  return dirname(resolve(path)) === resolve(dir)
}
