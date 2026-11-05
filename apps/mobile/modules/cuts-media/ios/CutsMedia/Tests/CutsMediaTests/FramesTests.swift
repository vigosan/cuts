import CoreGraphics
import CutsMedia
import Foundation
import ImageIO
import Testing

@Suite struct FramesTests {
  @Test func thumbnailIsUprightSoPortraitSetsLookRightOnTheTimeline() async throws {
    let image = try await thumbnail(asset: Fixtures.asset("rotated.mp4"), at: 5, height: 64)
    #expect(image.height == 64)
    #expect(image.height > image.width)
  }

  @Test func savedFrameUsesTheClipFramingLikeTheMac() async throws {
    let data = try await frame(asset: Fixtures.asset("set.mp4"), at: 30, job: FrameJob(format: "4:5", framing: "crop", cropX: 0.5, cropY: 0.5))
    let source = try #require(CGImageSourceCreateWithData(data as CFData, nil))
    let image = try #require(CGImageSourceCreateImageAtIndex(source, 0, nil))
    #expect(CGImageSourceGetType(source) as String? == "public.jpeg")
    #expect(image.width == 1080 && image.height == 1350)
  }

  @Test func savedFrameCarriesTheOverlayLikeTheMac() async throws {
    let overlay = OverlaySpec(url: Fixtures.dir.appendingPathComponent("overlay-red.png"), x: 0.5, y: 0.1, width: 0.25)
    let data = try await frame(asset: Fixtures.asset("set.mp4"), at: 30,
                               job: FrameJob(format: "4:5", framing: "crop", cropX: 0.5, cropY: 0.5, overlay: overlay))
    let source = try #require(CGImageSourceCreateWithData(data as CFData, nil))
    let image = try #require(CGImageSourceCreateImageAtIndex(source, 0, nil))
    #expect(Inspect.isRed(Inspect.pixel(image, x: 675, y: 202)))
    #expect(!Inspect.isRed(Inspect.pixel(image, x: 100, y: 100)))
  }
}
