import AVFoundation

public final class SampleStream: @unchecked Sendable {
  public static let rate = 44100.0
  private let lock = NSLock()
  private let reader: AVAssetReader
  private let output: AVAssetReaderAudioMixOutput
  private var samples: [Int16] = []
  private var first = 0

  public init(asset: AVAsset, range: CMTimeRange) async throws {
    let tracks = Array(try await asset.loadTracks(withMediaType: .audio).prefix(1))
    reader = try AVAssetReader(asset: asset)
    reader.timeRange = range
    output = AVAssetReaderAudioMixOutput(audioTracks: tracks, audioSettings: [
      AVFormatIDKey: kAudioFormatLinearPCM,
      AVSampleRateKey: Self.rate,
      AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 16,
      AVLinearPCMIsFloatKey: false,
      AVLinearPCMIsBigEndianKey: false,
      AVLinearPCMIsNonInterleaved: false
    ])
    if !tracks.isEmpty {
      reader.add(output)
      guard reader.startReading() else { throw reader.error ?? CocoaError(.fileReadUnknown) }
    }
  }

  public func window(at seconds: Double, length: Double) -> ArraySlice<Int16> {
    lock.withLock {
      let from = max(0, Int(seconds * Self.rate))
      let to = from + Int(length * Self.rate)
      while first + samples.count < to, reader.status == .reading, let buffer = output.copyNextSampleBuffer() {
        guard let block = CMSampleBufferGetDataBuffer(buffer) else { continue }
        let count = CMBlockBufferGetDataLength(block) / 2
        var chunk = [Int16](repeating: 0, count: count)
        chunk.withUnsafeMutableBytes { _ = CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: count * 2, destination: $0.baseAddress!) }
        samples.append(contentsOf: chunk)
      }
      let drop = min(samples.count, max(0, from - Int(Self.rate) - first))
      samples.removeFirst(drop)
      first += drop
      let start = min(samples.count, max(0, from - first))
      return samples[start..<max(start, min(samples.count, to - first))]
    }
  }
}
