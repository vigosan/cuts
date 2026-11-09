import CoreImage
import Foundation

let waveAspect = 80.0 / 998.0
let barAspect = 1.0 / 480.0

public enum Layers {
  public static func color(_ hex: String) -> CIColor {
    guard hex.count == 7, hex.hasPrefix("#"), let value = Int(hex.dropFirst(), radix: 16) else { return CIColor(red: 1, green: 1, blue: 1) }
    return CIColor(red: CGFloat((value >> 16) & 0xff) / 255, green: CGFloat((value >> 8) & 0xff) / 255, blue: CGFloat(value & 0xff) / 255)
  }

  public static func wave(samples: ArraySlice<Int16>, size: CGSize, color: CIColor, opacity: Double) -> CIImage {
    let (width, height) = (Int(size.width), Int(size.height))
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let values = Array(samples)
    for x in 0..<width where !values.isEmpty {
      let from = x * values.count / width
      let to = max(from + 1, (x + 1) * values.count / width)
      let peak = values[from..<min(to, values.count)].map { abs(Double($0)) }.max() ?? 0
      let half = (peak / 32768).squareRoot() * Double(height) / 2
      let alpha = opacity * min(1, Double(min(x, width - x)) / (0.22 * Double(width)))
      let top = max(0, Int((Double(height) / 2 - half).rounded()))
      let bottom = min(height - 1, max(top, Int((Double(height) / 2 + half).rounded()) - 1))
      for y in top...bottom {
        let offset = (y * width + x) * 4
        pixels[offset] = UInt8(color.red * alpha * 255)
        pixels[offset + 1] = UInt8(color.green * alpha * 255)
        pixels[offset + 2] = UInt8(color.blue * alpha * 255)
        pixels[offset + 3] = UInt8(alpha * 255)
      }
    }
    return CIImage(bitmapData: Data(pixels), bytesPerRow: width * 4, size: size, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB))
  }

  public static func bar(progress: Double, size: CGSize, color: CIColor, opacity: Double) -> CIImage {
    CIImage(color: CIColor(red: color.red, green: color.green, blue: color.blue, alpha: opacity))
      .cropped(to: CGRect(x: 0, y: 0, width: (size.width * max(0, min(1, progress))).rounded(), height: size.height))
  }
}

extension Framer {
  public func layers(image: CIImage, at seconds: Double, samples: SampleStream?) -> CIImage {
    let even = { (value: Double) in Double(Int(value.rounded()) / 2 * 2) }
    let (width, height) = (renderSize.width, renderSize.height)
    var result = image
    if let spec = job.wave, let samples {
      let size = CGSize(width: even(width * spec.width), height: max(2, even(even(width * spec.width) * waveAspect)))
      let slice = samples.window(at: seconds, length: 1.0 / 30)
      result = place(Layers.wave(samples: slice, size: size, color: Layers.color(spec.color), opacity: spec.opacity), spec: spec, over: result)
    }
    if let spec = job.bar {
      let size = CGSize(width: even(width * spec.width), height: max(2, (even(width * spec.width) * barAspect).rounded()))
      result = place(Layers.bar(progress: seconds / job.length, size: size, color: Layers.color(spec.color), opacity: spec.opacity), spec: spec, over: result)
    }
    return result.cropped(to: CGRect(x: 0, y: 0, width: width, height: height))
  }

  private func place(_ layer: CIImage, spec: LayerSpec, over image: CIImage) -> CIImage {
    let x = (spec.x * renderSize.width).rounded()
    let y = (renderSize.height - spec.y * renderSize.height - layer.extent.height).rounded()
    return layer.transformed(by: CGAffineTransform(translationX: x, y: y)).composited(over: image)
  }
}
