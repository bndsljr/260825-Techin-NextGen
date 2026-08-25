import SwiftUI

/// 今日头部组件：日期与问候 + 独立功能操作条 + 今日主线目标
public struct TodayHeaderView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // 1. 顶部标题栏与沉浸专注按钮
            HStack(alignment: .center) {
                VStack(alignment: .leading, spacing: 4) {
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

                // 专注模式按钮（核心高频操作，常驻右上角）
                Button(action: {
                    appState.isFocusModalPresented = true
                }) {
                    HStack(spacing: 5) {
                        Image(systemName: "timer")
                            .font(.system(size: 13, weight: .bold))
                        Text("开启专注")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(BNDSColors.crimson)
                    )
                    .shadow(color: BNDSColors.crimson.opacity(0.25), radius: 4, x: 0, y: 2)
                }
            }

            // 2. 独立功能操作栏（云平台抓取 & 系统日历同步，横向均分空间）
            HStack(spacing: 10) {
                // (1) 云平台账号登录抓取按钮
                Button(action: {
                    appState.isCloudLoginSheetPresented = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "person.crop.circle.badge.plus")
                            .font(.system(size: 13, weight: .bold))
                        Text("云平台抓取")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(BNDSColors.inProgress.opacity(0.12))
                    )
                    .foregroundColor(BNDSColors.inProgress)
                }

                // (2) 同步到 iPhone 系统日历按钮
                Button(action: {
                    appState.syncToSystemCalendar()
                }) {
                    HStack(spacing: 6) {
                        if appState.isCalendarSyncing {
                            ProgressView()
                                .scaleEffect(0.7)
                        } else {
                            Image(systemName: "calendar.badge.plus")
                                .font(.system(size: 13, weight: .bold))
                        }
                        Text(appState.isCalendarSyncing ? "同步中..." : "同步系统日历")
                            .font(.system(size: 13, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 9)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(BNDSColors.oxfordNavy.opacity(0.1))
                    )
                    .foregroundColor(BNDSColors.oxfordNavy)
                }
                .disabled(appState.isCalendarSyncing)
            }

            // 3. 今日关联目标（从人生路径拉取）
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
                            .font(.system(size: 13, weight: .semibold))
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
