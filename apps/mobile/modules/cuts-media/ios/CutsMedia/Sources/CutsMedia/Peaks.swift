import AVFoundation

public let waveformSampleRate = 2000
public let peaksPerSecond = 50

private let readSampleRate = 8000.0

public func readPeaks(asset: AVAsset) async throws -> [Float]? {
  let tracks = Array(try await asset.loadTracks(withMediaType: .audio).prefix(1))
  guard !tracks.isEmpty else { return nil }
  let channels = try await channelCount(tracks[0])
  let reader = try AVAssetReader(asset: asset)
  let output = AVAssetReaderAudioMixOutput(audioTracks: tracks, audioSettings: [
    AVFormatIDKey: kAudioFormatLinearPCM,
    AVSampleRateKey: readSampleRate,
    AVNumberOfChannelsKey: channels,
    AVLinearPCMBitDepthKey: 32,
    AVLinearPCMIsFloatKey: true,
    AVLinearPCMIsBigEndianKey: false,
    AVLinearPCMIsNonInterleaved: false
  ])
  reader.add(output)
  guard reader.startReading() else { throw reader.error ?? CocoaError(.fileReadUnknown) }

  let peaks = Peaks()
  let downsampler = try Downsampler()
  while let buffer = output.copyNextSampleBuffer() {
    guard let block = CMSampleBufferGetDataBuffer(buffer) else { continue }
    let count = CMBlockBufferGetDataLength(block) / 4
    guard count > 0 else { continue }
    var interleaved = [Float](repeating: 0, count: count)
    interleaved.withUnsafeMutableBytes { _ = CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: count * 4, destination: $0.baseAddress!) }
    peaks.add(try downsampler.convert(mono(interleaved, channels: channels), last: false))
  }
  if reader.status == .failed { throw reader.error ?? CocoaError(.fileReadUnknown) }
  peaks.add(try downsampler.convert([], last: true))
  return peaks.values
}

private func channelCount(_ track: AVAssetTrack) async throws -> Int {
  let formats = try await track.load(.formatDescriptions)
  let description = formats.first.flatMap { CMAudioFormatDescriptionGetStreamBasicDescription($0)?.pointee }
  return min(2, max(1, Int(description?.mChannelsPerFrame ?? 1)))
}

private func mono(_ interleaved: [Float], channels: Int) -> [Float] {
  guard channels > 1 else { return interleaved }
  return stride(from: 0, to: interleaved.count - channels + 1, by: channels).map { frame in
    interleaved[frame..<frame + channels].reduce(0, +) / Float(channels)
  }
}

final class Downsampler {
  private let input = AVAudioFormat(commonFormat: .pcmFormatFloat32, sampleRate: readSampleRate, channels: 1, interleaved: false)!
  private let target = AVAudioFormat(commonFormat: .pcmFormatInt16, sampleRate: Double(waveformSampleRate), channels: 1, interleaved: false)!
  private let converter: AVAudioConverter

  init() throws {
    guard let converter = AVAudioConverter(from: input, to: target) else { throw CocoaError(.featureUnsupported) }
    converter.sampleRateConverterQuality = AVAudioQuality.max.rawValue
    self.converter = converter
  }

  func convert(_ samples: [Float], last: Bool) throws -> [Int16] {
    let inBuffer = AVAudioPCMBuffer(pcmFormat: input, frameCapacity: AVAudioFrameCount(max(1, samples.count)))!
    inBuffer.frameLength = AVAudioFrameCount(samples.count)
    samples.withUnsafeBufferPointer { if let base = $0.baseAddress { inBuffer.floatChannelData![0].update(from: base, count: samples.count) } }
    var result: [Int16] = []
    var fed = false
    while true {
      let outBuffer = AVAudioPCMBuffer(pcmFormat: target, frameCapacity: 4096)!
      var error: NSError?
      let status = converter.convert(to: outBuffer, error: &error) { _, state in
        if fed || samples.isEmpty {
          state.pointee = last ? .endOfStream : .noDataNow
          return nil
        }
        fed = true
        state.pointee = .haveData
        return inBuffer
      }
      if let error { throw error }
      result.append(contentsOf: UnsafeBufferPointer(start: outBuffer.int16ChannelData![0], count: Int(outBuffer.frameLength)))
      if status != .haveData { return result }
    }
  }
}

final class Peaks {
  private(set) var values: [Float] = []
  private var index = 0
  private let samplesPerPeak = waveformSampleRate / peaksPerSecond

  func add(_ samples: [Int16]) {
    for sample in samples {
      let slot = index / samplesPerPeak
      if slot == values.count { values.append(0) }
      let value = Float(abs(Int32(sample))) / 32768
      if value > values[slot] { values[slot] = value }
      index += 1
    }
  }
}
