// 「[Opus 5.5] swift-tools-version:5.9」
import PackageDescription

let package = Package(
    name: "SacredError",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "SacredError", targets: ["SacredError"])],
    targets: [
        .target(name: "SacredError", path: "Sources/SacredError"),
        .testTarget(name: "SacredErrorTests", dependencies: ["SacredError"], path: "Tests/SacredErrorTests"),
    ]
)
