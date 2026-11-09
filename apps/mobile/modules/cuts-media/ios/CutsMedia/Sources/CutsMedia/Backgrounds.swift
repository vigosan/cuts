import AVFoundation
import ImageIO

public struct StoredBackground: Codable, Sendable {
  public let path: String
  public let kind: String
  public let name: String
  public let width: Double
  public let height: Double
}

public enum BackgroundError: Error {
  case invalid
  case tooBig
}

public let backgroundMaxBytes = 500 * 1024 * 1024

private let videoExtensions = ["mov", "mp4", "m4v"]
private let imageExtensions = ["png", "jpg", "jpeg"]

public func fileSize(_ url: URL) throws -> Int {
  try url.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
}

public func storeBackground(from source: URL, in dir: URL, now: Int, size: (URL) throws -> Int = fileSize) async throws -> StoredBackground {
  let ext = source.pathExtension.lowercased()
  guard videoExtensions.contains(ext) || imageExtensions.contains(ext) else { throw BackgroundError.invalid }
  guard try size(source) <= backgroundMaxBytes else { throw BackgroundError.tooBig }
  let pixels = imageExtensions.contains(ext) ? try imageSize(source) : try await videoSize(source)
  let manager = FileManager.default
  try manager.createDirectory(at: dir, withIntermediateDirectories: true)
  let older = (try? manager.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil)) ?? []
  let file = dir.appendingPathComponent("background-\(now).\(ext)")
  try manager.copyItem(at: source, to: file)
  older.forEach { try? manager.removeItem(at: $0) }
  return StoredBackground(path: file.path, kind: imageExtensions.contains(ext) ? "image" : "video", name: source.lastPathComponent,
                          width: pixels.width, height: pixels.height)
}

private func imageSize(_ url: URL) throws -> CGSize {
  guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any],
        let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
        let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue,
        width > 0, height > 0
  else { throw BackgroundError.invalid }
  let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
  return (5...8).contains(orientation) ? CGSize(width: height, height: width) : CGSize(width: width, height: height)
}

private func videoSize(_ url: URL) async throws -> CGSize {
  let info = try? await mediaInfo(asset: AVURLAsset(url: url))
  guard let info, info.kind == .video, info.size.width > 0 else { throw BackgroundError.invalid }
  return info.size
}
