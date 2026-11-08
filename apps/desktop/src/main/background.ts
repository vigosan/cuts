import { basename, dirname, extname, join, resolve } from 'node:path'
import type { BackgroundKind, ImportedBackground } from '../shared/api'
import { BACKGROUND_EXTENSIONS } from '../shared/video-formats'

export const BACKGROUND_MAX_BYTES = 500 * 1024 * 1024

const IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg']

export type BackgroundDeps = {
  size(path: string): Promise<number>
  copy(from: string, to: string): Promise<void>
  list(dir: string): Promise<string[]>
  remove(path: string): Promise<void>
  now(): number
}

export async function importBackground(
  source: string,
  dir: string,
  deps: BackgroundDeps
): Promise<ImportedBackground | 'invalid' | 'too-big'> {
  const extension = extname(source).slice(1).toLowerCase()
  if (!BACKGROUND_EXTENSIONS.includes(extension)) return 'invalid'
  if ((await deps.size(source)) > BACKGROUND_MAX_BYTES) return 'too-big'
  const path = join(dir, `background-${deps.now()}.${extension}`)
  await deps.copy(source, path)
  const previous = (await deps.list(dir)).filter((name) => join(dir, name) !== path)
  await Promise.all(previous.map((name) => deps.remove(join(dir, name))))
  const kind: BackgroundKind = IMAGE_EXTENSIONS.includes(extension) ? 'image' : 'video'
  return { path, kind, name: basename(source) }
}

export function isOwnedBackground(path: string, dir: string): boolean {
  return dirname(resolve(path)) === resolve(dir)
}
