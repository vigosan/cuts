import AVFoundation
import CutsMedia
import Foundation

let args = CommandLine.arguments
if args.count == 3, args[1] == "peaks" {
  let peaks = try await readPeaks(asset: AVURLAsset(url: URL(fileURLWithPath: args[2]))) ?? []
  let json = try JSONEncoder().encode(peaks)
  FileHandle.standardOutput.write(json)
} else if args.count == 4, args[1] == "export" {
  let job = try JSONDecoder().decode(ExportJob.self, from: Data(args[3].utf8))
  try await Exporter().export(asset: AVURLAsset(url: URL(fileURLWithPath: args[2])), job: job) { _ in }
} else {
  FileHandle.standardError.write("usage: cuts-media-cli peaks <video> | export <video> <job json>\n".data(using: .utf8)!)
  exit(1)
}
