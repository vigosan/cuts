import CutsMedia
import Testing

@Suite struct LibraryTests {
  @Test func anAudioRecordingOpensAsAudioWithItsLengthSoItCanBeCutLikeAVideo() async throws {
    let info = try await mediaInfo(asset: Fixtures.asset("set.wav"))
    #expect(info.kind == .audio)
    #expect(abs(info.duration - 12) < 0.05)
    #expect(info.size == .zero)
    #expect(info.frameRate == 30)
  }

  @Test func aVideoStillOpensAsVideoWithItsUprightSize() async throws {
    let info = try await mediaInfo(asset: Fixtures.asset("set.mp4"))
    #expect(info.kind == .video)
    #expect(info.size.width == 640)
    #expect(info.size.height == 360)
  }

  @Test func aFileWithoutPictureOrSoundIsRefused() async {
    await #expect(throws: (any Error).self) { try await mediaInfo(asset: Fixtures.asset("overlay-red.png")) }
  }
}
