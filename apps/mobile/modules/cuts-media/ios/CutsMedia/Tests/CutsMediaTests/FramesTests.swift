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
}
