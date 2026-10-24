import { spawn, type ChildProcess } from 'node:child_process'
import { parseProgressSeconds } from './ffmpeg-args'

const running = new Set<ChildProcess>()

export function stopAllFfmpeg(): void {
  for (const child of running) child.kill('SIGKILL')
}

export function runFfmpeg(ffmpeg: string, args: string[], onSeconds: (seconds: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args)
    running.add(child)
    let stderr = ''
    child.stdout.on('data', (data: Buffer) => {
      const seconds = parseProgressSeconds(data.toString())
      if (seconds !== null) onSeconds(seconds)
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr = (stderr + data.toString()).slice(-4000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      running.delete(child)
      if (code === 0) resolve()
      else reject(new Error(stderr.trim().split('\n').slice(-3).join('\n') || `ffmpeg exited with ${code}`))
    })
  })
}
