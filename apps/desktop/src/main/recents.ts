import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname } from 'node:path'
import type { RecentVideo } from '../shared/api'

export type RecentEntry = { path: string; openedAt: number; bookmark?: string }

export const MAX_RECENTS = 5

export async function loadRecents(file: string): Promise<RecentEntry[]> {
  try {
    const recents = JSON.parse(await readFile(file, 'utf8'))
    return Array.isArray(recents) ? recents : []
  } catch {
    return []
  }
}

async function saveRecents(file: string, recents: RecentEntry[]): Promise<void> {
  await mkdir(dirname(file), { recursive: true })
  await writeFile(file, JSON.stringify(recents))
}

export async function rememberRecent(file: string, entry: RecentEntry): Promise<void> {
  const recents = await loadRecents(file)
  const previous = recents.find((recent) => recent.path === entry.path)
  const bookmark = entry.bookmark ?? previous?.bookmark
  const remembered = bookmark ? { ...entry, bookmark } : entry
  await saveRecents(file, [remembered, ...recents.filter((recent) => recent.path !== entry.path)].slice(0, MAX_RECENTS))
}

export async function forgetRecent(file: string, path: string): Promise<void> {
  await saveRecents(file, (await loadRecents(file)).filter((recent) => recent.path !== path))
}

export const toRecentVideo = (entry: RecentEntry, clips: number): RecentVideo => ({
  path: entry.path,
  name: basename(entry.path),
  folder: basename(dirname(entry.path)),
  openedAt: entry.openedAt,
  clips
})
