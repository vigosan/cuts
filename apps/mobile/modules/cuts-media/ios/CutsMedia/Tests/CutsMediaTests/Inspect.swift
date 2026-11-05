import AVFoundation
import CoreImage
import Foundation

enum Inspect {
  static func output(_ name: String) -> URL {
    let url = FileManager.default.temporaryDirectory.appendingPathComponent("cuts-tests").appendingPathComponent(name)
    try? FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    try? FileManager.default.removeItem(at: url)
    return url
  }

  static func uprightSize(_ asset: AVAsset) async throws -> CGSize {
    let track = try await asset.loadTracks(withMediaType: .video)[0]
    let (size, transform) = try await track.load(.naturalSize, .preferredTransform)
    let rect = CGRect(origin: .zero, size: size).applying(transform)
    return CGSize(width: abs(rect.width), height: abs(rect.height))
  }

  static func luma(_ asset: AVAsset, at seconds: Double) async throws -> Double {
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    let (image, _) = try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600))
    let context = CIContext()
    let average = CIImage(cgImage: image).applyingFilter("CIAreaAverage", parameters: [kCIInputExtentKey: CIVector(cgRect: CGRect(x: 0, y: 0, width: image.width, height: image.height))])
    var pixel = [UInt8](repeating: 0, count: 4)
    context.render(average, toBitmap: &pixel, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1), format: .RGBA8, colorSpace: nil)
    return (0.2126 * Double(pixel[0]) + 0.7152 * Double(pixel[1]) + 0.0722 * Double(pixel[2])) / 255
  }

  static func frameImage(_ asset: AVAsset, at seconds: Double) async throws -> CGImage {
    let generator = AVAssetImageGenerator(asset: asset)
    generator.appliesPreferredTrackTransform = true
    generator.requestedTimeToleranceBefore = .zero
    generator.requestedTimeToleranceAfter = .zero
    return try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
  }

  static func pixel(_ image: CGImage, x: Int, y: Int) -> (UInt8, UInt8, UInt8) {
    var bytes = [UInt8](repeating: 0, count: image.width * image.height * 4)
    let context = CGContext(data: &bytes, width: image.width, height: image.height, bitsPerComponent: 8, bytesPerRow: image.width * 4,
                            space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
    context?.draw(image, in: CGRect(x: 0, y: 0, width: image.width, height: image.height))
    let offset = (y * image.width + x) * 4
    return (bytes[offset], bytes[offset + 1], bytes[offset + 2])
  }

  static func isRed(_ pixel: (UInt8, UInt8, UInt8)) -> Bool {
    pixel.0 > 200 && pixel.1 < 60 && pixel.2 < 60
  }

  static func rms(_ asset: AVAsset, from: Double, length: Double) async throws -> Double {
    let tracks = try await asset.loadTracks(withMediaType: .audio)
    let reader = try AVAssetReader(asset: asset)
    reader.timeRange = CMTimeRange(start: CMTime(seconds: from, preferredTimescale: 44100), duration: CMTime(seconds: length, preferredTimescale: 44100))
    let output = AVAssetReaderAudioMixOutput(audioTracks: tracks, audioSettings: [
      AVFormatIDKey: kAudioFormatLinearPCM, AVSampleRateKey: 44100, AVNumberOfChannelsKey: 1,
      AVLinearPCMBitDepthKey: 32, AVLinearPCMIsFloatKey: true, AVLinearPCMIsBigEndianKey: false, AVLinearPCMIsNonInterleaved: false
    ])
    reader.add(output)
    reader.startReading()
    var sum = 0.0
    var count = 0
    while let buffer = output.copyNextSampleBuffer(), let block = CMSampleBufferGetDataBuffer(buffer) {
      let n = CMBlockBufferGetDataLength(block) / 4
      var samples = [Float](repeating: 0, count: n)
      samples.withUnsafeMutableBytes { _ = CMBlockBufferCopyDataBytes(block, atOffset: 0, dataLength: n * 4, destination: $0.baseAddress!) }
      sum += samples.reduce(0) { $0 + Double($1 * $1) }
      count += n
    }
    return (sum / Double(max(1, count))).squareRoot()
  }

  static func videoFormat(_ asset: AVAsset) async throws -> CMFormatDescription {
    let track = try await asset.loadTracks(withMediaType: .video)[0]
    return try await track.load(.formatDescriptions)[0]
  }
}
