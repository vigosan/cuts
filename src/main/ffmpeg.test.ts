import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'

const locked = { value: true }
const removed: string[] = []

vi.mock('node:fs', () => ({
  rmSync: (path: string) => {
    if (locked.value) throw Object.assign(new Error(`EPERM, Permission denied: '${path}'`), { code: 'EPERM' })
    removed.push(path)
  }
}))

vi.mock('node:child_process', () => ({
  spawn: () => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: () => {
        setTimeout(() => {
          locked.value = false
          child.emit('exit', null)
          child.emit('close', null)
        })
        return true
      }
    })
    return child
  }
}))

const { cancelFfmpeg, runFfmpeg } = await import('./ffmpeg')

describe('cancelFfmpeg', () => {
  it('removes the half-written clip once ffmpeg lets go of it, because Windows keeps the file locked until the process has exited', async () => {
    const exporting = runFfmpeg('ffmpeg', ['-i', 'in.mov', 'C:\\Videos\\clip-1.mp4'], () => {})
    expect(() => cancelFfmpeg()).not.toThrow()
    await expect(exporting).rejects.toThrow()
    expect(removed).toEqual(['C:\\Videos\\clip-1.mp4'])
  })
})
