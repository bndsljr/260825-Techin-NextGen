import SwiftUI

/// Tab 2: 【今日】
/// 当日行动：今日目标 + 课表日程时间轴 + 云平台账号抓取 + 系统日历同步 + 专注模式
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
            .sheet(isPresented: $appState.isCloudLoginSheetPresented) {
                CloudLoginSheet()
                    .environmentObject(appState)
            }
            .bndsFullScreenCover(isPresented: $appState.isFocusModalPresented) {
                FocusModeModal()
                    .environmentObject(appState)
            }
            .alert("日历同步", isPresented: $appState.showCalendarSyncAlert) {
                Button("好", role: .cancel) {}
            } message: {
                Text(appState.calendarSyncAlertMessage ?? "")
            }
        }
    }
}
