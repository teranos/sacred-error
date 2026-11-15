// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "SacredError",
    // The oldest the QNTX app runs on (QNTX-App .github/scripts/ios-project.py): a package newer than its consumer does not link.
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [.library(name: "SacredError", targets: ["SacredError"])],
    targets: [
        .target(name: "SacredError", path: "Sources/SacredError"),
        .testTarget(name: "SacredErrorTests", dependencies: ["SacredError"], path: "Tests/SacredErrorTests"),
    ]
)
