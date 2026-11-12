import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { mediaKind } from '../shared/video-formats'

export async function videosInFolder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true })
  return entries.filter((entry) => entry.isFile() && !entry.name.startsWith('.') && mediaKind(entry.name) === 'video').map((entry) => join(dir, entry.name))
}
