import CutsMedia
import Foundation
import Testing

@Suite struct FilesTests {
  private func store() -> FileBookmarks {
    FileBookmarks(defaults: UserDefaults(suiteName: "cuts-tests-\(UUID().uuidString)")!)
  }

  @Test func aPickedFileGetsAnIdThatReopensTheSameFileLater() throws {
    let bookmarks = store()
    let url = Fixtures.dir.appendingPathComponent("set.mp4")
    let id = try bookmarks.remember(url)
    #expect(FileBookmarks.isFileId(id))
    #expect(!FileBookmarks.isFileId("742F5562-A1F3-49A1-A0C1-12BBC7206749/L0/001"))
    #expect(try bookmarks.url(for: id).standardizedFileURL.path == url.standardizedFileURL.path)
  }

  @Test func theSameFileKeepsTheSameIdSoRecentsDoNotDuplicate() throws {
    let bookmarks = store()
    let url = Fixtures.dir.appendingPathComponent("set.mp4")
    #expect(try bookmarks.remember(url) == bookmarks.remember(url))
  }

  @Test func anUnknownIdSaysTheFileIsGone() {
    #expect(throws: LibraryError.self) { try store().url(for: "file:nothing") }
  }

  @Test func aLocalFileNeedsNoDownload() async throws {
    var seen: [Double] = []
    try await ensureDownloaded(Fixtures.dir.appendingPathComponent("set.mp4"), cancelled: { false }) { seen.append($0) }
    #expect(seen.isEmpty)
  }
}
