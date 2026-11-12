import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { Clip } from '@cuts/core/clips'
import { partStarts } from '@cuts/core/parts'
import type { RecentVideo, Session } from '../shared/api'

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

export function canRemember(entry: RecentEntry, mas: boolean): boolean {
  return !mas || Boolean(entry.bookmark) || entry.bookmarks !== undefined
}

export function isListed(entry: RecentEntry, exists: (path: string, bookmark?: string) => boolean): boolean {
  return entry.sources ? entry.sources.some((source, i) => exists(source, entry.bookmarks?.[i])) : exists(entry.path, entry.bookmark)
}

export async function rememberRecent(file: string, entry: RecentEntry): Promise<void> {
  const recents = await loadRecents(file)
  const previous = recents.find((recent) => recent.path === entry.path)
  const bookmark = entry.bookmark ?? previous?.bookmark
  const remembered = bookmark ? { ...entry, bookmark } : entry
  const all = [remembered, ...recents.filter((recent) => recent.path !== entry.path)]
  await saveRecents(file, all.slice(0, MAX_RECENTS))
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

export function posterFrame(entry: RecentEntry, session: Session | null, exists: (path: string) => boolean): { path: string; time: number } | null {
  if (!entry.sources) return { path: entry.path, time: posterTime(session?.clips ?? []) }
  const path = entry.sources.find(exists)
  if (!path) return null
  const saved = session?.sources ?? []
  const index = saved.findIndex((source) => source.path === path)
  if (index === -1) return { path, time: POSTER_FALLBACK_SECONDS }
  const start = partStarts(saved)[index]
  const end = start + saved[index].duration
  const cover = session?.clips.find((clip) => clip.start >= start && clip.start < end)
  return { path, time: cover ? cover.start - start : POSTER_FALLBACK_SECONDS }
}

export async function readPoster(file: string): Promise<string | null> {
  try {
    return `data:image/jpeg;base64,${(await readFile(file)).toString('base64')}`
  } catch {
    return null
  }
}
