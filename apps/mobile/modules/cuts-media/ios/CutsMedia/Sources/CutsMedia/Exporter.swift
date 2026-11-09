import AVFoundation
import CoreImage
import Foundation

public final class Exporter: @unchecked Sendable {
  private let lock = NSLock()
  private var cancelled = false

  public init() {}

  private var pumps: [Pump] = []

  public func cancel() {
    let running = lock.withLock {
      cancelled = true
      return pumps
    }
    running.forEach { $0.stop() }
  }

  private var isCancelled: Bool { lock.withLock { cancelled } }

  public func export(asset: AVAsset, job: ExportJob, progress: @escaping @Sendable (Double) -> Void) async throws {
    try? FileManager.default.removeItem(at: job.output)
    do {
      try await run(asset: asset, job: job, progress: progress)
    } catch {
      try? FileManager.default.removeItem(at: job.output)
      throw error
    }
  }

  private func run(asset: AVAsset, job requested: ExportJob, progress: @escaping @Sendable (Double) -> Void) async throws {
    var clamped = requested
    clamped.end = min(clamped.end, try await asset.load(.duration).seconds)
    let source: Source
    let job: ExportJob
    if let background = clamped.background {
      source = try await backgroundSource(background, recording: asset, job: clamped)
      job = clamped.startingAtZero
    } else {
      source = try await videoSource(asset)
      job = clamped
    }
    let samples = job.wave == nil ? nil : try await SampleStream(asset: asset, range: clamped.range)
    let videoTrack = source.videoTrack
    let audioTracks = source.audioTracks
    let framer = Framer(job: job, sourceSize: source.size)
    let range = job.range

    let composition = try await AVMutableVideoComposition.videoComposition(with: source.asset) { request in
      let seconds = request.compositionTime.seconds - job.start
      let framed = framer.overlay(image: framer.render(image: source.still ?? request.sourceImage))
      let layered = job.wave == nil && job.bar == nil ? framed : framer.layers(image: framed, at: seconds, samples: samples)
      request.finish(with: framer.fade(image: layered, at: seconds, clipLength: job.length), context: nil)
    }
    composition.renderSize = framer.renderSize
    composition.frameDuration = source.frameDuration
    composition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
    composition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
    composition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

    let reader = try AVAssetReader(asset: source.asset)
    reader.timeRange = range
    let videoOutput = AVAssetReaderVideoCompositionOutput(videoTracks: [videoTrack], videoSettings: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA
    ])
    videoOutput.videoComposition = composition
    reader.add(videoOutput)

    let writer = try AVAssetWriter(outputURL: job.output, fileType: .mp4)
    writer.shouldOptimizeForNetworkUse = true
    let videoInput = AVAssetWriterInput(mediaType: .video, outputSettings: [
      AVVideoCodecKey: AVVideoCodecType.h264,
      AVVideoWidthKey: framer.renderSize.width,
      AVVideoHeightKey: framer.renderSize.height,
      AVVideoColorPropertiesKey: [
        AVVideoColorPrimariesKey: AVVideoColorPrimaries_ITU_R_709_2,
        AVVideoTransferFunctionKey: AVVideoTransferFunction_ITU_R_709_2,
        AVVideoYCbCrMatrixKey: AVVideoYCbCrMatrix_ITU_R_709_2
      ],
      AVVideoCompressionPropertiesKey: [
        AVVideoAverageBitRateKey: job.bitrate,
        AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
        AVVideoExpectedSourceFrameRateKey: Int((1 / composition.frameDuration.seconds).rounded())
      ]
    ])
    videoInput.expectsMediaDataInRealTime = false
    writer.add(videoInput)

    var audio: (AVAssetReaderAudioMixOutput, AVAssetWriterInput)?
    if !audioTracks.isEmpty {
      let output = AVAssetReaderAudioMixOutput(audioTracks: audioTracks, audioSettings: [
        AVFormatIDKey: kAudioFormatLinearPCM,
        AVSampleRateKey: 44100,
        AVNumberOfChannelsKey: 2,
        AVLinearPCMBitDepthKey: 16,
        AVLinearPCMIsFloatKey: false,
        AVLinearPCMIsBigEndianKey: false,
        AVLinearPCMIsNonInterleaved: false
      ])
      output.audioMix = audioMix(tracks: audioTracks, job: job)
      reader.add(output)
      let input = AVAssetWriterInput(mediaType: .audio, outputSettings: [
        AVFormatIDKey: kAudioFormatMPEG4AAC,
        AVSampleRateKey: 44100,
        AVNumberOfChannelsKey: 2,
        AVEncoderBitRateKey: 320_000
      ])
      input.expectsMediaDataInRealTime = false
      writer.add(input)
      audio = (output, input)
    }

    guard reader.startReading() else { throw reader.error ?? CocoaError(.fileReadUnknown) }
    guard writer.startWriting() else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
    writer.startSession(atSourceTime: range.start)

    let pumps = [Pump(output: videoOutput, input: videoInput)] + (audio.map { [Pump(output: $0.0, input: $0.1)] } ?? [])
    lock.withLock { self.pumps = pumps }
    defer { lock.withLock { self.pumps = [] } }
    if isCancelled { pumps.forEach { $0.stop() } }
    let finished = await withTaskGroup(of: Bool.self) { group in
      for (index, pump) in pumps.enumerated() {
        group.addTask {
          let complete = await pump.run { time in
            if index == 0 { progress(max(0, min(1, (time.seconds - job.start) / job.length))) }
          }
          if !complete { pumps.forEach { $0.stop() } }
          return complete
        }
      }
      return await group.reduce(true) { $0 && $1 }
    }

    if !finished {
      reader.cancelReading()
      writer.cancelWriting()
      if isCancelled { throw CancellationError() }
      throw writer.error ?? reader.error ?? CocoaError(.fileWriteUnknown)
    }
    if reader.status == .failed { throw reader.error ?? CocoaError(.fileReadUnknown) }
    writer.endSession(atSourceTime: range.end)
    await writer.finishWriting()
    if writer.status != .completed { throw writer.error ?? CocoaError(.fileWriteUnknown) }
    progress(1)
  }

  private func videoSource(_ asset: AVAsset) async throws -> Source {
    let videoTrack = try await asset.loadTracks(withMediaType: .video)[0]
    let audioTracks = Array(try await asset.loadTracks(withMediaType: .audio).prefix(1))
    let (naturalSize, transform, frameDuration) = try await videoTrack.load(.naturalSize, .preferredTransform, .minFrameDuration)
    let upright = CGRect(origin: .zero, size: naturalSize).applying(transform)
    return Source(asset: asset, videoTrack: videoTrack, audioTracks: audioTracks, size: CGSize(width: abs(upright.width), height: abs(upright.height)),
                  frameDuration: frameDuration.isValid && frameDuration.seconds > 0 ? frameDuration : CMTime(value: 1, timescale: 30), still: nil)
  }

  private func backgroundSource(_ background: BackgroundSpec, recording: AVAsset, job: ExportJob) async throws -> Source {
    let still = background.isImage ? CIImage(contentsOf: background.url, options: [.applyOrientationProperty: true]) : nil
    if background.isImage && still == nil { throw CocoaError(.fileReadCorruptFile) }
    let backgroundAsset = AVURLAsset(url: background.isImage ? try await stillPlaceholder() : background.url)
    let backgroundTrack = try await backgroundAsset.loadTracks(withMediaType: .video)[0]
    let (naturalSize, transform, loop) = try await backgroundTrack.load(.naturalSize, .preferredTransform, .timeRange)
    let composition = AVMutableComposition()
    guard let video = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else { throw CocoaError(.featureUnsupported) }
    video.preferredTransform = transform
    let length = CMTime(seconds: job.length, preferredTimescale: 600)
    var at = CMTime.zero
    while at < length {
      let piece = CMTimeMinimum(loop.duration, length - at)
      try video.insertTimeRange(CMTimeRange(start: loop.start, duration: piece), of: backgroundTrack, at: at)
      at = at + piece
    }
    var audioTracks: [AVAssetTrack] = []
    if let recorded = try await recording.loadTracks(withMediaType: .audio).first,
       let audio = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) {
      try audio.insertTimeRange(job.range, of: recorded, at: .zero)
      audioTracks = [audio]
    }
    let upright = CGRect(origin: .zero, size: naturalSize).applying(transform)
    return Source(asset: composition, videoTrack: video, audioTracks: audioTracks,
                  size: still?.extent.size ?? CGSize(width: abs(upright.width), height: abs(upright.height)),
                  frameDuration: CMTime(value: 1, timescale: 30), still: still)
  }

  private func stillPlaceholder() async throws -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("cuts-still-placeholder.mp4")
    if FileManager.default.fileExists(atPath: url.path) { return url }
    let partial = FileManager.default.temporaryDirectory.appendingPathComponent("cuts-still-\(UUID().uuidString).mp4")
    let writer = try AVAssetWriter(outputURL: partial, fileType: .mp4)
    let input = AVAssetWriterInput(mediaType: .video, outputSettings: [AVVideoCodecKey: AVVideoCodecType.h264, AVVideoWidthKey: 16, AVVideoHeightKey: 16])
    let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: [
      kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA, kCVPixelBufferWidthKey as String: 16, kCVPixelBufferHeightKey as String: 16
    ])
    writer.add(input)
    guard writer.startWriting() else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
    writer.startSession(atSourceTime: .zero)
    for frame in 0..<30 {
      while !input.isReadyForMoreMediaData { try await Task.sleep(for: .milliseconds(5)) }
      var buffer: CVPixelBuffer?
      guard let pool = adaptor.pixelBufferPool, CVPixelBufferPoolCreatePixelBuffer(nil, pool, &buffer) == kCVReturnSuccess, let buffer else {
        throw CocoaError(.fileWriteUnknown)
      }
      adaptor.append(buffer, withPresentationTime: CMTime(value: CMTimeValue(frame), timescale: 30))
    }
    input.markAsFinished()
    writer.endSession(atSourceTime: CMTime(value: 1, timescale: 1))
    await writer.finishWriting()
    guard writer.status == .completed else { throw writer.error ?? CocoaError(.fileWriteUnknown) }
    try? FileManager.default.moveItem(at: partial, to: url)
    return url
  }

  private func audioMix(tracks: [AVAssetTrack], job: ExportJob) -> AVAudioMix? {
    guard job.audioFade != "none" else { return nil }
    let length = fadeLength(job.fadeSeconds, clipLength: job.length)
    let steps = 20
    let mix = AVMutableAudioMix()
    mix.inputParameters = tracks.map { track in
      let parameters = AVMutableAudioMixInputParameters(track: track)
      let gain = { (at: Double) in audioGain(curve: job.audioFade, fadeSeconds: job.fadeSeconds, clipLength: job.length, at: at) }
      for step in 0..<steps {
        for from in [Double(step) / Double(steps) * length, job.length - Double(step + 1) / Double(steps) * length] {
          let to = from + length / Double(steps)
          parameters.setVolumeRamp(
            fromStartVolume: gain(from), toEndVolume: gain(to),
            timeRange: CMTimeRange(start: CMTime(seconds: job.start + from, preferredTimescale: 44100),
                                   end: CMTime(seconds: job.start + to, preferredTimescale: 44100)))
        }
      }
      return parameters
    }
    return mix
  }
}

private struct Source: @unchecked Sendable {
  let asset: AVAsset
  let videoTrack: AVAssetTrack
  let audioTracks: [AVAssetTrack]
  let size: CGSize
  let frameDuration: CMTime
  let still: CIImage?
}

private extension ExportJob {
  var range: CMTimeRange {
    CMTimeRange(start: CMTime(seconds: start, preferredTimescale: 600), end: CMTime(seconds: end, preferredTimescale: 600))
  }

  var startingAtZero: ExportJob {
    var shifted = self
    shifted.start = 0
    shifted.end = length
    return shifted
  }
}

private final class Pump: @unchecked Sendable {
  let output: AVAssetReaderOutput
  let input: AVAssetWriterInput
  private let queue = DispatchQueue(label: "cuts.export.pump")
  private var continuation: CheckedContinuation<Bool, Never>?

  init(output: AVAssetReaderOutput, input: AVAssetWriterInput) {
    self.output = output
    self.input = input
  }

  func run(onTime: @escaping @Sendable (CMTime) -> Void) async -> Bool {
    await withCheckedContinuation { continuation in
      queue.async {
        self.continuation = continuation
        self.input.requestMediaDataWhenReady(on: self.queue) {
          while self.continuation != nil && self.input.isReadyForMoreMediaData {
            guard let buffer = self.output.copyNextSampleBuffer() else {
              self.input.markAsFinished()
              self.finish(true)
              return
            }
            onTime(CMSampleBufferGetPresentationTimeStamp(buffer))
            if !self.input.append(buffer) { self.finish(false) }
          }
        }
      }
    }
  }

  func stop() {
    queue.async { self.finish(false) }
  }

  private func finish(_ complete: Bool) {
    continuation?.resume(returning: complete)
    continuation = nil
  }
}
