import { describe, expect, it } from 'vitest'
import { joinKey, parseMediaInfo } from './join'

const iphone = (size: string, fps: string) => `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'IMG_0001.MOV':
  Metadata:
    major_brand     : qt
    creation_time   : 2026-11-10T18:22:31.000000Z
  Duration: 00:00:12.48, start: 0.000000, bitrate: 15250 kb/s
  Stream #0:0[0x1](und): Video: h264 (High) (avc1 / 0x31637661), yuv420p(tv, bt709, progressive), ${size}, 15006 kb/s, ${fps} fps, 29.97 tbr, 600 tbn (default)
  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706d), 48000 Hz, stereo, fltp, 191 kb/s (default)
  Stream #0:2[0x3](und): Data: none (mebx / 0x7862656d), 0 kb/s (default)
`

const hevc = (profile: string, pixelFormat: string, rotation: string | null) => `Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'IMG_0002.MOV':
  Duration: 00:00:09.10, start: 0.000000, bitrate: 9105 kb/s
  Stream #0:0[0x1](und): Video: hevc (${profile}) (hvc1 / 0x31637668), ${pixelFormat}, 1920x1080, 8952 kb/s, 29.97 fps, 29.97 tbr, 600 tbn (default)
    Metadata:
      creation_time   : 2026-11-10T18:25:02.000000Z
      handler_name    : Core Media Video
      vendor_id       : [0][0][0][0]
      encoder         : HEVC
${rotation === null ? '' : `    Side data:\n      ${rotation}\n`}  Stream #0:1[0x2](und): Audio: aac (LC) (mp4a / 0x6134706d), 44100 Hz, stereo, fltp, 160 kb/s (default)
`
const HDR = 'yuv420p10le(tv, bt2020nc/bt2020/arib-std-b67)'
const SDR = 'yuv420p(tv, bt709)'

describe('parseMediaInfo', () => {
  it('reads the duration, display size and codec signatures of an iPhone clip', () => {
    expect(parseMediaInfo(iphone('1920x1080', '29.98'))).toEqual({
      duration: 12.48,
      width: 1920,
      height: 1080,
      rotation: 0,
      hdr: false,
      video: 'h264 yuv420p(tv, bt709, progressive) 1920x1080 rotated 0',
      audio: 'aac 48000 Hz stereo'
    })
  })

  it('reports a missing audio track as null', () => {
    const silent = iphone('1920x1080', '30').replace(/.*Audio:.*\n/, '')
    expect(parseMediaInfo(silent).audio).toBeNull()
  })

  it('adds up hours, minutes and seconds', () => {
    expect(parseMediaInfo(iphone('1920x1080', '30').replace('00:00:12.48', '01:02:03.50')).duration).toBe(3723.5)
  })

  it('gives a portrait HDR iPhone clip its upright size and flags it HDR, so framing and the full export treat it as the picture the user sees', () => {
    expect(parseMediaInfo(hevc('Main 10', HDR, 'Display Matrix: rotation of -90.00 degrees'))).toMatchObject({ width: 1080, height: 1920, rotation: -90, hdr: true })
  })

  it('keeps a landscape SDR clip as stored and not HDR', () => {
    expect(parseMediaInfo(hevc('Main', SDR, null))).toMatchObject({ width: 1920, height: 1080, rotation: 0, hdr: false })
  })

  it('flags PQ video as HDR too, since it needs the same care as HLG', () => {
    expect(parseMediaInfo(hevc('Main 10', 'yuv420p10le(tv, bt2020nc/bt2020/smpte2084)', null)).hdr).toBe(true)
  })

  it('reads the rotation as older ffmpeg builds print it too, since outside the App Store a system ffmpeg may be used', () => {
    expect(parseMediaInfo(hevc('Main', SDR, 'displaymatrix: rotation of -90.00 degrees'))).toEqual(
      parseMediaInfo(hevc('Main', SDR, 'Display Matrix: rotation of -90.00 degrees'))
    )
  })
})

describe('joinKey', () => {
  it('does not depend on the order the videos were picked in', () => {
    expect(joinKey(['/a.mov', '/b.mov'])).toBe(joinKey(['/b.mov', '/a.mov']))
  })

  it('differs when the set of videos differs', () => {
    expect(joinKey(['/a.mov', '/b.mov'])).not.toBe(joinKey(['/a.mov', '/c.mov']))
  })

  it('is 32 hex characters', () => {
    expect(joinKey(['/a.mov'])).toMatch(/^[0-9a-f]{32}$/)
  })
})
