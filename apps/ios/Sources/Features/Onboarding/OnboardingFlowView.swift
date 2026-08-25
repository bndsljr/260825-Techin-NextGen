import SwiftUI

/// 首次接入（Onboarding）- 与 AI 对话式共创人生路径
/// 对齐 README.md § 四 & docs/ux-ia.md § 4.1
public struct OnboardingFlowView: View {
    @EnvironmentObject var appState: AppState

    @State private var currentStep: Int = 1
    @State private var selectedInterests: Set<String> = ["cs", "math", "art"]
    @State private var lifeThoughtInput: String = "想在高中阶段探索人工智能与人机交互，希望能做出真正被同学们使用的产品，但大学具体去向还待定。"

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                // 顶部进度指示
                HStack(spacing: 8) {
                    ForEach(1...3, id: \.self) { step in
                        Capsule()
                            .fill(step <= currentStep ? BNDSColors.crimson : Color.primary.opacity(0.1))
                            .frame(height: 4)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.top, 12)

                if currentStep == 1 {
                    // 步骤 1: 了解“我”与兴趣板块
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("欢迎来到十一校园助手")
                                .font(.system(size: 24, weight: .bold))
                            Text("首先，选择你感兴趣或希望探索的领域（可多选，随时可改）")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }

                        ScrollView {
                            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                                ForEach(appState.interestPillars) { pillar in
                                    InterestPillarCard(
                                        pillar: pillar,
                                        isSelected: selectedInterests.contains(pillar.id),
                                        onToggle: {
                                            if selectedInterests.contains(pillar.id) {
                                                selectedInterests.remove(pillar.id)
                                            } else {
                                                selectedInterests.insert(pillar.id)
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 20)

                } else if currentStep == 2 {
                    // 步骤 2: 说一说对人生的想法（哪怕很模糊）
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("倾听你的想法")
                                .font(.system(size: 24, weight: .bold))
                            Text("对未来三年有什么模糊的愿景或好奇？写下来，AI 不评判、只倾听。")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }

                        TextEditor(text: $lifeThoughtInput)
                            .padding(12)
                            .background(
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(BNDSColors.cardBackground)
                            )
                            .frame(height: 180)
                            .overlay(
                                RoundedRectangle(cornerRadius: 16)
                                    .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                            )

                        HStack(spacing: 8) {
                            Image(systemName: "hand.raised.fill")
                                .foregroundColor(BNDSColors.pending)
                            Text("任何位置都可以标记为【待定】，AI 不强求、不催促。")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                        }
                        .padding(10)
                        .background(
                            RoundedRectangle(cornerRadius: 10)
                                .fill(BNDSColors.pending.opacity(0.08))
                        )

                        Spacer()
                    }
                    .padding(.horizontal, 20)

                } else if currentStep == 3 {
                    // 步骤 3: 共创人生路径草案
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("共创人生路径草案")
                                .font(.system(size: 24, weight: .bold))
                            Text("AI 基于你的想法整理出初步路径，你可以亲手确认或调整：")
                                .font(.system(size: 14))
                                .foregroundColor(.secondary)
                        }

                        ScrollView {
                            VStack(spacing: 10) {
                                OnboardingDraftNodeCard(
                                    type: .vision,
                                    title: "成为能用科技与设计解决真实问题的创造者",
                                    status: .inProgress
                                )

                                OnboardingDraftNodeCard(
                                    type: .longTermGoal,
                                    title: "高二完成端到端 AI 校园辅助应用开发",
                                    status: .inProgress
                                )

                                OnboardingDraftNodeCard(
                                    type: .longTermGoal,
                                    title: "高三前确定跨学科大学申请方向 (CS+HCI)",
                                    status: .pending // 待定
                                )

                                OnboardingDraftNodeCard(
                                    type: .shortTermGoal,
                                    title: "本学期掌握 SwiftUI 与 Agent 编排",
                                    status: .inProgress
                                )
                            }
                        }

                        Text("💡 提示：进入应用后，你可以在【我】的页面随时增删、调整或标记待定。")
                            .font(.system(size: 12))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 20)
                }

                Spacer()

                // 底部下一步/完成按钮
                Button(action: {
                    if currentStep < 3 {
                        withAnimation { currentStep += 1 }
                    } else {
                        // 完成 Onboarding
                        appState.currentUser.interests = Array(selectedInterests)
                        appState.isOnboardingCompleted = true
                    }
                }) {
                    HStack {
                        Spacer()
                        Text(currentStep == 3 ? "亲手确认并开启旅程" : "下一步")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(.white)
                        Spacer()
                    }
                    .padding(.vertical, 14)
                    .background(
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(BNDSColors.crimson)
                    )
                }
                .padding(.horizontal, 20)
                .padding(.bottom, 20)
            }
            .background(BNDSColors.groupBackground.ignoresSafeArea())
            .bndsInlineTitle()
        }
    }
}

/// 兴趣卡片独立子视图（避免编译器类型推导超时）
struct InterestPillarCard: View {
    let pillar: InterestPillar
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: pillar.iconName)
                        .font(.system(size: 18))
                    Spacer()
                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundColor(BNDSColors.achieved)
                    }
                }

                Text(pillar.name)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.primary)

                Text(pillar.description)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(isSelected ? BNDSColors.crimson.opacity(0.08) : BNDSColors.cardBackground)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(isSelected ? BNDSColors.crimson : Color.clear, lineWidth: 1.5)
            )
        }
    }
}

/// 草案节点预览卡片
struct OnboardingDraftNodeCard: View {
    let type: LifePathNodeType
    let title: String
    let status: LifePathNodeStatus

    var body: some View {
        HStack {
            Image(systemName: type.iconName)
                .foregroundColor(.secondary)
                .frame(width: 20)

            VStack(alignment: .leading, spacing: 2) {
                Text(type.displayName)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.secondary)
                Text(title)
                    .font(.system(size: 13, weight: .bold))
            }

            Spacer()

            StatusBadge(status: status)
        }
        .padding(12)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(BNDSColors.cardBackground)
        )
    }
}
