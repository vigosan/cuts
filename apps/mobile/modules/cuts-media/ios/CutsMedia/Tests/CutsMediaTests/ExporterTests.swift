import AVFoundation
import CutsMedia
import Foundation
import Testing

private func job(_ name: String, start: Double = 30, end: Double = 89, format: String = "4:5", framing: String = "crop",
                 videoFade: String = "black", audioFade: String = "natural", fadeSeconds: Double = 1, videoFadeIn: Bool = true) -> ExportJob {
  ExportJob(start: start, end: end, format: format, framing: framing, cropX: 0.5, cropY: 0.5, videoFade: videoFade,
            audioFade: audioFade, fadeSeconds: fadeSeconds, videoFadeIn: videoFadeIn, output: Inspect.output(name))
}

private func export(_ source: String, _ job: ExportJob) async throws -> AVURLAsset {
  try await Exporter().export(asset: Fixtures.asset(source), job: job) { _ in }
  return AVURLAsset(url: job.output)
}

@Suite(.serialized) struct ExporterTests {
  @Test func lengthMatchesTheClipSoInstagramAcceptsIt() async throws {
    let clip = try await export("set.mp4", job("length.mp4"))
    #expect(abs(try await clip.load(.duration).seconds - 59) <= 1.0 / 30)
  }

  @Test func formatSizeAndCodecMatchTheMac() async throws {
    let clip = try await export("set.mp4", job("format.mp4"))
    let video = try await clip.loadTracks(withMediaType: .video)[0]
    let (size, fps, rate) = try await video.load(.naturalSize, .nominalFrameRate, .estimatedDataRate)
    #expect(size == CGSize(width: 1080, height: 1350))
    #expect(abs(fps - 30) < 0.5)
    #expect(rate > 12_000_000 * 0.5 && rate < 12_000_000 * 1.3)
    let format = try await Inspect.videoFormat(clip)
    #expect(CMFormatDescriptionGetMediaSubType(format) == kCMVideoCodecType_H264)
    #expect(format.extensions[.colorPrimaries] == .colorPrimaries(.itu_R_709_2))
    let audio = try await clip.loadTracks(withMediaType: .audio)[0]
    let audioFormat = try await audio.load(.formatDescriptions)[0]
    #expect(CMFormatDescriptionGetMediaSubType(audioFormat) == kAudioFormatMPEG4AAC)
  }

  @Test func originalKeepsPortraitVideoUpright() async throws {
    let clip = try await export("rotated.mp4", job("rotated.mp4", start: 2, end: 8, format: "original"))
    #expect(try await Inspect.uprightSize(clip) == CGSize(width: 360, height: 640))
  }

  @Test func coverStartsWithImageSoTheCarouselThumbnailIsNotBlack() async throws {
    let cover = try await export("set.mp4", job("cover.mp4", end: 40, videoFadeIn: false))
    #expect(try await Inspect.luma(cover, at: 0) > 0.2)
    let black = try await export("set.mp4", job("black.mp4", end: 40))
    #expect(try await Inspect.luma(black, at: 0) < 0.05)
    let white = try await export("set.mp4", job("white.mp4", end: 40, videoFade: "white"))
    #expect(try await Inspect.luma(white, at: 0) > 0.95)
  }

  @Test func shortClipCapsTheFadeAtHalfItsLength() async throws {
    let faded = try await export("set.mp4", job("short.mp4", start: 30, end: 31, fadeSeconds: 5))
    let plain = try await export("set.mp4", job("short-plain.mp4", start: 30, end: 31, videoFade: "none"))
    #expect(abs(try await Inspect.luma(faded, at: 0.5) - (try await Inspect.luma(plain, at: 0.5))) < 0.05)
  }

  @Test func naturalAudioFadeFollowsTheMacCurve() async throws {
    let clip = try await export("set.mp4", job("audio.mp4", start: 121, end: 131, fadeSeconds: 2))
    let ratio = try await Inspect.rms(clip, from: 0.475, length: 0.05) / (try await Inspect.rms(clip, from: 5, length: 0.05))
    #expect(abs(ratio - sin(Double.pi / 8)) < 0.08)
  }

  @Test func silentSourceExportsVideoOnly() async throws {
    let clip = try await export("silent.mp4", job("silent.mp4", start: 1, end: 4))
    #expect(try await clip.loadTracks(withMediaType: .audio).isEmpty)
    #expect(try await clip.loadTracks(withMediaType: .video).count == 1)
  }

  @Test func hdrBecomesSdrSoInstagramShowsTrueColours() async throws {
    let clip = try await export("hdr.mov", job("hdr.mp4", start: 1, end: 4))
    let format = try await Inspect.videoFormat(clip)
    #expect(format.extensions[.transferFunction] == .transferFunction(.itu_R_709_2))
  }

  @Test func clipEndingPastTheVideoStopsAtItsEnd() async throws {
    let clip = try await export("rotated.mp4", job("past-end.mp4", start: 15, end: 20.1, format: "original"))
    #expect(abs(try await clip.load(.duration).seconds - 5) <= 1.0 / 30)
  }

  @Test func onlyTheFirstAudioTrackIsUsedLikeTheMac() async throws {
    let single = try await export("rotated.mp4", job("one-track.mp4", start: 2, end: 8, format: "original", audioFade: "none"))
    let double = try await export("two-tracks.mp4", job("two-tracks.mp4", start: 2, end: 8, format: "original", audioFade: "none"))
    let a = try await Inspect.rms(single, from: 1, length: 2)
    let b = try await Inspect.rms(double, from: 1, length: 2)
    #expect(abs(b / a - 1) < 0.1)
  }

  @Test func cancelLeavesNoHalfWrittenFile() async throws {
    let exporter = Exporter()
    let target = job("cancel.mp4")
    await #expect(throws: CancellationError.self) {
      try await exporter.export(asset: Fixtures.asset("set.mp4"), job: target) { _ in exporter.cancel() }
    }
    #expect(!FileManager.default.fileExists(atPath: target.output.path))
  }

  @Test func speedOnMacGivesABaselineForTheiPhoneGate() async throws {
    let clock = ContinuousClock()
    let elapsed = try await clock.measure {
      for index in 0..<6 {
        let start = Double(index) * 90
        _ = try await export("set.mp4", job("speed-\(index).mp4", start: start, end: start + 59))
      }
    }
    print("six 59 s 4:5 clips exported in \(elapsed)")
    #expect(elapsed < .seconds(600))
  }
}
