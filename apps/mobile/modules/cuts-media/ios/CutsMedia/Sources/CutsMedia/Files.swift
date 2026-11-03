import CryptoKit
import Foundation

public final class FileBookmarks: @unchecked Sendable {
  private static let key = "cuts.fileBookmarks"
  private static let prefix = "file:"
  private let defaults: UserDefaults
  private let lock = NSLock()

  public init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  public static func isFileId(_ id: String) -> Bool { id.hasPrefix(prefix) }

  public func remember(_ url: URL) throws -> String {
    let path = url.standardizedFileURL.path
    let digest = SHA256.hash(data: Data(path.utf8)).prefix(12).map { String(format: "%02x", $0) }.joined()
    let id = Self.prefix + digest
    let bookmark = try url.bookmarkData(options: [], includingResourceValuesForKeys: nil, relativeTo: nil)
    lock.withLock {
      var all = defaults.dictionary(forKey: Self.key) as? [String: Data] ?? [:]
      all[id] = bookmark
      defaults.set(all, forKey: Self.key)
    }
    return id
  }

  public func url(for id: String) throws -> URL {
    let stored = lock.withLock { (defaults.dictionary(forKey: Self.key) as? [String: Data])?[id] }
    guard let stored else { throw LibraryError.missing }
    var stale = false
    let url = try URL(resolvingBookmarkData: stored, options: [], relativeTo: nil, bookmarkDataIsStale: &stale)
    _ = url.startAccessingSecurityScopedResource()
    if stale { _ = try? remember(url) }
    return url
  }
}

public func ensureDownloaded(_ url: URL, cancelled: @escaping () -> Bool, progress: (Double) -> Void) async throws {
  let keys: Set<URLResourceKey> = [.isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey]
  let values = try url.resourceValues(forKeys: keys)
  guard values.isUbiquitousItem == true, values.ubiquitousItemDownloadingStatus != .current else { return }
  try FileManager.default.startDownloadingUbiquitousItem(at: url)
  while true {
    if cancelled() { throw CancellationError() }
    try await Task.sleep(for: .milliseconds(300))
    var fresh = url
    fresh.removeAllCachedResourceValues()
    let now = try fresh.resourceValues(forKeys: keys.union([.fileSizeKey, .fileAllocatedSizeKey]))
    if now.ubiquitousItemDownloadingStatus == .current {
      progress(1)
      return
    }
    if let size = now.fileSize, size > 0, let have = now.fileAllocatedSize { progress(min(0.99, Double(have) / Double(size))) }
  }
}
