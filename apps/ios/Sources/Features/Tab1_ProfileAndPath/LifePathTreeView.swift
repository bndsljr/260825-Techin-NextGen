import SwiftUI

/// 人生路径层级树视图
public struct LifePathTreeView: View {
    @EnvironmentObject var appState: AppState

    public init() {}

    public var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // 路径标题与操作栏
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(appState.lifePath.title)
                        .font(.system(size: 17, weight: .bold))
                    Text("共 \(appState.lifePath.nodes.count) 个规划节点 · 随时可调整或待定")
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                }

                Spacer()

                Button(action: {
                    appState.editingNode = nil
                    appState.isNodeEditorPresented = true
                }) {
                    HStack(spacing: 4) {
                        Image(systemName: "plus.circle.fill")
                        Text("新增节点")
                    }
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(BNDSColors.crimson)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        Capsule().fill(BNDSColors.crimson.opacity(0.1))
                    )
                }
            }
            .padding(.horizontal, 4)

            // 顶层愿景与级联子节点
            let rootNodes = appState.lifePath.nodes.filter { $0.parentId == nil }
            if rootNodes.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 32))
                        .foregroundColor(.secondary)
                    Text("还没有创建人生路径节点，点击上方新增或与导师共创")
                        .font(.system(size: 14))
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 32)
            } else {
                ForEach(rootNodes) { rootNode in
                    NodeTreeNodeView(node: rootNode, level: 0)
                }
            }
        }
    }
}

/// 单个节点及其递归子树
struct NodeTreeNodeView: View {
    @EnvironmentObject var appState: AppState
    let node: LifePathNode
    let level: Int

    @State private var isExpanded: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // 节点主卡片
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .top, spacing: 10) {
                    // 折叠/展开或类型图标
                    let childNodes = appState.lifePath.nodes.filter { $0.parentId == node.id }
                    if !childNodes.isEmpty {
                        Button(action: { withAnimation { isExpanded.toggle() } }) {
                            Image(systemName: isExpanded ? "chevron.down.circle.fill" : "chevron.right.circle.fill")
                                .font(.system(size: 16))
                                .foregroundColor(BNDSColors.crimson)
                        }
                    } else {
                        Image(systemName: node.type.iconName)
                            .font(.system(size: 15))
                            .foregroundColor(.secondary)
                            .frame(width: 16)
                    }

                    // 标题与类型
                    VStack(alignment: .leading, spacing: 4) {
                        HStack(spacing: 6) {
                            Text(node.type.displayName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.secondary)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Capsule().fill(Color.primary.opacity(0.06)))

                            Text(node.title)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(.primary)
                        }

                        if !node.description.isEmpty {
                            Text(node.description)
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                        }

                        if let aiNote = node.aiNote {
                            HStack(spacing: 4) {
                                Image(systemName: "lightbulb.fill")
                                    .font(.system(size: 10))
                                Text(aiNote)
                                    .font(.system(size: 11))
                            }
                            .foregroundColor(BNDSColors.inProgress)
                            .padding(.top, 2)
                        }
                    }

                    Spacer()

                    // 状态徽章（点击弹出状态选择）
                    Menu {
                        ForEach(LifePathNodeStatus.allCases, id: \.self) { status in
                            Button(action: {
                                appState.updateNodeStatus(nodeId: node.id, newStatus: status)
                            }) {
                                HStack {
                                    Text(status.displayName)
                                    if node.status == status {
                                        Image(systemName: "checkmark")
                                    }
                                }
                            }
                        }
                    } label: {
                        StatusBadge(status: node.status)
                    }
                }

                // 底部轻量快捷操作行
                HStack(spacing: 12) {
                    Button(action: {
                        appState.editingNode = node
                        appState.isNodeEditorPresented = true
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "pencil")
                            Text("编辑")
                        }
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                    }

                    Button(action: {
                        let prompt = "我想就我的【\(node.type.displayName)】「\(node.title)」寻求建议。目前的规划是：\(node.description)。请帮我分析拆解或指出可能需要待定的关键点。"
                        appState.askMentorWithContext(contextTag: node.title, initialPrompt: prompt)
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "sparkles")
                            Text("问导师")
                        }
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(BNDSColors.inProgress)
                    }

                    Spacer()
                }
                .padding(.top, 4)
            }
            .padding(14)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(BNDSColors.cardBackground)
                    .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .strokeBorder(
                        node.status == .pending
                            ? BNDSColors.pending.opacity(0.35)
                            : Color.primary.opacity(0.06),
                        lineWidth: 1
                    )
            )

            // 子级节点树
            let childNodes = appState.lifePath.nodes.filter { $0.parentId == node.id }
            if isExpanded && !childNodes.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    ForEach(childNodes) { child in
                        NodeTreeNodeView(node: child, level: level + 1)
                    }
                }
                .padding(.leading, 18)
                .overlay(
                    Rectangle()
                        .fill(Color.primary.opacity(0.08))
                        .frame(width: 2)
                        .padding(.leading, 6),
                    alignment: .leading
                )
            }
        }
    }
}
