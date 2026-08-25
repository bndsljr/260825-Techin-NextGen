// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BNDSCompanion",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(
            name: "BNDSCompanion",
            targets: ["BNDSCompanion"]
        ),
    ],
    dependencies: [],
    targets: [
        .target(
            name: "BNDSCompanion",
            dependencies: [],
            path: "Sources"
        ),
    ]
)
