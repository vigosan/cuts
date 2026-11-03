import AVFoundation
import CutsMedia
import Foundation
import Testing

@Suite struct PeaksTests {
  @Test func peaksMatchMacPipelineSoSuggestionsAgree() async throws {
    let data = try Data(contentsOf: Fixtures.dir.appendingPathComponent("set-reference-peaks.json"))
    let reference = try JSONDecoder().decode([Float].self, from: data)
    let peaks = try #require(try await readPeaks(asset: Fixtures.asset("set.mp4")))
    #expect(abs(peaks.count - reference.count) <= 1)
    let pairs = zip(peaks, reference).map { abs($0 - $1) }
    #expect(pairs.reduce(0, +) / Float(pairs.count) < 0.01)
    #expect(pairs.sorted()[pairs.count * 99 / 100] < 0.02)
    let second = { (values: [Float]) in stride(from: 0, to: 29_950, by: 50).map { values[$0..<$0 + 50].reduce(0, +) / 50 } }
    #expect(zip(second(peaks), second(reference)).map { abs($0 - $1) }.max()! < 0.01)
  }

  @Test func noAudioGivesNilSoSuggestCanExplain() async throws {
    #expect(try await readPeaks(asset: Fixtures.asset("silent.mp4")) == nil)
  }

  @Test func extraAudioTracksDoNotChangeThePeaks() async throws {
    let single = try #require(try await readPeaks(asset: Fixtures.asset("rotated.mp4")))
    let double = try #require(try await readPeaks(asset: Fixtures.asset("two-tracks.mp4")))
    #expect(abs(double.max()! - single.max()!) < 0.02)
  }
}
