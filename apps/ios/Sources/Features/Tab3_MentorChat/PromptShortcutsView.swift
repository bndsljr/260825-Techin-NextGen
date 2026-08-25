import SwiftUI

/// 导师快捷提问胶囊栏
public struct PromptShortcutsView: View {
    public let onSelectPrompt: (String) -> Void

    let shortcuts = [
        "帮我结合近期各科成绩做一次学业体检",
        "我该如何平衡微积分探究与项目开发？",
        "帮我分析人生路径中【待定】节点的探索思路",
        "根据今日课表为我推荐最高效的专注时段"
    ]

    public init(onSelectPrompt: @escaping (String) -> Void) {
        self.onSelectPrompt = onSelectPrompt
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(shortcuts, id: \.self) { text in
                    Button(action: { onSelectPrompt(text) }) {
                        HStack(spacing: 4) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 10))
                            Text(text)
                                .font(.system(size: 12))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule().fill(BNDSColors.cardBackground)
                        )
                        .overlay(
                            Capsule().strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
                        )
                        .foregroundColor(.primary)
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }
}
