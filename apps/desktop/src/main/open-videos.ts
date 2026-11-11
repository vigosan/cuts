import { basename, dirname, extname, join, resolve } from 'node:path'
import type { OpenResult, Source } from '../shared/api'
import { mediaKind } from '../shared/video-formats'
import { concatList, firstMismatch, joinArgs, joinKey, parseMediaInfo } from './join'
import type { RecentEntry } from './recents'

export type Manifest = { sources: Source[] }

export type OpenDeps = {
  dir: string
  exists(path: string): boolean
  info(path: string): Promise<string>
  run(args: string[]): Promise<void>
  read(path: string): Promise<string | null>
  write(path: string, text: string): Promise<void>
  rename(from: string, to: string): Promise<void>
  remove(path: string): Promise<void>
  removeSession(videoPath: string): Promise<void>
  forget(path: string): Promise<void>
  remember(entry: RecentEntry): Promise<RecentEntry[]>
  bookmark(path: string): string | undefined
  now(): number
}

const extensionOf = (path: string) => extname(path).toLowerCase()

const manifestFor = (joined: string) => join(dirname(joined), `${basename(joined, extname(joined))}.json`)

const isJoined = (path: string, dir: string) => dirname(resolve(path)) === resolve(dir)

async function readManifest(path: string, deps: OpenDeps): Promise<Manifest | null> {
  try {
    const text = await deps.read(path)
    return text ? (JSON.parse(text) as Manifest) : null
  } catch {
    return null
  }
}

async function joinVideos(paths: string[], deps: OpenDeps): Promise<OpenResult> {
  const key = joinKey(paths)
  const manifestFile = join(deps.dir, `${key}.json`)
  const manifest = await readManifest(manifestFile, deps)
  if (manifest) {
    const reused = join(deps.dir, `${key}${extensionOf(manifest.sources[0].path)}`)
    if (deps.exists(reused)) return { ok: true, path: reused, sources: manifest.sources }
  }
  const missing = paths.find((path) => !deps.exists(path))
  if (missing) return { ok: false, problem: 'missing', name: basename(missing) }
  const infos = await Promise.all(paths.map(async (path) => parseMediaInfo(await deps.info(path))))
  const mismatch = firstMismatch(infos)
  if (mismatch !== -1) return { ok: false, problem: 'mismatch', name: basename(paths[mismatch]) }
  const extension = extensionOf(paths[0])
  const output = join(deps.dir, `${key}${extension}`)
  const joining = join(deps.dir, `${key}.joining${extension}`)
  const listFile = join(deps.dir, `${key}.txt`)
  await deps.write(listFile, concatList(paths))
  try {
    await deps.run(joinArgs(listFile, joining))
  } catch (error) {
    await deps.remove(joining)
    throw error
  } finally {
    await deps.remove(listFile)
  }
  await deps.rename(joining, output)
  const sources = paths.map((path, index) => ({ path, name: basename(path), duration: infos[index].duration }))
  await deps.write(manifestFile, JSON.stringify({ sources }))
  return { ok: true, path: output, sources }
}

async function discardJoined(path: string, deps: OpenDeps): Promise<void> {
  await deps.remove(path)
  await deps.remove(manifestFor(path))
}

export async function openVideos(paths: string[], replacing: string | null, deps: OpenDeps): Promise<OpenResult> {
  const single = paths.length === 1 || paths.some((path) => mediaKind(path) === 'audio')
  const result: OpenResult = single ? { ok: true, path: paths[0], sources: [] } : await joinVideos(paths, deps)
  if (!result.ok) return result
  if (replacing && replacing !== result.path && isJoined(replacing, deps.dir)) {
    await discardJoined(replacing, deps)
    await deps.removeSession(replacing)
    await deps.forget(replacing)
  }
  const sources = result.sources.map((source) => source.path)
  const bookmarks = sources.flatMap((source) => deps.bookmark(source) ?? [])
  const evicted = await deps.remember(
    single
      ? { path: result.path, openedAt: deps.now(), bookmark: deps.bookmark(result.path) }
      : { path: result.path, openedAt: deps.now(), sources, ...(bookmarks.length === sources.length ? { bookmarks } : {}) }
  )
  await Promise.all(evicted.filter((old) => isJoined(old.path, deps.dir)).map((old) => discardJoined(old.path, deps)))
  return result
}
