// swift-tools-version: 6.0
import PackageDescription

let package = Package(
  name: "CutsMedia",
  platforms: [.macOS(.v15), .iOS(.v18)],
  products: [.library(name: "CutsMedia", targets: ["CutsMedia"])],
  targets: [
    .target(name: "CutsMedia"),
    .executableTarget(name: "cuts-media-cli", dependencies: ["CutsMedia"]),
    .testTarget(name: "CutsMediaTests", dependencies: ["CutsMedia"])
  ]
)
