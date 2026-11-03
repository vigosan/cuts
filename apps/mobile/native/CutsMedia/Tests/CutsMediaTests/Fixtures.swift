import AVFoundation
import Foundation

enum Fixtures {
  static let dir = URL(fileURLWithPath: #filePath)
    .deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    .deletingLastPathComponent().deletingLastPathComponent().appendingPathComponent("fixtures")

  static func asset(_ name: String) -> AVURLAsset {
    AVURLAsset(url: dir.appendingPathComponent(name))
  }
}
