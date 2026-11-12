import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { DEFAULT_SETTINGS } from '@cuts/core/fades'
import type { Session } from '../shared/api'

const fileFor = (dir: string, videoPath: string) =>
  join(dir, `${createHash('sha256').update(videoPath).digest('hex').slice(0, 32)}.json`)

export async function loadSession(dir: string, videoPath: string): Promise<Session | null> {
  try {
    const session = JSON.parse(await readFile(fileFor(dir, videoPath), 'utf8')) as Session
    return {
      ...session,
      clipSettings: Object.fromEntries(
        Object.entries(session.clipSettings).map(([id, settings]) => [id, { ...DEFAULT_SETTINGS, ...settings }])
      ),
      defaultSettings: { ...DEFAULT_SETTINGS, ...session.defaultSettings }
    }
  } catch {
    return null
  }
}

export async function saveSession(dir: string, videoPath: string, session: Session): Promise<void> {
  const file = fileFor(dir, videoPath)
  if (session.clips.length === 0) {
    await rm(file, { force: true })
    return
  }
  await mkdir(dir, { recursive: true })
  await writeFile(file, JSON.stringify(session))
}

export async function removeSession(dir: string, videoPath: string): Promise<void> {
  await rm(fileFor(dir, videoPath), { force: true })
}

export async function listSessions(dir: string): Promise<Session[]> {
  const files = await readdir(dir).catch((): string[] => [])
  const sessions = await Promise.all(
    files
      .filter((file) => file.endsWith('.json'))
      .map(async (file) => {
        try {
          return JSON.parse(await readFile(join(dir, file), 'utf8')) as Session
        } catch {
          return null
        }
      })
  )
  return sessions.filter((session): session is Session => Array.isArray(session?.sources))
}
