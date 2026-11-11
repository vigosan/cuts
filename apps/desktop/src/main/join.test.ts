import { describe, expect, it } from 'vitest'
import { concatList, firstMismatch, joinArgs, joinKey, parseMediaInfo } from './join'

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
  it('reads the duration and the codec signatures of an iPhone clip', () => {
    expect(parseMediaInfo(iphone('1920x1080', '29.98'))).toEqual({
      duration: 12.48,
      video: 'h264 yuv420p(tv, bt709, progressive) 1920x1080 rotated 0',
      audio: 'aac 48000 Hz stereo'
    })
  })

  it('ignores frame rate so clips from the same camera at different fps still join', () => {
    expect(parseMediaInfo(iphone('1920x1080', '60'))).toEqual(parseMediaInfo(iphone('1920x1080', '29.98')))
  })

  it('reports a missing audio track as null', () => {
    const silent = iphone('1920x1080', '30').replace(/.*Audio:.*\n/, '')
    expect(parseMediaInfo(silent).audio).toBeNull()
  })

  it('adds up hours, minutes and seconds', () => {
    expect(parseMediaInfo(iphone('1920x1080', '30').replace('00:00:12.48', '01:02:03.50')).duration).toBe(3723.5)
  })
})

describe('firstMismatch', () => {
  const hd = parseMediaInfo(iphone('1920x1080', '30'))
  const uhd = parseMediaInfo(iphone('3840x2160', '30'))

  it('points at the first video that cannot be stream-copied with the others', () => {
    expect(firstMismatch([hd, hd, uhd, hd])).toBe(2)
  })

  it('also catches a different audio layout', () => {
    expect(firstMismatch([hd, { ...hd, audio: 'aac 44100 Hz mono' }])).toBe(1)
  })

  it('returns -1 when every video matches', () => {
    expect(firstMismatch([hd, hd, hd])).toBe(-1)
  })
})

describe('firstMismatch on iPhone clips', () => {
  it('refuses to join a portrait clip with a landscape one, since both are stored 1920x1080 and one would play sideways', () => {
    const landscape = parseMediaInfo(hevc('Main', SDR, null))
    const portrait = parseMediaInfo(hevc('Main', SDR, 'Display Matrix: rotation of -90.00 degrees'))
    expect(firstMismatch([landscape, portrait])).toBe(1)
  })

  it('refuses to join an HDR clip with an SDR one, since stream copy would show one of them with the wrong colours', () => {
    expect(firstMismatch([parseMediaInfo(hevc('Main 10', HDR, null)), parseMediaInfo(hevc('Main', SDR, null))])).toBe(1)
  })

  it('joins two portrait clips filmed the same way, so a vertical set still opens as one session', () => {
    const portrait = parseMediaInfo(hevc('Main 10', HDR, 'Display Matrix: rotation of -90.00 degrees'))
    expect(firstMismatch([portrait, parseMediaInfo(hevc('Main 10', HDR, 'Display Matrix: rotation of -90.00 degrees'))])).toBe(-1)
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

describe('concatList', () => {
  it('writes one file line per video in order', () => {
    expect(concatList(['/a.mov', '/b.mov'])).toBe("file '/a.mov'\nfile '/b.mov'\n")
  })

  it("escapes a quote in the path so ffmpeg does not end the string early", () => {
    expect(concatList(["/Users/me/Vicent's trip.mov"])).toBe("file '/Users/me/Vicent'\\''s trip.mov'\n")
  })
})

describe('joinArgs', () => {
  it('copies the streams without re-encoding and keeps audio optional', () => {
    expect(joinArgs('/t/list.txt', '/t/joined.mov')).toEqual([
      '-hide_banner', '-loglevel', 'error', '-y',
      '-f', 'concat', '-safe', '0', '-i', '/t/list.txt',
      '-map', '0:v', '-map', '0:a?', '-c', 'copy', '/t/joined.mov'
    ])
  })
})
