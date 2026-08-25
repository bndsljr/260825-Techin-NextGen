import SwiftUI

/// 状态徽章组件（渲染进行中、已达成、待定、已放弃）
public struct StatusBadge: View {
    public let status: LifePathNodeStatus
    public var isCompact: Bool = false

    public init(status: LifePathNodeStatus, isCompact: Bool = false) {
        self.status = status
        self.isCompact = isCompact
    }

    public var body: some View {
        HStack(spacing: 4) {
            Image(systemName: status.iconName)
                .font(.system(size: isCompact ? 10 : 12, weight: .bold))
            if !isCompact {
                Text(status.displayName)
                    .font(.system(size: 12, weight: .semibold))
            }
        }
        .padding(.horizontal, isCompact ? 6 : 9)
        .padding(.vertical, isCompact ? 3 : 5)
        .background(
            Capsule()
                .fill(BNDSColors.color(for: status).opacity(0.15))
        )
        .overlay(
            Capsule()
                .strokeBorder(BNDSColors.color(for: status).opacity(0.4), lineWidth: 1)
        )
        .foregroundColor(BNDSColors.color(for: status))
    }
}
