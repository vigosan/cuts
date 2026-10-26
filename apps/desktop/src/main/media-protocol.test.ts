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
})
