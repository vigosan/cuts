import AVFoundation
import ExpoModulesCore
import Photos
import PhotosUI

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
}

struct FrameRecord: Record {
  @Field var format: String = "original"
  @Field var framing: String = "crop"
  @Field var cropX: Double = 0.5
  @Field var cropY: Double = 0.5
}

public final class CutsMediaModule: Module, @unchecked Sendable {
  private let lock = NSLock()
  private var assets: [String: AVURLAsset] = [:]
  private var exporter: Exporter?
  private var picker: PickerDelegate?
  private var openRequests: [String: PHImageRequestID] = [:]
  private static let posterDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("posters")

  private func remember(_ id: String, _ asset: AVURLAsset) {
    lock.withLock { assets[id] = asset }
  }

  private func asset(_ id: String) async throws -> AVURLAsset {
    if let cached = lock.withLock({ assets[id] }) { return cached }
    let resolved = try await resolveAsset(id: id) { _ in }
    remember(id, resolved)
    return resolved
  }

  private static let exportDir = FileManager.default.temporaryDirectory.appendingPathComponent("exports")
  private static let thumbDir = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("thumbs")

  public func definition() -> ModuleDefinition {
    Name("CutsMedia")

    Events("onDownload", "onExportProgress")

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

    AsyncFunction("openAsset") { (id: String) -> [String: Any] in
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
      if let request = self.lock.withLock({ self.openRequests.removeValue(forKey: id) }) {
        PHImageManager.default().cancelImageRequest(request)
      }
    }

    AsyncFunction("poster") { (id: String, height: Int) -> String in
      let file = Self.posterDir.appendingPathComponent(id.replacingOccurrences(of: "/", with: "_") + "-\(height).jpg")
      if FileManager.default.fileExists(atPath: file.path) { return file.absoluteString }
      try FileManager.default.createDirectory(at: Self.posterDir, withIntermediateDirectories: true)
      let scale = 3.0
      let image = try await poster(id: id, size: CGSize(width: Double(height) * 16 / 9 * scale, height: Double(height) * scale))
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
                          videoFadeIn: record.videoFadeIn, output: output)
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
      let job = FrameJob(format: record.format, framing: record.framing, cropX: record.cropX, cropY: record.cropY)
      let data = try await frame(asset: try await self.asset(id), at: time, job: job)
      try await saveImageToAlbum(data: data, album: "Cuts")
    }
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
