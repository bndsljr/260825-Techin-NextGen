import SwiftUI

/// Tab 3: 【导师】(受邀陪伴与学业规划)
/// 对话流 + 建议卡片（无保存写权限，采纳跳转回编辑器）
public struct MentorChatView: View {
    @EnvironmentObject var appState: AppState
    @State private var inputText: String = ""
    @State private var isThinking: Bool = false

    public init() {}

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // 1. 顶部常驻原则标语（产品哲学）
                HStack(spacing: 6) {
                    Image(systemName: "hand.raised.fill")
                        .font(.system(size: 11))
                        .foregroundColor(BNDSColors.oxfordNavy)
                    Text("导师声明：我是你的辅导与建议者，所有规划与调整决定权永远在你。")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(BNDSColors.oxfordNavy)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .frame(maxWidth: .infinity)
                .background(BNDSColors.oxfordNavy.opacity(0.08))

                // 上下文提示（如果有）
                if let context = appState.activeContextTag {
                    HStack {
                        Image(systemName: "scope")
                            .font(.system(size: 11))
                        Text("当前对话聚焦：\(context)")
                            .font(.system(size: 12, weight: .medium))
                        Spacer()
                        Button(action: { appState.activeContextTag = nil }) {
                            Image(systemName: "xmark")
                                .font(.system(size: 10))
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 6)
                    .background(BNDSColors.inProgress.opacity(0.1))
                    .foregroundColor(BNDSColors.inProgress)
                }

                // 2. 对话消息列表
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(spacing: 16) {
                            ForEach(appState.mentorMessages) { message in
                                ChatMessageBubbleView(message: message)
                                    .id(message.id)
                            }

                            if isThinking {
                                HStack(spacing: 6) {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                    Text("导师正在结合你的路径与学业数据进行推演...")
                                        .font(.system(size: 12))
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 8)
                            }
                        }
                        .padding(16)
                    }
                    .onChange(of: appState.mentorMessages.count) {
                        if let lastId = appState.mentorMessages.last?.id {
                            withAnimation {
                                proxy.scrollTo(lastId, anchor: .bottom)
                            }
                        }
                    }
                }

                // 3. 快捷提问胶囊
                PromptShortcutsView { selectedPrompt in
                    sendMessage(text: selectedPrompt)
                }
                .padding(.bottom, 8)

                // 4. 底部输入栏
                HStack(spacing: 10) {
                    TextField("向导师提问（如：如何优化下周时间分配）...", text: $inputText)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 20)
                                .fill(BNDSColors.cardBackground)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 20)
                                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                        )

                    Button(action: {
                        sendMessage(text: inputText)
                    }) {
                        Image(systemName: "arrow.up.circle.fill")
                            .font(.system(size: 32))
                            .foregroundColor(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? .secondary.opacity(0.4) : BNDSColors.crimson)
                    }
                    .disabled(inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isThinking)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(BNDSColors.surfaceBackground)
            }
            .background(BNDSColors.groupBackground.ignoresSafeArea())
            .navigationTitle("AI 导师")
            .bndsInlineTitle()
        }
    }

    private func sendMessage(text: String) {
        let cleanText = text.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !cleanText.isEmpty else { return }

        inputText = ""
        isThinking = true

        let userMsg = MentorMessage(
            sender: "user",
            content: cleanText,
            relatedContextTag: appState.activeContextTag
        )
        appState.mentorMessages.append(userMsg)
        MockDataStore.shared.addMentorMessage(userMsg)

        Task {
            _ = try? await APIClient.shared.askMentor(
                question: cleanText,
                contextTag: appState.activeContextTag
            )
            await MainActor.run {
                self.appState.mentorMessages = MockDataStore.shared.mentorMessages
                self.isThinking = false
            }
        }
    }
}

/// 消息气泡组件
struct ChatMessageBubbleView: View {
    let message: MentorMessage

    var body: some View {
        VStack(alignment: message.sender == "user" ? .trailing : .leading, spacing: 8) {
            HStack {
                if message.sender == "user" {
                    Spacer(minLength: 40)
                    Text(message.content)
                        .font(.system(size: 15))
                        .foregroundColor(.white)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(
                            RoundedRectangle(cornerRadius: 18)
                                .fill(BNDSColors.oxfordNavy)
                        )
                } else {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(spacing: 6) {
                            Image(systemName: "sparkles")
                                .foregroundColor(BNDSColors.crimson)
                            Text("导师建议与分析")
                                .font(.system(size: 12, weight: .bold))
                                .foregroundColor(.secondary)
                        }

                        Text(message.content)
                            .font(.system(size: 15))
                            .foregroundColor(.primary)
                            .lineSpacing(3)

                        // 结构化建议卡
                        if let suggestion = message.suggestion {
                            SuggestionCardView(suggestion: suggestion)
                        }
                    }
                    .padding(14)
                    .background(
                        RoundedRectangle(cornerRadius: 18)
                            .fill(BNDSColors.cardBackground)
                    )
                    Spacer(minLength: 40)
                }
            }
        }
    }
}
