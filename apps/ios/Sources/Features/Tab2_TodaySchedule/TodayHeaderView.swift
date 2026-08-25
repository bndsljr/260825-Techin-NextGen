import SwiftUI

/// 今日头部组件：日期 + 云平台同步状态 + 系统日历同步入口 + 今日主线目标
public struct TodayHeaderView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // 顶部状态与功能按钮栏
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "cloud.fill")
                            .font(.system(size: 11))
                            .foregroundColor(BNDSColors.inProgress)
                        Text("云平台同步 · \(appState.lastSyncedAt)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                    }

                    Text("课表与日程中枢")
                        .font(.system(size: 22, weight: .bold))
                }

                Spacer()

                HStack(spacing: 8) {
                    // 1. 云平台账号登录抓取按钮
                    Button(action: {
                        appState.isCloudLoginSheetPresented = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "person.crop.circle.badge.plus")
                                .font(.system(size: 11, weight: .bold))
                            Text("账号抓取")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .padding(.horizontal, 9)
                        .padding(.vertical, 7)
                        .background(
                            Capsule().fill(BNDSColors.inProgress.opacity(0.14))
                        )
                        .foregroundColor(BNDSColors.inProgress)
                    }

                    // 2. 同步到 iPhone 系统日历按钮
                    Button(action: {
                        appState.syncToSystemCalendar()
                    }) {
                        HStack(spacing: 4) {
                            if appState.isCalendarSyncing {
                                ProgressView()
                                    .scaleEffect(0.6)
                            } else {
                                Image(systemName: "calendar.badge.plus")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            Text(appState.isCalendarSyncing ? "同步中" : "同步日历")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .padding(.horizontal, 9)
                        .padding(.vertical, 7)
                        .background(
                            Capsule().fill(BNDSColors.oxfordNavy.opacity(0.12))
                        )
                        .foregroundColor(BNDSColors.oxfordNavy)
                    }
                    .disabled(appState.isCalendarSyncing)

                    // 3. 专注模式按钮
                    Button(action: {
                        appState.isFocusModalPresented = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "timer")
                            Text("专注")
                        }
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(
                            Capsule().fill(BNDSColors.crimson)
                        )
                    }
                }
            }

            // 今日关联目标（从人生路径拉取）
            if let activeGoal = appState.lifePath.nodes.first(where: { $0.type == .shortTermGoal || $0.type == .task }) {
                HStack(spacing: 12) {
                    Image(systemName: "flag.fill")
                        .font(.system(size: 14))
                        .foregroundColor(BNDSColors.color(for: activeGoal.status))

                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 6) {
                            Text("当前主线目标")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(.secondary)
                            StatusBadge(status: activeGoal.status, isCompact: true)
                        }

                        Text(activeGoal.title)
                            .font(.system(size: 14, weight: .semibold))
                            .lineLimit(1)
                    }

                    Spacer()

                    Button(action: {
                        let prompt = "我在推进今日目标「\(activeGoal.title)」时，想结合云平台下发的课表评估时间精力分配。"
                        appState.askMentorWithContext(contextTag: activeGoal.title, initialPrompt: prompt)
                    }) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 14))
                            .foregroundColor(BNDSColors.inProgress)
                    }
                }
                .padding(12)
                .background(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .fill(BNDSColors.tertiaryBackground)
                )
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .fill(BNDSColors.cardBackground)
        )
    }
}
