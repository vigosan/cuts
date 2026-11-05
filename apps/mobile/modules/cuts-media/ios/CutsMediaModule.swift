import AVFoundation
import ExpoModulesCore
import ImageIO
import Photos
import PhotosUI
import UniformTypeIdentifiers

struct JobRecord: Record {
  @Field var start: Double = 0
  @Field var end: Double = 0
  @Field var format: String = "original"
  @Field var framing: String = "crop"
  @Field var cropX: Double = 0.5
  @Field var cropY: Double = 0.5
  @Field var videoFade: String = "black"
  @Field var audioFade: String = "natural"
  @Field var fadeSeconds: Double = 1
  @Field var videoFadeIn: Bool = true
  @Field var fileName: String = "clip.mp4"
  @Field var overlayPath: String = ""
  @Field var overlayX: Double = 0
  @Field var overlayY: Double = 0
  @Field var overlayWidth: Double = 0.25
}

struct FrameRecord: Record {
  @Field var format: String = "original"
  @Field var framing: String = "crop"
  @Field var cropX: Double = 0.5
  @Field var cropY: Double = 0.5
  @Field var overlayPath: String = ""
  @Field var overlayX: Double = 0
  @Field var overlayY: Double = 0
  @Field var overlayWidth: Double = 0.25
}

private func overlaySpec(path: String, x: Double, y: Double, width: Double) -> OverlaySpec? {
  guard !path.isEmpty else { return nil }
  let url = path.hasPrefix("file://") ? URL(string: path)
    : path.contains("/") ? URL(fileURLWithPath: path) : CutsMediaModule.overlayDir.appendingPathComponent(path)
  return url.map { OverlaySpec(url: $0, x: x, y: y, width: width) }
}

public final class CutsMediaModule: Module, @unchecked Sendable {
  private let lock = NSLock()
  private var assets: [String: AVURLAsset] = [:]
  private var exporter: Exporter?
  private var picker: PickerDelegate?
  private var openRequests: [String: PHImageRequestID] = [:]
  private var cancelledFiles: Set<String> = []
  private var documentPicker: DocumentPickerDelegate?
  private var overlayPicker: OverlayPickerDelegate?
  private let files = FileBookmarks()
  private static let posterDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("posters")

  private func remember(_ id: String, _ asset: AVURLAsset) {
    lock.withLock { assets[id] = asset }
  }

  private func asset(_ id: String) async throws -> AVURLAsset {
    if let cached = lock.withLock({ assets[id] }) { return cached }
    let resolved = FileBookmarks.isFileId(id) ? AVURLAsset(url: try files.url(for: id)) : try await resolveAsset(id: id) { _ in }
    remember(id, resolved)
    return resolved
  }

  private static let exportDir = FileManager.default.temporaryDirectory.appendingPathComponent("exports")
  private static let thumbDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("thumbs")
  static let overlayDir = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0].appendingPathComponent("overlays", isDirectory: true)

  public func definition() -> ModuleDefinition {
    Name("CutsMedia")

    Events("onDownload", "onExportProgress")

    Constant("overlayDir") { Self.overlayDir.absoluteString }

    AsyncFunction("requestLibraryAccess") { () -> String in
      switch await requestLibraryAccess() {
      case .authorized: return "granted"
      case .limited: return "limited"
      default: return "denied"
      }
    }

    AsyncFunction("pickVideo") { (promise: Promise) in
      var configuration = PHPickerConfiguration(photoLibrary: .shared())
      configuration.filter = .videos
      configuration.selectionLimit = 1
      configuration.preferredAssetRepresentationMode = .current
      let controller = PHPickerViewController(configuration: configuration)
      let delegate = PickerDelegate { id in
        promise.resolve(id)
        self.picker = nil
      }
      self.picker = delegate
      controller.delegate = delegate
      self.appContext?.utilities?.currentViewController()?.present(controller, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("pickFile") { (promise: Promise) in
      let controller = UIDocumentPickerViewController(forOpeningContentTypes: [.movie, .video], asCopy: false)
      controller.allowsMultipleSelection = false
      let delegate = DocumentPickerDelegate { url in
        self.documentPicker = nil
        guard let url else { return promise.resolve(nil) }
        let accessing = url.startAccessingSecurityScopedResource()
        defer { if accessing { url.stopAccessingSecurityScopedResource() } }
        do { promise.resolve(try self.files.remember(url)) } catch { promise.reject(error) }
      }
      self.documentPicker = delegate
      controller.delegate = delegate
      self.appContext?.utilities?.currentViewController()?.present(controller, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("pickOverlay") { (source: String, promise: Promise) in
      let finish = { (data: Data?, name: String) in
        guard let data else { return promise.resolve("invalid") }
        do {
          guard let stored = try Self.storeOverlay(data, name: name) else { return promise.resolve("invalid") }
          promise.resolve(stored)
        } catch { promise.reject(error) }
      }
      let presenter = self.appContext?.utilities?.currentViewController()
      if source == "photos" {
        var configuration = PHPickerConfiguration()
        configuration.filter = .images
        configuration.selectionLimit = 1
        configuration.preferredAssetRepresentationMode = .current
        let controller = PHPickerViewController(configuration: configuration)
        let delegate = OverlayPickerDelegate { provider in
          self.overlayPicker = nil
          guard let provider else { return promise.resolve(nil) }
          let type = provider.hasItemConformingToTypeIdentifier(UTType.png.identifier) ? UTType.png : UTType.image
          let base = provider.suggestedName ?? "overlay"
          provider.loadDataRepresentation(forTypeIdentifier: type.identifier) { data, _ in
            finish(data, base.lowercased().hasSuffix(".png") ? base : base + ".png")
          }
        }
        self.overlayPicker = delegate
        controller.delegate = delegate
        presenter?.present(controller, animated: true)
        return
      }
      let controller = UIDocumentPickerViewController(forOpeningContentTypes: [.png], asCopy: true)
      controller.allowsMultipleSelection = false
      let delegate = DocumentPickerDelegate { url in
        self.documentPicker = nil
        guard let url else { return promise.resolve(nil) }
        finish(try? Data(contentsOf: url), url.lastPathComponent)
      }
      self.documentPicker = delegate
      controller.delegate = delegate
      presenter?.present(controller, animated: true)
    }.runOnQueue(.main)

    AsyncFunction("openAsset") { (id: String) -> [String: Any] in
      if FileBookmarks.isFileId(id) { return try await self.openFile(id) }
      let resolved = try await resolveAsset(id: id, onRequest: { request in
        self.lock.withLock { self.openRequests[id] = request }
      }) { ratio in
        self.sendEvent("onDownload", ["id": id, "ratio": ratio])
      }
      self.lock.withLock { self.openRequests[id] = nil }
      self.remember(id, resolved)
      let details = try info(id: id)
      let frameRate = try await resolved.loadTracks(withMediaType: .video).first?.load(.nominalFrameRate) ?? 30
      return ["id": id, "name": details.name, "duration": details.duration, "width": details.width, "height": details.height,
              "frameRate": Double(frameRate > 0 ? frameRate : 30), "uri": resolved.url.absoluteString]
    }

    Function("cancelOpen") { (id: String) in
      if FileBookmarks.isFileId(id) { self.lock.withLock { _ = self.cancelledFiles.insert(id) } }
      if let request = self.lock.withLock({ self.openRequests.removeValue(forKey: id) }) {
        PHImageManager.default().cancelImageRequest(request)
      }
    }

    AsyncFunction("poster") { (id: String, height: Int) -> String in
      let file = Self.posterDir.appendingPathComponent(id.replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: ":", with: "_") + "-\(height).jpg")
      if FileManager.default.fileExists(atPath: file.path) { return file.absoluteString }
      try FileManager.default.createDirectory(at: Self.posterDir, withIntermediateDirectories: true)
      let scale = 3.0
      let image = FileBookmarks.isFileId(id)
        ? try await self.filePoster(id, height: Int(Double(height) * scale))
        : try await poster(id: id, size: CGSize(width: Double(height) * 16 / 9 * scale, height: Double(height) * scale))
      guard let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.8) else { throw CocoaError(.fileWriteUnknown) }
      try data.write(to: file, options: .atomic)
      return file.absoluteString
    }

    AsyncFunction("readPeaks") { (id: String) -> [Float]? in
      try await readPeaks(asset: try await self.asset(id))
    }

    AsyncFunction("thumbnail") { (id: String, time: Double, height: Int) -> String in
      let name = "\(abs(id.hashValue))-\(Int(time * 10))-\(height).jpg"
      let file = Self.thumbDir.appendingPathComponent(name)
      if FileManager.default.fileExists(atPath: file.path) { return file.absoluteString }
      try FileManager.default.createDirectory(at: Self.thumbDir, withIntermediateDirectories: true)
      let image = try await thumbnail(asset: try await self.asset(id), at: time, height: height)
      guard let data = UIImage(cgImage: image).jpegData(compressionQuality: 0.7) else { throw CocoaError(.fileWriteUnknown) }
      try data.write(to: file)
      return file.absoluteString
    }

    AsyncFunction("exportClip") { (id: String, record: JobRecord) -> String in
      try FileManager.default.createDirectory(at: Self.exportDir, withIntermediateDirectories: true)
      let output = Self.exportDir.appendingPathComponent(record.fileName)
      let job = ExportJob(start: record.start, end: record.end, format: record.format, framing: record.framing, cropX: record.cropX,
                          cropY: record.cropY, videoFade: record.videoFade, audioFade: record.audioFade, fadeSeconds: record.fadeSeconds,
                          videoFadeIn: record.videoFadeIn, output: output,
                          overlay: overlaySpec(path: record.overlayPath, x: record.overlayX, y: record.overlayY, width: record.overlayWidth))
      let exporter = Exporter()
      self.lock.withLock { self.exporter = exporter }
      defer { self.lock.withLock { self.exporter = nil } }
      try await exporter.export(asset: try await self.asset(id), job: job) { ratio in
        self.sendEvent("onExportProgress", ["ratio": ratio])
      }
      return output.absoluteString
    }

    Function("cancelExport") {
      self.lock.withLock { self.exporter }?.cancel()
    }

    AsyncFunction("saveToCutsAlbum") { (uris: [String]) in
      let files = uris.compactMap { URL(string: $0) }
      try await saveToAlbum(files: files, album: "Cuts")
      files.forEach { try? FileManager.default.removeItem(at: $0) }
    }

    AsyncFunction("saveFrame") { (id: String, time: Double, record: FrameRecord) in
      let job = FrameJob(format: record.format, framing: record.framing, cropX: record.cropX, cropY: record.cropY,
                         overlay: overlaySpec(path: record.overlayPath, x: record.overlayX, y: record.overlayY, width: record.overlayWidth))
      let data = try await frame(asset: try await self.asset(id), at: time, job: job)
      try await saveImageToAlbum(data: data, album: "Cuts")
    }
  }
}

extension CutsMediaModule {
  fileprivate static func storeOverlay(_ data: Data, name: String) throws -> [String: Any]? {
    guard let image = CGImageSourceCreateWithData(data as CFData, nil),
          CGImageSourceGetType(image) as String? == UTType.png.identifier,
          let properties = CGImageSourceCopyPropertiesAtIndex(image, 0, nil) as? [CFString: Any],
          let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue,
          let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue,
          width > 0, height > 0
    else { return nil }
    let manager = FileManager.default
    try manager.createDirectory(at: overlayDir, withIntermediateDirectories: true)
    let older = (try? manager.contentsOfDirectory(at: overlayDir, includingPropertiesForKeys: nil)) ?? []
    let file = overlayDir.appendingPathComponent("overlay-\(Int(Date().timeIntervalSince1970 * 1000)).png")
    try data.write(to: file, options: .atomic)
    older.forEach { try? manager.removeItem(at: $0) }
    return ["path": file.lastPathComponent, "aspect": height / width, "name": name]
  }

  fileprivate func openFile(_ id: String) async throws -> [String: Any] {
    lock.withLock { _ = cancelledFiles.remove(id) }
    let url = try files.url(for: id)
    try await ensureDownloaded(url, cancelled: { self.lock.withLock { self.cancelledFiles.contains(id) } }) { ratio in
      self.sendEvent("onDownload", ["id": id, "ratio": ratio])
    }
    let asset = AVURLAsset(url: url)
    remember(id, asset)
    let duration = try await asset.load(.duration).seconds
    guard let track = try await asset.loadTracks(withMediaType: .video).first else { throw LibraryError.notAVideo }
    let (size, transform, rate) = try await track.load(.naturalSize, .preferredTransform, .nominalFrameRate)
    let upright = CGRect(origin: .zero, size: size).applying(transform)
    return ["id": id, "name": url.lastPathComponent, "duration": duration, "width": Int(abs(upright.width)), "height": Int(abs(upright.height)),
            "frameRate": Double(rate > 0 ? rate : 30), "uri": url.absoluteString]
  }

  fileprivate func filePoster(_ id: String, height: Int) async throws -> CGImage {
    let url = try files.url(for: id)
    let status = try url.resourceValues(forKeys: [.isUbiquitousItemKey, .ubiquitousItemDownloadingStatusKey])
    if status.isUbiquitousItem == true && status.ubiquitousItemDownloadingStatus != .current { throw LibraryError.missing }
    return try await thumbnail(asset: AVURLAsset(url: url), at: 10, height: height)
  }
}

final class DocumentPickerDelegate: NSObject, UIDocumentPickerDelegate {
  private let done: (URL?) -> Void

  init(done: @escaping (URL?) -> Void) {
    self.done = done
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    done(urls.first)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    done(nil)
  }
}

final class OverlayPickerDelegate: NSObject, PHPickerViewControllerDelegate {
  private let done: (NSItemProvider?) -> Void

  init(done: @escaping (NSItemProvider?) -> Void) {
    self.done = done
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    done(results.first?.itemProvider)
  }
}

final class PickerDelegate: NSObject, PHPickerViewControllerDelegate {
  private let done: (String?) -> Void

  init(done: @escaping (String?) -> Void) {
    self.done = done
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    done(results.first?.assetIdentifier)
  }
}
