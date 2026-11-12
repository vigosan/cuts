import { basename } from 'node:path'
import type { OpenResult, Session, Source } from '../shared/api'
import { mediaKind } from '../shared/video-formats'
import { joinKey, parseMediaInfo } from './join'
import type { RecentEntry } from './recents'

export type OpenDeps = {
  exists(path: string): boolean
  info(path: string): Promise<string>
  loadSession(id: string): Promise<Session | null>
  savedSessions(): Promise<Session[]>
  saveSession(id: string, session: Session): Promise<void>
  removeSession(id: string): Promise<void>
  forget(path: string): Promise<void>
  remember(entry: RecentEntry): Promise<void>
  bookmark(path: string): string | undefined
  now(): number
}

const SESSION_PREFIX = 'session:'
const DURATION_TOLERANCE_SECONDS = 0.5

export const matchesMissing = (path: string, info: string, duration: number) =>
  mediaKind(path) !== 'audio' && Math.abs(parseMediaInfo(info).duration - duration) <= DURATION_TOLERANCE_SECONDS

const sessionId = (paths: string[]) => `${SESSION_PREFIX}${joinKey(paths)}`

const sameSet = (a: string[], b: string[]) => a.length === b.length && a.every((path) => b.includes(path))

async function probe(path: string, saved: Source | undefined, deps: OpenDeps): Promise<Source> {
  const name = basename(path)
  const missing = () => {
    const { duration, width, height, hdr } = saved ?? { duration: 0, width: 0, height: 0, hdr: false }
    return { path, name, duration, width, height, hdr, missing: true }
  }
  if (!deps.exists(path)) return missing()
  const { duration, width, height, hdr, video } = parseMediaInfo(await deps.info(path))
  if (duration <= 0 || video === null) return missing()
  const stored = saved && Math.abs(saved.duration - duration) <= DURATION_TOLERANCE_SECONDS ? saved.duration : duration
  return { path, name, duration: stored, width, height, hdr, missing: false }
}

const sameVideos = (saved: Source[] | undefined, sources: Source[]) =>
  saved?.length === sources.length &&
  sources.some((source) => !source.missing) &&
  saved.every(
    (old, i) =>
      old.name === sources[i].name && (sources[i].missing || Math.abs(old.duration - sources[i].duration) <= DURATION_TOLERANCE_SECONDS)
  )

async function openSession(paths: string[], deps: OpenDeps, carry?: Session): Promise<OpenResult> {
  const id = sessionId(paths)
  const session = await deps.loadSession(id)
  const saved = session?.sources
  const order = !carry && saved && sameSet(saved.map((source) => source.path), paths) ? saved.map((source) => source.path) : paths
  const known = (path: string) => saved?.find((source) => source.path === path) ?? carry?.sources?.find((source) => source.path === path)
  const sources = await Promise.all(order.map((path) => probe(path, known(path), deps)))
  if (session || carry) return { ok: true, path: id, sources }
  const moved = (await deps.savedSessions()).find((old) => sameVideos(old.sources, sources))
  const previous = moved?.sources
  if (!moved || !previous) return { ok: true, path: id, sources }
  const restored = sources.map((source, i) => (source.missing ? { ...previous[i], path: source.path, missing: true } : source))
  const old = sessionId(previous.map((source) => source.path))
  await deps.saveSession(id, { ...moved, sources: restored })
  await deps.removeSession(old)
  await deps.forget(old)
  return { ok: true, path: id, sources: restored }
}

export async function openVideos(paths: string[], replacing: string | null, deps: OpenDeps, carry?: Session): Promise<OpenResult> {
  const single = paths.length === 1 || paths.some((path) => mediaKind(path) === 'audio')
  const result: OpenResult = single ? { ok: true, path: paths[0], sources: [] } : await openSession(paths, deps, carry)
  if (carry) {
    const { sources: _carried, ...plain } = carry
    await deps.saveSession(result.path, single ? plain : { ...plain, sources: result.sources })
  }
  if (replacing && replacing !== result.path && replacing.startsWith(SESSION_PREFIX)) {
    await deps.removeSession(replacing)
    await deps.forget(replacing)
  }
  const sources = result.sources.map((source) => source.path)
  const bookmarks = sources.flatMap((source) => deps.bookmark(source) ?? [])
  await deps
    .remember(
      single
        ? { path: result.path, openedAt: deps.now(), bookmark: deps.bookmark(result.path) }
        : { path: result.path, openedAt: deps.now(), sources, ...(bookmarks.length === sources.length ? { bookmarks } : {}) }
    )
    .catch(() => {})
  return result
}
