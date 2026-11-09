import CutsMedia
import Foundation
import ImageIO
import UniformTypeIdentifiers
import Testing

@Suite struct BackgroundsTests {
  private func folder() throws -> URL {
    let dir = FileManager.default.temporaryDirectory.appendingPathComponent("backgrounds-\(UUID().uuidString)")
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }

  private func names(_ dir: URL) throws -> [String] {
    try FileManager.default.contentsOfDirectory(atPath: dir.path).sorted()
  }

  @Test func aVideoIsCopiedSoTheBackgroundSurvivesTheOriginalBeingMovedAndOnlyOneIsKept() async throws {
    let dir = try folder()
    _ = try await storeBackground(from: Fixtures.dir.appendingPathComponent("still.jpg"), in: dir, now: 1)
    let stored = try await storeBackground(from: Fixtures.dir.appendingPathComponent("silent.mp4"), in: dir, now: 2)
    #expect(stored.path == dir.appendingPathComponent("background-2.mp4").path)
    #expect(stored.kind == "video")
    #expect(stored.name == "silent.mp4")
    #expect(stored.width == 640 && stored.height == 360)
    #expect(try names(dir) == ["background-2.mp4"])
  }

  @Test func anImageKeepsItsPixelSizeSoTheFrameCanFitIt() async throws {
    let stored = try await storeBackground(from: Fixtures.dir.appendingPathComponent("still.jpg"), in: try folder(), now: 3)
    #expect(stored.kind == "image")
    #expect(stored.width == 320 && stored.height == 180)
  }

  @Test func aPortraitPhotoReportsItsUprightSizeSoTheFrameMatchesWhatIsShown() async throws {
    let dir = try folder()
    let source = try #require(CGImageSourceCreateWithURL(Fixtures.dir.appendingPathComponent("still.jpg") as CFURL, nil))
    let rotated = dir.appendingPathComponent("portrait.jpg")
    let destination = try #require(CGImageDestinationCreateWithURL(rotated as CFURL, UTType.jpeg.identifier as CFString, 1, nil))
    CGImageDestinationAddImageFromSource(destination, source, 0, [kCGImagePropertyOrientation: 6] as CFDictionary)
    #expect(CGImageDestinationFinalize(destination))
    let stored = try await storeBackground(from: rotated, in: try folder(), now: 6)
    #expect(stored.width == 180 && stored.height == 320)
  }

  @Test func aGifIsRefusedBecauseExportCannotLoopIt() async throws {
    await #expect(throws: BackgroundError.invalid) {
      try await storeBackground(from: Fixtures.dir.appendingPathComponent("still.gif"), in: try folder(), now: 4)
    }
  }

  @Test func aFileOverFiveHundredMegabytesIsRefusedWithoutCopyingAnything() async throws {
    let dir = try folder()
    await #expect(throws: BackgroundError.tooBig) {
      try await storeBackground(from: Fixtures.dir.appendingPathComponent("silent.mp4"), in: dir, now: 5, size: { _ in 500 * 1024 * 1024 + 1 })
    }
    #expect(try names(dir).isEmpty)
  }
}
