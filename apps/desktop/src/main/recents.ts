import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { Clip } from '@cuts/core/clips'
import type { RecentVideo } from '../shared/api'

export type RecentEntry = { path: string; openedAt: number; bookmark?: string; sources?: string[]; bookmarks?: string[] }

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

export async function rememberRecent(file: string, entry: RecentEntry): Promise<RecentEntry[]> {
  const recents = await loadRecents(file)
  const previous = recents.find((recent) => recent.path === entry.path)
  const bookmark = entry.bookmark ?? previous?.bookmark
  const remembered = bookmark ? { ...entry, bookmark } : entry
  const all = [remembered, ...recents.filter((recent) => recent.path !== entry.path)]
  await saveRecents(file, all.slice(0, MAX_RECENTS))
  return all.slice(MAX_RECENTS)
}

export async function forgetRecent(file: string, path: string): Promise<void> {
  await saveRecents(file, (await loadRecents(file)).filter((recent) => recent.path !== path))
}

const sessionName = (sources: string[]) => `${basename(sources[0])} +${sources.length - 1}`

export const toRecentVideo = (entry: RecentEntry, clips: number, poster: string | null): RecentVideo => ({
  path: entry.path,
  name: entry.sources ? sessionName(entry.sources) : basename(entry.path),
  folder: basename(dirname(entry.sources?.[0] ?? entry.path)),
  openedAt: entry.openedAt,
  clips,
  poster
})

const POSTER_FALLBACK_SECONDS = 30

export const posterFile = (dir: string, path: string): string =>
  join(dir, `${createHash('sha1').update(path).digest('hex')}.jpg`)

export const posterTime = (clips: Clip[]): number => clips[0]?.start ?? POSTER_FALLBACK_SECONDS

export async function readPoster(file: string): Promise<string | null> {
  try {
    return `data:image/jpeg;base64,${(await readFile(file)).toString('base64')}`
  } catch {
    return null
  }
}
