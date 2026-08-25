import SwiftUI

/// 节点编辑弹窗（用户专属决策区，仅用户可保存修改）
public struct NodeEditorSheet: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss

    @State private var title: String
    @State private var description: String
    @State private var type: LifePathNodeType
    @State private var status: LifePathNodeStatus
    @State private var parentId: String?

    private let editingNodeId: String?
    private let aiNote: String?

    public init(node: LifePathNode? = nil) {
        if let node = node {
            self.editingNodeId = node.id
            _title = State(initialValue: node.title)
            _description = State(initialValue: node.description)
            _type = State(initialValue: node.type)
            _status = State(initialValue: node.status)
            _parentId = State(initialValue: node.parentId)
            self.aiNote = node.aiNote
        } else {
            self.editingNodeId = nil
            _title = State(initialValue: "")
            _description = State(initialValue: "")
            _type = State(initialValue: .shortTermGoal)
            _status = State(initialValue: .inProgress)
            _parentId = State(initialValue: nil)
            self.aiNote = nil
        }
    }

    public var body: some View {
        NavigationStack {
            Form {
                if let note = aiNote, !note.isEmpty {
                    Section(header: Text("导师参考背景")) {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "sparkles")
                                .foregroundColor(BNDSColors.inProgress)
                            Text(note)
                                .font(.system(size: 13))
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section(header: Text("目标类型与层级")) {
                    Picker("类型", selection: $type) {
                        ForEach(LifePathNodeType.allCases, id: \.self) { nodeType in
                            HStack {
                                Image(systemName: nodeType.iconName)
                                Text(nodeType.displayName)
                            }
                            .tag(nodeType)
                        }
                    }

                    Picker("所属上级", selection: $parentId) {
                        Text("无（作为顶层）").tag(nil as String?)
                        ForEach(appState.lifePath.nodes.filter { $0.id != editingNodeId && ($0.type == .vision || $0.type == .longTermGoal) }) { parentNode in
                            Text("\(parentNode.type.displayName): \(parentNode.title)")
                                .tag(parentNode.id as String?)
                        }
                    }
                }

                Section(header: Text("目标内容")) {
                    TextField("目标名称（如：本学期掌握 SwiftUI）", text: $title)
                        .font(.system(size: 15, weight: .medium))

                    TextField("详细补充与行动设想（可选）", text: $description, axis: .vertical)
                        .lineLimit(3...6)
                        .font(.system(size: 14))
                }

                Section(header: Text("当前状态（随时可调整或待定）")) {
                    Picker("状态", selection: $status) {
                        ForEach(LifePathNodeStatus.allCases, id: \.self) { nodeStatus in
                            HStack {
                                Image(systemName: nodeStatus.iconName)
                                Text(nodeStatus.displayName)
                            }
                            .tag(nodeStatus)
                        }
                    }
                    .pickerStyle(.segmented)

                    if status == .pending {
                        HStack(spacing: 6) {
                            Image(systemName: "info.circle")
                            Text("待定是探索中的正常状态，不用急于确定。")
                        }
                        .font(.system(size: 12))
                        .foregroundColor(BNDSColors.pending)
                    }
                }

                if editingNodeId != nil {
                    Section {
                        Button(role: .destructive, action: {
                            if let id = editingNodeId {
                                appState.deleteNode(nodeId: id)
                            }
                        }) {
                            HStack {
                                Spacer()
                                Text("删除此目标节点")
                                Spacer()
                            }
                        }
                    }
                }
            }
            .navigationTitle(editingNodeId == nil ? "新增人生目标" : "编辑目标")
            .bndsInlineTitle()
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("取消") {
                        appState.isNodeEditorPresented = false
                    }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("确认保存") {
                        let finalNode = LifePathNode(
                            id: editingNodeId ?? UUID().uuidString,
                            parentId: parentId,
                            type: type,
                            title: title.isEmpty ? "未命名目标" : title,
                            description: description,
                            status: status,
                            source: .user,
                            aiNote: aiNote
                        )
                        appState.saveNode(finalNode)
                    }
                    .fontWeight(.bold)
                    .disabled(title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
        }
    }
}
