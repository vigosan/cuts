import AVFoundation
import CoreImage
import Foundation

public final class Exporter: @unchecked Sendable {
  private let lock = NSLock()
  private var cancelled = false

  public init() {}

  public func cancel() {
    lock.withLock { cancelled = true }
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

  private func run(asset: AVAsset, job: ExportJob, progress: @escaping @Sendable (Double) -> Void) async throws {
    let videoTrack = try await asset.loadTracks(withMediaType: .video)[0]
    let audioTracks = try await asset.loadTracks(withMediaType: .audio)
    let (naturalSize, transform, frameDuration) = try await videoTrack.load(.naturalSize, .preferredTransform, .minFrameDuration)
    let upright = CGRect(origin: .zero, size: naturalSize).applying(transform)
    let framer = Framer(job: job, sourceSize: CGSize(width: abs(upright.width), height: abs(upright.height)))
    let range = CMTimeRange(start: CMTime(seconds: job.start, preferredTimescale: 600), end: CMTime(seconds: job.end, preferredTimescale: 600))

    let composition = try await AVMutableVideoComposition.videoComposition(with: asset) { request in
      let seconds = request.compositionTime.seconds - job.start
      let image = framer.fade(image: framer.render(image: request.sourceImage), at: seconds, clipLength: job.length)
      request.finish(with: image, context: nil)
    }
    composition.renderSize = framer.renderSize
    composition.frameDuration = frameDuration.isValid && frameDuration.seconds > 0 ? frameDuration : CMTime(value: 1, timescale: 30)
    composition.colorPrimaries = AVVideoColorPrimaries_ITU_R_709_2
    composition.colorTransferFunction = AVVideoTransferFunction_ITU_R_709_2
    composition.colorYCbCrMatrix = AVVideoYCbCrMatrix_ITU_R_709_2

    let reader = try AVAssetReader(asset: asset)
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
        AVVideoAverageBitRateKey: 12_000_000,
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
    let stopped = await withTaskGroup(of: Bool.self) { group in
      for (index, pump) in pumps.enumerated() {
        group.addTask {
          await pump.run(isCancelled: { self.isCancelled }) { time in
            if index == 0 { progress(max(0, min(1, (time.seconds - job.start) / job.length))) }
          }
        }
      }
      return await group.reduce(false) { $0 || $1 }
    }

    if stopped || isCancelled {
      reader.cancelReading()
      writer.cancelWriting()
      throw CancellationError()
    }
    if reader.status == .failed { throw reader.error ?? CocoaError(.fileReadUnknown) }
    writer.endSession(atSourceTime: range.end)
    await writer.finishWriting()
    if writer.status != .completed { throw writer.error ?? CocoaError(.fileWriteUnknown) }
    progress(1)
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

private final class Pump: @unchecked Sendable {
  let output: AVAssetReaderOutput
  let input: AVAssetWriterInput
  private let queue = DispatchQueue(label: "cuts.export.pump")
  private var done = false

  init(output: AVAssetReaderOutput, input: AVAssetWriterInput) {
    self.output = output
    self.input = input
  }

  func run(isCancelled: @escaping @Sendable () -> Bool, onTime: @escaping @Sendable (CMTime) -> Void) async -> Bool {
    await withCheckedContinuation { continuation in
      input.requestMediaDataWhenReady(on: queue) {
        while self.input.isReadyForMoreMediaData && !self.done {
          if isCancelled() {
            self.done = true
            self.input.markAsFinished()
            continuation.resume(returning: true)
            return
          }
          guard let buffer = self.output.copyNextSampleBuffer() else {
            self.done = true
            self.input.markAsFinished()
            continuation.resume(returning: false)
            return
          }
          onTime(CMSampleBufferGetPresentationTimeStamp(buffer))
          if !self.input.append(buffer) {
            self.done = true
            continuation.resume(returning: true)
            return
          }
        }
      }
    }
  }
}
