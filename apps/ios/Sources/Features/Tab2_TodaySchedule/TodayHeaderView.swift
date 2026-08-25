import SwiftUI

/// 今日头部组件：日期 + 云平台同步状态 + 今日主线目标
public struct TodayHeaderView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // 日期与问候
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Image(systemName: "cloud.fill")
                            .font(.system(size: 11))
                            .foregroundColor(BNDSColors.inProgress)
                        Text("十一云平台同步 · \(appState.lastSyncedAt)")
                            .font(.system(size: 12, weight: .medium))
                            .foregroundColor(.secondary)
                    }

                    Text("课表与日程中枢")
                        .font(.system(size: 22, weight: .bold))
                }

                Spacer()

                HStack(spacing: 8) {
                    // 同步云平台按钮
                    Button(action: {
                        appState.syncCloudData()
                    }) {
                        HStack(spacing: 4) {
                            if appState.isSyncingCloud {
                                ProgressView()
                                    .scaleEffect(0.7)
                            } else {
                                Image(systemName: "arrow.triangle.2.circlepath")
                                    .font(.system(size: 11, weight: .bold))
                            }
                            Text(appState.isSyncingCloud ? "同步中" : "同步云平台")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 7)
                        .background(
                            Capsule().fill(BNDSColors.inProgress.opacity(0.12))
                        )
                        .foregroundColor(BNDSColors.inProgress)
                    }
                    .disabled(appState.isSyncingCloud)

                    // 专注按钮
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
