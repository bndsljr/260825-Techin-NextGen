import SwiftUI

#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

/// 十一校园专属设计系统 - 调色板
public enum BNDSColors {
    // 校园核心主色与辅助色
    public static let crimson = Color(red: 0.64, green: 0.11, blue: 0.18)        // 十一紫红 #A31C2E
    public static let oxfordNavy = Color(red: 0.10, green: 0.15, blue: 0.28)     // 典雅藏蓝 #1A2647
    public static let midnightBg = Color(red: 0.06, green: 0.08, blue: 0.12)     // 深色底色 #0F141F
    public static let softBackground = Color(red: 0.96, green: 0.96, blue: 0.98) // 浅色柔和底色

    // 人生路径节点四态色彩 - 严格遵循“待定是一等公民”
    public static let inProgress = Color(red: 0.18, green: 0.54, blue: 0.98)     // 进行中 - 活力天蓝 #2E8AFF
    public static let achieved = Color(red: 0.13, green: 0.69, blue: 0.44)       // 已达成 - 翡翠青绿 #21B070
    public static let pending = Color(red: 0.96, green: 0.62, blue: 0.12)        // 待定 - 暖阳琥珀金 #F59E1E
    public static let abandoned = Color(red: 0.52, green: 0.56, blue: 0.64)      // 已放弃 - 柔和石板灰 #848FA3

    // 渐变与装饰色
    public static let mentorGradient = LinearGradient(
        colors: [Color(red: 0.35, green: 0.22, blue: 0.75), Color(red: 0.18, green: 0.54, blue: 0.98)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    public static let bndsGradient = LinearGradient(
        colors: [Color(red: 0.64, green: 0.11, blue: 0.18), Color(red: 0.85, green: 0.25, blue: 0.32)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // 跨平台/系统背景色自适应
    public static var cardBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .secondarySystemGroupedBackground)
        #elseif canImport(AppKit)
        return Color(nsColor: .windowBackgroundColor)
        #else
        return Color.secondary.opacity(0.08)
        #endif
    }

    public static var groupBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemGroupedBackground)
        #elseif canImport(AppKit)
        return Color(nsColor: .underPageBackgroundColor)
        #else
        return Color.secondary.opacity(0.04)
        #endif
    }

    public static var tertiaryBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .tertiarySystemGroupedBackground)
        #elseif canImport(AppKit)
        return Color(nsColor: .controlBackgroundColor)
        #else
        return Color.secondary.opacity(0.12)
        #endif
    }

    public static var surfaceBackground: Color {
        #if canImport(UIKit)
        return Color(uiColor: .systemBackground)
        #elseif canImport(AppKit)
        return Color(nsColor: .windowBackgroundColor)
        #else
        return Color.white
        #endif
    }

    public static func color(for status: LifePathNodeStatus) -> Color {
        switch status {
        case .inProgress: return inProgress
        case .achieved: return achieved
        case .pending: return pending
        case .abandoned: return abandoned
        }
    }
}
