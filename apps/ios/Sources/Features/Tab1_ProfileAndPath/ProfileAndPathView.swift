import SwiftUI

/// Tab 1: 【我】(默认落点)
/// 个人核心世界：个人档案 + 人生路径树 / 成长账本
public struct ProfileAndPathView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedSegment: Int = 0 // 0: 路径, 1: 成长

    public init() {}

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    // 1. 顶部个人档案与兴趣 Chips
                    ProfileHeaderView()

                    // 2. 分段选择器：人生路径 / 成长账本
                    Picker("模式", selection: $selectedSegment) {
                        Text("🧭 人生路径").tag(0)
                        Text("📈 成长账本").tag(1)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal, 4)

                    // 3. 内容切换
                    if selectedSegment == 0 {
                        LifePathTreeView()
                    } else {
                        GrowthLedgerView()
                    }
                }
                .padding(16)
            }
            .background(BNDSColors.groupBackground.ignoresSafeArea())
            .navigationTitle("我的世界")
            .bndsInlineTitle()
            .sheet(isPresented: $appState.isNodeEditorPresented) {
                NodeEditorSheet(node: appState.editingNode)
                    .environmentObject(appState)
            }
        }
    }
}
