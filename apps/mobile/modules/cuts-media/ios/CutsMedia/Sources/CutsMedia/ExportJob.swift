import Foundation

public struct OverlaySpec: Codable, Sendable {
  public var url: URL
  public var x: Double
  public var y: Double
  public var width: Double

  public init(url: URL, x: Double, y: Double, width: Double) {
    self.url = url
    self.x = x
    self.y = y
    self.width = width
  }
}

public struct ExportJob: Codable, Sendable {
  public var start: Double
  public var end: Double
  public var format: String
  public var framing: String
  public var cropX: Double
  public var cropY: Double
  public var videoFade: String
  public var audioFade: String
  public var fadeSeconds: Double
  public var videoFadeIn: Bool
  public var output: URL
  public var overlay: OverlaySpec?

  public init(start: Double, end: Double, format: String, framing: String, cropX: Double, cropY: Double, videoFade: String,
              audioFade: String, fadeSeconds: Double, videoFadeIn: Bool, output: URL, overlay: OverlaySpec? = nil) {
    self.start = start
    self.end = end
    self.format = format
    self.framing = framing
    self.cropX = cropX
    self.cropY = cropY
    self.videoFade = videoFade
    self.audioFade = audioFade
    self.fadeSeconds = fadeSeconds
    self.videoFadeIn = videoFadeIn
    self.output = output
    self.overlay = overlay
  }

  public var length: Double { end - start }
}

let formatSizes: [String: CGSize] = [
  "4:5": CGSize(width: 1080, height: 1350),
  "1:1": CGSize(width: 1080, height: 1080),
  "9:16": CGSize(width: 1080, height: 1920)
]

func fadeLength(_ seconds: Double, clipLength: Double) -> Double {
  min(seconds, clipLength / 2)
}

func audioGain(curve: String, fadeSeconds: Double, clipLength: Double, at: Double) -> Float {
  if curve == "none" { return 1 }
  let into = min(at, clipLength - at) / fadeLength(fadeSeconds, clipLength: clipLength)
  if into >= 1 { return 1 }
  let x = max(0, into)
  return Float(curve == "natural" ? sin(x * .pi / 2) : x)
}
