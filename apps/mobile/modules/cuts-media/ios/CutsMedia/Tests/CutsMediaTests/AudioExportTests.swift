import AVFoundation
import CutsMedia
import Foundation
import Testing

private func audioJob(_ name: String, background: String, isImage: Bool = false, start: Double = 1, end: Double, format: String = "16:9",
                      wave: LayerSpec? = nil, bar: LayerSpec? = nil) -> ExportJob {
  var job = ExportJob(start: start, end: end, format: format, framing: "crop", cropX: 0.5, cropY: 0.5, videoFade: "none",
                      audioFade: "natural", fadeSeconds: 1, videoFadeIn: true, output: Inspect.output(name))
  job.background = BackgroundSpec(url: Fixtures.dir.appendingPathComponent(background), isImage: isImage)
  job.wave = wave
  job.bar = bar
  job.bitrate = 4_000_000
  return job
}

private func export(_ job: ExportJob) async throws -> AVURLAsset {
  try await Exporter().export(asset: Fixtures.asset("set.wav"), job: job) { _ in }
  return AVURLAsset(url: job.output)
}

private func bytes(_ image: CGImage) -> [UInt8] {
  var bytes = [UInt8](repeating: 0, count: image.width * image.height * 4)
  let context = CGContext(data: &bytes, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4,
                          space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  context?.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
  return bytes
}

private func difference(_ a: CGImage, _ b: CGImage) -> Int {
  zip(bytes(a), bytes(b)).enumerated().reduce(0) { sum, item in
    item.offset % 4 == 3 ? sum : sum + abs(Int(item.element.0) - Int(item.element.1))
  }
}

private func brightness(_ pixel: (UInt8, UInt8, UInt8)) -> Int {
  (Int(pixel.0) + Int(pixel.1) + Int(pixel.2)) / 3
}

@Suite(.serialized) struct AudioExportTests {
  @Test func aShortBackgroundLoopsSoTheVideoLastsAsLongAsTheClipAndKeepsMoving() async throws {
    let clip = try await export(audioJob("loop.mp4", background: "loop.mp4", end: 11))
    #expect(abs(try await clip.load(.duration).seconds - 10) <= 1.0 / 30)
    let video = try await clip.loadTracks(withMediaType: .video)[0]
    let (fps, rate) = try await video.load(.nominalFrameRate, .estimatedDataRate)
    #expect(abs(fps - 30) < 0.5)
    #expect(rate < 4_000_000 * 1.3)
    #expect(try await !clip.loadTracks(withMediaType: .audio).isEmpty)
    let before = try await Inspect.frameImage(clip, at: 4.5)
    let after = try await Inspect.frameImage(clip, at: 5)
    #expect(difference(before, after) > 1_000_000)
  }

  @Test func aStillImageBackgroundFillsTheWholeClip() async throws {
    let clip = try await export(audioJob("still.mp4", background: "still.jpg", isImage: true, end: 7))
    #expect(abs(try await clip.load(.duration).seconds - 6) <= 1.0 / 30)
    let last = try await Inspect.frameImage(clip, at: 5.5)
    #expect(brightness(Inspect.pixel(last, x: last.width / 2, y: last.height / 2)) > 20)
  }

  @Test func theWaveformIsDrawnWhereItWasPlacedSoItShowsTheMusic() async throws {
    let wave = LayerSpec(x: 0.24, y: 0.78, width: 0.52, color: "#ffffff", opacity: 1)
    let clip = try await export(audioJob("wave.mp4", background: "black.mp4", end: 3, wave: wave))
    let frame = try await Inspect.frameImage(clip, at: 1)
    let waveCentre = Inspect.pixel(frame, x: frame.width / 2, y: Int(Double(frame.height) * (0.78 + 0.52 * 1920 * 80 / 998 / 1080 / 2)))
    let above = Inspect.pixel(frame, x: frame.width / 2, y: Int(Double(frame.height) * 0.3))
    #expect(brightness(waveCentre) > brightness(above) + 30)
  }

  @Test func theProgressBarFillsAsTheClipPlays() async throws {
    let bar = LayerSpec(x: 0, y: 1 - 4.0 / 1080, width: 1, color: "#ffffff", opacity: 1)
    let clip = try await export(audioJob("bar.mp4", background: "black.mp4", end: 5, bar: bar))
    let middle = try await Inspect.frameImage(clip, at: 2)
    let row = middle.height - 2
    #expect(brightness(Inspect.pixel(middle, x: middle.width / 4, y: row)) > 150)
    #expect(brightness(Inspect.pixel(middle, x: middle.width * 3 / 4, y: row)) < 40)
  }

  @Test func theProgressBarTakesItsOwnColourSoItShowsOnALightBackground() async throws {
    let bar = LayerSpec(x: 0, y: 1 - 4.0 / 1080, width: 1, color: "#ff0000", opacity: 1)
    let clip = try await export(audioJob("bar-red.mp4", background: "black.mp4", end: 3, bar: bar))
    let frame = try await Inspect.frameImage(clip, at: 1.8)
    #expect(Inspect.isRed(Inspect.pixel(frame, x: 20, y: frame.height - 2)))
  }

  @Test func eachFrameGetsItsThirtiethOfASecondAtFullRateSoTheWaveIsAsDenseAsOnTheMac() async throws {
    let range = CMTimeRange(start: CMTime(seconds: 2, preferredTimescale: 600), duration: CMTime(seconds: 8, preferredTimescale: 600))
    let stream = try await SampleStream(asset: Fixtures.asset("set.wav"), range: range)
    let early = stream.window(at: 0.5, length: 1.0 / 30)
    let late = stream.window(at: 6, length: 1.0 / 30)
    #expect(early.count == 1470 && late.count == 1470)
    #expect(late.contains { abs(Int($0)) > 8000 })
    #expect(stream.window(at: 0.5, length: 1.0 / 30).isEmpty)
  }
}
