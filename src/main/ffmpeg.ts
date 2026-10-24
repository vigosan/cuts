import { spawn, type ChildProcess } from 'node:child_process'
import { rmSync } from 'node:fs'
import { parseProgressSeconds } from './ffmpeg-args'

const running = new Map<ChildProcess, string>()
let stopping = false
const capturing = new Set<ChildProcess>()

export function cancelFfmpeg(): void {
  for (const [child, output] of running) {
    child.kill('SIGKILL')
    rmSync(output, { force: true })
  }
}

export function stopAllFfmpeg(): void {
  stopping = true
  for (const child of capturing) child.kill('SIGKILL')
  cancelFfmpeg()
}

export function runFfmpeg(ffmpeg: string, args: string[], onSeconds: (seconds: number) => void): Promise<void> {
  if (stopping) return Promise.reject(new Error('The app is quitting'))
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args)
    running.set(child, args.at(-1)!)
    let stderr = ''
    child.stdout.on('data', (data: Buffer) => {
      const seconds = parseProgressSeconds(data.toString())
      if (seconds !== null) onSeconds(seconds)
    })
    child.stderr.on('data', (data: Buffer) => {
      stderr = (stderr + data.toString()).slice(-4000)
    })
    child.on('error', reject)
    child.on('exit', () => running.delete(child))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim().split('\n').slice(-3).join('\n') || `ffmpeg exited with ${code}`))
    })
  })
}

export function captureFfmpeg(ffmpeg: string, args: string[]): Promise<Buffer> {
  if (stopping) return Promise.reject(new Error('The app is quitting'))
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args)
    capturing.add(child)
    const chunks: Buffer[] = []
    let stderr = ''
    child.stdout.on('data', (data: Buffer) => chunks.push(data))
    child.stderr.on('data', (data: Buffer) => {
      stderr = (stderr + data.toString()).slice(-2000)
    })
    child.on('error', reject)
    child.on('close', (code) => {
      capturing.delete(child)
      if (code === 0) resolve(Buffer.concat(chunks))
      else reject(new Error(stderr.trim() || `ffmpeg exited with ${code}`))
    })
  })
}
