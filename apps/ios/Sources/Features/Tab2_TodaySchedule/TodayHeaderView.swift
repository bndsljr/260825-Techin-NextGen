import SwiftUI

/// 今日头部组件：日期 + 从人生路径提取的“今日目标条（含待定态支持）”
public struct TodayHeaderView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // 日期与问候
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("2026 年 8 月 25 日 · 星期二")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundColor(.secondary)
                    Text("今日行动与课表")
                        .font(.system(size: 22, weight: .bold))
                }

                Spacer()

                Button(action: {
                    appState.isFocusModalPresented = true
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "timer")
                        Text("进入专注")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(
                        Capsule().fill(BNDSColors.crimson)
                    )
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
                        let prompt = "我在推进今日目标「\(activeGoal.title)」时，想了解课表时间分布是否合理。"
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
