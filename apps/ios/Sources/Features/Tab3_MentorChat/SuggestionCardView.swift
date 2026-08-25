import SwiftUI

/// 导师结构化建议卡片（严格遵守“无直接保存权限，采纳跳转回用户编辑器落地”）
public struct SuggestionCardView: View {
    @EnvironmentObject var appState: AppState
    let suggestion: MentorSuggestion

    public init(suggestion: MentorSuggestion) {
        self.suggestion = suggestion
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // 建议卡头部
            HStack {
                HStack(spacing: 6) {
                    Image(systemName: "lightbulb.fill")
                        .foregroundColor(BNDSColors.pending)
                    Text("导师规划建议")
                        .font(.system(size: 13, weight: .bold))
                }

                Spacer()

                Text(suggestion.status.displayName)
                    .font(.system(size: 11, weight: .medium))
                    .foregroundColor(colorForStatus(suggestion.status))
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(Capsule().fill(colorForStatus(suggestion.status).opacity(0.12)))
            }

            // 建议主要内容
            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.title)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.primary)

                Text(suggestion.text)
                    .font(.system(size: 13))
                    .foregroundColor(.secondary)
                    .lineSpacing(2)
            }

            // 💡 为什么这么建议（透明可溯源依据）
            VStack(alignment: .leading, spacing: 4) {
                Text("💡 为什么这么建议：")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundColor(BNDSColors.oxfordNavy)

                Text(suggestion.reason)
                    .font(.system(size: 12))
                    .foregroundColor(.secondary)
            }
            .padding(10)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(BNDSColors.oxfordNavy.opacity(0.05))
            )

            // 操作栏（仅当待决策时显示）
            if suggestion.status == .pendingReview {
                Divider()

                HStack(spacing: 10) {
                    Button(action: {
                        appState.acceptMentorSuggestion(suggestion)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark")
                            Text("采纳并去编辑器落地")
                        }
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 8)
                        .background(Capsule().fill(BNDSColors.crimson))
                    }

                    Button(action: {
                        appState.updateSuggestionDecision(suggestionId: suggestion.id, status: .deferred)
                    }) {
                        Text("暂缓")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                    }

                    Button(action: {
                        appState.updateSuggestionDecision(suggestionId: suggestion.id, status: .rejected)
                    }) {
                        Text("不采纳")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 10)
                            .padding(.vertical, 8)
                    }
                }
            }
        }
        .padding(14)
        .background(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(BNDSColors.cardBackground)
                .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 3)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(BNDSColors.pending.opacity(0.35), lineWidth: 1)
        )
    }

    private func colorForStatus(_ status: SuggestionStatus) -> Color {
        switch status {
        case .pendingReview: return BNDSColors.pending
        case .accepted: return BNDSColors.achieved
        case .deferred: return .secondary
        case .rejected: return BNDSColors.abandoned
        }
    }
}
