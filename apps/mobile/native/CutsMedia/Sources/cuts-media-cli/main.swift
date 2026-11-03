import AVFoundation
import CutsMedia
import Foundation

let args = CommandLine.arguments
if args.count == 3, args[1] == "peaks" {
  let peaks = try await readPeaks(asset: AVURLAsset(url: URL(fileURLWithPath: args[2]))) ?? []
  let json = try JSONEncoder().encode(peaks)
  FileHandle.standardOutput.write(json)
} else {
  FileHandle.standardError.write("usage: cuts-media-cli peaks <video>\n".data(using: .utf8)!)
  exit(1)
}
