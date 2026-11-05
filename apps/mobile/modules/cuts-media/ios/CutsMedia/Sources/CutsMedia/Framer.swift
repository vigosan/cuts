import CoreImage
import Foundation

public struct Framer: Sendable {
  public let job: ExportJob
  public let sourceSize: CGSize
  public let renderSize: CGSize
  private let overlayImage: CIImage?

  public init(job: ExportJob, sourceSize: CGSize) {
    self.job = job
    self.sourceSize = sourceSize
    let even = { (value: CGFloat) in CGFloat(Int(value.rounded()) / 2 * 2) }
    renderSize = formatSizes[job.format] ?? CGSize(width: even(sourceSize.width), height: even(sourceSize.height))
    overlayImage = job.overlay.flatMap { CIImage(contentsOf: $0.url) }
  }

  public func render(image: CIImage) -> CIImage {
    let source = image.transformed(by: CGAffineTransform(translationX: -image.extent.minX, y: -image.extent.minY))
    guard formatSizes[job.format] != nil else { return source.cropped(to: CGRect(origin: .zero, size: renderSize)) }
    return job.framing == "fit" ? fit(source) : crop(source)
  }

  public func overlay(image: CIImage) -> CIImage {
    guard let spec = job.overlay, let overlayImage else { return image }
    let scale = spec.width * renderSize.width / overlayImage.extent.width
    let height = overlayImage.extent.height * scale
    let placed = overlayImage
      .transformed(by: CGAffineTransform(translationX: -overlayImage.extent.minX, y: -overlayImage.extent.minY))
      .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
      .transformed(by: CGAffineTransform(translationX: spec.x * renderSize.width, y: renderSize.height - spec.y * renderSize.height - height))
    return placed.composited(over: image).cropped(to: image.extent)
  }

  public func fade(image: CIImage, at seconds: Double, clipLength: Double) -> CIImage {
    guard job.videoFade != "none" else { return image }
    let length = fadeLength(job.fadeSeconds, clipLength: clipLength)
    let fadingIn = job.videoFadeIn ? seconds / length : 1
    let visible = max(0, min(1, fadingIn, (clipLength - seconds) / length))
    guard visible < 1 else { return image }
    let shade: CGFloat = job.videoFade == "white" ? 1 : 0
    let color = CIImage(color: CIColor(red: shade, green: shade, blue: shade, alpha: 1 - visible)).cropped(to: image.extent)
    return color.composited(over: image)
  }

  private func crop(_ image: CIImage) -> CIImage {
    let (w, h) = (renderSize.width, renderSize.height)
    let (iw, ih) = (image.extent.width, image.extent.height)
    let ow = min(iw, ih * w / h)
    let oh = min(ih, iw * h / w)
    let x = (iw - ow) * job.cropX
    let y = (ih - oh) * (1 - job.cropY)
    return image
      .cropped(to: CGRect(x: x, y: y, width: ow, height: oh))
      .transformed(by: CGAffineTransform(translationX: -x, y: -y).concatenating(CGAffineTransform(scaleX: w / ow, y: h / oh)))
  }

  private func fit(_ image: CIImage) -> CIImage {
    let (w, h) = (renderSize.width, renderSize.height)
    let (iw, ih) = (image.extent.width, image.extent.height)
    let (bw, bh) = (CGFloat(Int(w / 8) * 2), CGFloat(Int(h / 8) * 2))
    let fill = max(bw / iw, bh / ih)
    let small = image.transformed(by: CGAffineTransform(scaleX: fill, y: fill))
    let offset = CGPoint(x: (small.extent.width - bw) / 2, y: (small.extent.height - bh) / 2)
    let background = small
      .cropped(to: CGRect(origin: offset, size: CGSize(width: bw, height: bh)))
      .transformed(by: CGAffineTransform(translationX: -offset.x, y: -offset.y))
      .clampedToExtent()
      .applyingFilter("CIGaussianBlur", parameters: [kCIInputRadiusKey: 10])
      .applyingFilter("CIColorMatrix", parameters: [
        "inputRVector": CIVector(x: 0.7, y: 0, z: 0, w: 0),
        "inputGVector": CIVector(x: 0, y: 0.7, z: 0, w: 0),
        "inputBVector": CIVector(x: 0, y: 0, z: 0.7, w: 0)
      ])
      .cropped(to: CGRect(x: 0, y: 0, width: bw, height: bh))
      .transformed(by: CGAffineTransform(scaleX: w / bw, y: h / bh))
    let scale = min(w / iw, h / ih)
    let front = image.transformed(by: CGAffineTransform(scaleX: scale, y: scale))
    let centered = front.transformed(by: CGAffineTransform(translationX: (w - front.extent.width) / 2, y: (h - front.extent.height) / 2))
    return centered.composited(over: background).cropped(to: CGRect(origin: .zero, size: renderSize))
  }
}
