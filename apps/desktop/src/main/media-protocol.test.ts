import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { mediaUrl } from '../shared/media-url'
import { mediaResponse } from './media-protocol'

const dir = mkdtempSync(join(tmpdir(), 'cuts-media-'))
const video = join(dir, 'session.mp4')
const secret = join(dir, 'id_rsa')
writeFileSync(video, 'video bytes')
writeFileSync(secret, 'private key')

describe('mediaResponse', () => {
  it('streams a video the user opened', async () => {
    const response = await mediaResponse(new Request(mediaUrl(video)), (path) => path === video)
    expect(response.status).toBe(200)
    expect(await response.text()).toBe('video bytes')
  })

  it('refuses any other file, so a compromised page can never read the disk through the media scheme', async () => {
    const response = await mediaResponse(new Request(mediaUrl(secret)), (path) => path === video)
    expect(response.status).toBe(403)
    expect(await response.text()).toBe('')
  })

  it.each([
    ['set.wav', 'audio/wav'],
    ['set.mp3', 'audio/mpeg'],
    ['set.m4a', 'audio/mp4'],
    ['set.aac', 'audio/aac'],
    ['set.flac', 'audio/flac'],
    ['loop.jpg', 'image/jpeg'],
    ['loop.jpeg', 'image/jpeg']
  ])('serves %s as %s so the preview can play audio recordings and still backgrounds', async (name, type) => {
    const path = join(dir, name)
    writeFileSync(path, 'bytes')
    const response = await mediaResponse(new Request(mediaUrl(path)), (allowed) => allowed === path)
    expect(response.headers.get('Content-Type')).toBe(type)
  })
})
