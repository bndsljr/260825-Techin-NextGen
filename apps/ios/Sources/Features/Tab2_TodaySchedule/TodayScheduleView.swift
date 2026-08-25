import SwiftUI

/// Tab 2: 【今日】
/// 当日行动：今日目标 + 课表日程时间轴 + 专注模式入口
public struct TodayScheduleView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    TodayHeaderView()
                    TimelineView()
                }
                .padding(16)
            }
            .background(BNDSColors.groupBackground.ignoresSafeArea())
            .navigationTitle("今日行动")
            .bndsInlineTitle()
            .bndsFullScreenCover(isPresented: $appState.isFocusModalPresented) {
                FocusModeModal()
                    .environmentObject(appState)
            }
        }
    }
}
