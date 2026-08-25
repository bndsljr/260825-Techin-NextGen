import SwiftUI

/// 根视图（3-Tab 主导航与 Onboarding 控制）
/// 严格对齐 docs/ux-ia.md § 2:
/// Tab 1: 我 (默认落点 / 个人核心)
/// Tab 2: 今日 (当日行动 / 课表 / 专注)
/// Tab 3: 导师 (受邀导师 / 建议卡)
public struct RootView: View {
    @StateObject private var appState = AppState()

    public init() {}

    public var body: some View {
        Group {
            if !appState.isOnboardingCompleted {
                OnboardingFlowView()
                    .environmentObject(appState)
            } else {
                TabView(selection: $appState.selectedTab) {
                    // Tab 1: 【我】(默认落点，人优先)
                    ProfileAndPathView()
                        .tabItem {
                            Label("我", systemImage: "person.crop.circle.fill")
                        }
                        .tag(0)

                    // Tab 2: 【今日】(当日行动)
                    TodayScheduleView()
                        .tabItem {
                            Label("今日", systemImage: "calendar.badge.clock")
                        }
                        .tag(1)

                    // Tab 3: 【导师】(受邀导师)
                    MentorChatView()
                        .tabItem {
                            Label("导师", systemImage: "sparkles")
                        }
                        .tag(2)
                }
                .tint(BNDSColors.crimson)
                .environmentObject(appState)
            }
        }
    }
}
