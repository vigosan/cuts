import AVFoundation
import Photos

public struct AssetInfo: Sendable {
  public let id: String
  public let name: String
  public let duration: Double
  public let width: Int
  public let height: Int
}

public enum LibraryError: Error {
  case missing
  case notAVideo
}

public func requestLibraryAccess() async -> PHAuthorizationStatus {
  await PHPhotoLibrary.requestAuthorization(for: .readWrite)
}

public func info(id: String) throws -> AssetInfo {
  guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { throw LibraryError.missing }
  let name = PHAssetResource.assetResources(for: asset).first?.originalFilename ?? id
  return AssetInfo(id: id, name: name, duration: asset.duration, width: asset.pixelWidth, height: asset.pixelHeight)
}

public func resolveAsset(id: String, progress: @escaping @Sendable (Double) -> Void) async throws -> AVURLAsset {
  guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [id], options: nil).firstObject else { throw LibraryError.missing }
  let options = PHVideoRequestOptions()
  options.isNetworkAccessAllowed = true
  options.deliveryMode = .highQualityFormat
  options.version = .current
  options.progressHandler = { value, _, _, _ in progress(value) }
  let box: UnsafeSendable<AVAsset?> = await withCheckedContinuation { continuation in
    PHImageManager.default().requestAVAsset(forVideo: asset, options: options) { avAsset, _, _ in
      continuation.resume(returning: UnsafeSendable(value: avAsset))
    }
  }
  guard let urlAsset = box.value as? AVURLAsset else { throw LibraryError.notAVideo }
  return urlAsset
}

public func saveToAlbum(files: [URL], album: String) async throws {
  let now = Date()
  try await PHPhotoLibrary.shared().performChanges {
    let collection = albumChangeRequest(named: album)
    let placeholders = files.enumerated().compactMap { index, file in
      let request = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: file)
      request?.creationDate = now.addingTimeInterval(-Double(index))
      return request?.placeholderForCreatedAsset
    }
    collection.addAssets(placeholders as NSArray)
  }
}

public func saveImageToAlbum(data: Data, album: String) async throws {
  try await PHPhotoLibrary.shared().performChanges {
    let collection = albumChangeRequest(named: album)
    let request = PHAssetCreationRequest.forAsset()
    request.addResource(with: .photo, data: data, options: nil)
    if let placeholder = request.placeholderForCreatedAsset { collection.addAssets([placeholder] as NSArray) }
  }
}

private func albumChangeRequest(named name: String) -> PHAssetCollectionChangeRequest {
  let options = PHFetchOptions()
  options.predicate = NSPredicate(format: "title = %@", name)
  if let existing = PHAssetCollection.fetchAssetCollections(with: .album, subtype: .any, options: options).firstObject,
     let request = PHAssetCollectionChangeRequest(for: existing) {
    return request
  }
  return PHAssetCollectionChangeRequest.creationRequestForAssetCollection(withTitle: name)
}

struct UnsafeSendable<Value>: @unchecked Sendable {
  let value: Value
}
