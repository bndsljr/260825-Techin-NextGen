import SwiftUI

/// 个人成长账本视图（过程性评价、成绩趋势、专注累积）
public struct GrowthLedgerView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // 1. 成长概览指标卡
            HStack(spacing: 12) {
                GrowthStatCard(
                    title: "过程性评价",
                    value: "\(appState.formativeAssessments.count) 条",
                    subtitle: "全部卓越/优秀",
                    iconName: "doc.plaintext.fill",
                    color: BNDSColors.achieved
                )

                GrowthStatCard(
                    title: "主要课程均分",
                    value: "95.4",
                    subtitle: "年级前列",
                    iconName: "chart.line.uptrend.xyaxis",
                    color: BNDSColors.inProgress
                )

                let totalFocusMin = appState.focusSessions.reduce(0) { $0 + $1.actualDurationMin }
                GrowthStatCard(
                    title: "专注累积",
                    value: "\(totalFocusMin) 分钟",
                    subtitle: "\(appState.focusSessions.count) 次会话",
                    iconName: "timer",
                    color: BNDSColors.pending
                )
            }

            // 2. 过程性评价列表
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "sparkle.magnifyingglass")
                        .foregroundColor(BNDSColors.crimson)
                    Text("过程性评价（教师寄语与维度反馈）")
                        .font(.system(size: 16, weight: .bold))
                    Spacer()
                }

                ForEach(appState.formativeAssessments) { assessment in
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text(assessment.courseName)
                                .font(.system(size: 14, weight: .bold))
                            Text("· \(assessment.teacherName)")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)

                            Spacer()

                            SourceBadge(source: assessment.source)

                            HStack(spacing: 4) {
                                Image(systemName: assessment.dimension.iconName)
                                Text(assessment.dimension.displayName)
                            }
                            .font(.system(size: 11, weight: .medium))
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(Capsule().fill(Color.primary.opacity(0.06)))
                        }

                        Text("“\(assessment.comment)”")
                            .font(.system(size: 13, weight: .regular))
                            .foregroundColor(.primary)
                            .lineSpacing(3)
                            .padding(10)
                            .background(
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(Color.primary.opacity(0.03))
                            )

                        HStack {
                            Text(assessment.gradeLevel.displayName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(BNDSColors.achieved)

                            Spacer()

                            Button(action: {
                                let prompt = "请分析我在【\(assessment.courseName)】中云平台同步的教师评价：「\(assessment.comment)」，结合我的人生路径给出下一步学习策略。"
                                appState.askMentorWithContext(contextTag: assessment.courseName, initialPrompt: prompt)
                            }) {
                                HStack(spacing: 4) {
                                    Image(systemName: "sparkles")
                                    Text("让导师深度解读")
                                }
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(BNDSColors.inProgress)
                            }
                        }
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .fill(BNDSColors.cardBackground)
                    )
                }
            }

            // 3. 最新成绩记录
            VStack(alignment: .leading, spacing: 12) {
                HStack {
                    Image(systemName: "chart.bar.fill")
                        .foregroundColor(BNDSColors.oxfordNavy)
                    Text("近期阶段检测与成绩 (云平台)")
                        .font(.system(size: 16, weight: .bold))
                    Spacer()
                }

                ForEach(appState.grades) { grade in
                    HStack {
                        VStack(alignment: .leading, spacing: 3) {
                            HStack(spacing: 6) {
                                Text(grade.courseName)
                                    .font(.system(size: 14, weight: .semibold))
                                SourceBadge(source: grade.source)
                            }
                            Text("\(grade.examName) · \(grade.examDate)")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }

                        Spacer()

                        HStack(alignment: .firstTextBaseline, spacing: 2) {
                            Text(String(format: "%.1f", grade.score))
                                .font(.system(size: 18, weight: .bold))
                                .foregroundColor(BNDSColors.oxfordNavy)
                            Text("/ \(Int(grade.maxScore))")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(12)
                    .background(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .fill(BNDSColors.cardBackground)
                    )
                }
            }
        }
    }
}

/// 成长概览小卡片
struct GrowthStatCard: View {
    let title: String
    let value: String
    let subtitle: String
    let iconName: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Image(systemName: iconName)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(color)

            Text(value)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.primary)

            Text(title)
                .font(.system(size: 11))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .fill(BNDSColors.cardBackground)
        )
    }
}
