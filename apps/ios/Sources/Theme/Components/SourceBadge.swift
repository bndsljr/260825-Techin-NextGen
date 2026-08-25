import SwiftUI

/// 数据来源标签组件（云平台 / ManageBac / 手动录入）
public struct SourceBadge: View {
    public let source: String

    public init(source: String) {
        self.source = source
    }

    public var body: some View {
        HStack(spacing: 3) {
            Image(systemName: iconName)
                .font(.system(size: 9))
            Text(displayName)
                .font(.system(size: 10, weight: .medium))
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 2)
        .background(
            Capsule().fill(badgeColor.opacity(0.12))
        )
        .foregroundColor(badgeColor)
    }

    private var displayName: String {
        switch source.lowercased() {
        case "cloud": return "十一云平台"
        case "managebac": return "ManageBac"
        case "manual": return "手动录入"
        default: return source
        }
    }

    private var iconName: String {
        switch source.lowercased() {
        case "cloud": return "cloud.fill"
        case "managebac": return "book.fill"
        case "manual": return "pencil.line"
        default: return "tag.fill"
        }
    }

    private var badgeColor: Color {
        switch source.lowercased() {
        case "cloud": return BNDSColors.inProgress
        case "managebac": return BNDSColors.oxfordNavy
        case "manual": return BNDSColors.abandoned
        default: return .secondary
        }
    }
}
