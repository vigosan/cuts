import AVFoundation
import CoreImage
import ImageIO
import UniformTypeIdentifiers

public struct FrameJob: Codable, Sendable {
  public var format: String
  public var framing: String
  public var cropX: Double
  public var cropY: Double

  public init(format: String, framing: String, cropX: Double, cropY: Double) {
    self.format = format
    self.framing = framing
    self.cropX = cropX
    self.cropY = cropY
  }
}

public func thumbnail(asset: AVAsset, at seconds: Double, height: Int) async throws -> CGImage {
  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.maximumSize = CGSize(width: 0, height: height)
  let tolerance = CMTime(seconds: 0.5, preferredTimescale: 600)
  generator.requestedTimeToleranceBefore = tolerance
  generator.requestedTimeToleranceAfter = tolerance
  return try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image
}

public func frame(asset: AVAsset, at seconds: Double, job: FrameJob) async throws -> Data {
  let generator = AVAssetImageGenerator(asset: asset)
  generator.appliesPreferredTrackTransform = true
  generator.requestedTimeToleranceBefore = .zero
  generator.requestedTimeToleranceAfter = .zero
  let image = CIImage(cgImage: try await generator.image(at: CMTime(seconds: seconds, preferredTimescale: 600)).image)
  let exportJob = ExportJob(start: 0, end: 1, format: job.format, framing: job.framing, cropX: job.cropX, cropY: job.cropY,
                            videoFade: "none", audioFade: "none", fadeSeconds: 1, videoFadeIn: true, output: URL(fileURLWithPath: "/dev/null"))
  let framed = Framer(job: exportJob, sourceSize: image.extent.size).render(image: image)
  let context = CIContext()
  guard let cgImage = context.createCGImage(framed, from: framed.extent) else { throw CocoaError(.fileWriteUnknown) }
  let data = NSMutableData()
  guard let destination = CGImageDestinationCreateWithData(data, UTType.jpeg.identifier as CFString, 1, nil) else { throw CocoaError(.fileWriteUnknown) }
  CGImageDestinationAddImage(destination, cgImage, [kCGImageDestinationLossyCompressionQuality: 0.95] as CFDictionary)
  guard CGImageDestinationFinalize(destination) else { throw CocoaError(.fileWriteUnknown) }
  return data as Data
}
