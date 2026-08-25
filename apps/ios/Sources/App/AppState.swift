import SwiftUI
import Combine

/// 全局响应式状态管理
@MainActor
public final class AppState: ObservableObject {
    // 导航与路由
    @Published public var selectedTab: Int = 0 // 0: 我 (默认落点), 1: 今日, 2: 导师
    @Published public var isOnboardingCompleted: Bool = true

    // 核心数据模型
    @Published public var currentUser: User
    @Published public var lifePath: LifePath
    @Published public var courses: [Course]
    @Published public var scheduleSlots: [ScheduleSlot]
    @Published public var formativeAssessments: [FormativeAssessment]
    @Published public var grades: [Grade]
    @Published public var focusSessions: [FocusSession]
    @Published public var mentorMessages: [MentorMessage]
    @Published public var interestPillars: [InterestPillar]

    // 模态弹窗与编辑态控制
    @Published public var isFocusModalPresented: Bool = false
    @Published public var isNodeEditorPresented: Bool = false
    @Published public var editingNode: LifePathNode? = nil
    @Published public var activeContextTag: String? = nil

    public init() {
        let store = MockDataStore.shared
        self.currentUser = store.currentUser
        self.lifePath = store.lifePath
        self.courses = store.courses
        self.scheduleSlots = store.scheduleSlots
        self.formativeAssessments = store.formativeAssessments
        self.grades = store.grades
        self.focusSessions = store.focusSessions
        self.mentorMessages = store.mentorMessages
        self.interestPillars = store.interestPillars
    }

    // MARK: - 业务操作（人主导写操作）

    /// 用户在编辑器中保存/更新节点
    public func saveNode(_ node: LifePathNode) {
        var nodeToSave = node
        nodeToSave.source = .user // 用户确认后标记为 user 来源
        nodeToSave.updatedAt = ISO8601DateFormatter().string(from: Date())

        if let idx = lifePath.nodes.firstIndex(where: { $0.id == nodeToSave.id }) {
            lifePath.nodes[idx] = nodeToSave
        } else {
            lifePath.nodes.append(nodeToSave)
        }
        MockDataStore.shared.updateLifePathNode(nodeToSave)
        isNodeEditorPresented = false
        editingNode = nil
    }

    /// 用户直接切换节点状态（待定、进行中、已达成、已放弃）
    public func updateNodeStatus(nodeId: String, newStatus: LifePathNodeStatus) {
        if let idx = lifePath.nodes.firstIndex(where: { $0.id == nodeId }) {
            lifePath.nodes[idx].status = newStatus
            lifePath.nodes[idx].source = .user
            lifePath.nodes[idx].updatedAt = ISO8601DateFormatter().string(from: Date())
            if newStatus == .achieved {
                lifePath.nodes[idx].completedAt = ISO8601DateFormatter().string(from: Date())
            }
            MockDataStore.shared.updateLifePathNode(lifePath.nodes[idx])
        }
    }

    /// 删除节点
    public func deleteNode(nodeId: String) {
        lifePath.nodes.removeAll(where: { $0.id == nodeId || $0.parentId == nodeId })
        MockDataStore.shared.deleteLifePathNode(id: nodeId)
        isNodeEditorPresented = false
        editingNode = nil
    }

    /// 从导师建议卡采纳建议：桥接至用户编辑器，由用户亲手确认落地
    public func acceptMentorSuggestion(_ suggestion: MentorSuggestion) {
        // 标记建议卡为已采纳
        MockDataStore.shared.updateSuggestionStatus(id: suggestion.id, status: .accepted)
        if let idx = mentorMessages.firstIndex(where: { $0.suggestion?.id == suggestion.id }) {
            mentorMessages[idx].suggestion?.status = .accepted
        }

        // 构建预填节点
        let proposedNode = LifePathNode(
            id: UUID().uuidString,
            parentId: lifePath.nodes.first?.id,
            type: suggestion.targetNodeType ?? .shortTermGoal,
            title: suggestion.proposedNodeTitle ?? suggestion.title,
            description: suggestion.proposedNodeDescription ?? suggestion.text,
            status: .inProgress,
            source: .user,
            aiNote: "采纳自导师建议：\(suggestion.reason)"
        )

        // 跳转至 Tab 1 并拉起用户专属编辑器
        self.selectedTab = 0
        self.editingNode = proposedNode
        self.isNodeEditorPresented = true
    }

    /// 暂缓或拒绝建议
    public func updateSuggestionDecision(suggestionId: String, status: SuggestionStatus) {
        MockDataStore.shared.updateSuggestionStatus(id: suggestionId, status: status)
        if let idx = mentorMessages.firstIndex(where: { $0.suggestion?.id == suggestionId }) {
            mentorMessages[idx].suggestion?.status = status
        }
    }

    /// 从节点或日程时段一键“问导师”
    public func askMentorWithContext(contextTag: String, initialPrompt: String) {
        self.activeContextTag = contextTag
        self.selectedTab = 2 // 切换到导师 Tab

        let userMsg = MentorMessage(
            sender: "user",
            content: initialPrompt,
            relatedContextTag: contextTag
        )
        mentorMessages.append(userMsg)
        MockDataStore.shared.addMentorMessage(userMsg)

        // 异步获取导师回复
        Task {
            _ = try? await APIClient.shared.askMentor(question: initialPrompt, contextTag: contextTag)
            await MainActor.run {
                self.mentorMessages = MockDataStore.shared.mentorMessages
            }
        }
    }

    /// 完成一次专注打卡
    public func completeFocusSession(goal: String, durationMin: Int, reflection: String?) {
        let session = FocusSession(
            userId: currentUser.id,
            goalTitle: goal,
            startedAt: ISO8601DateFormatter().string(from: Date().addingTimeInterval(-Double(durationMin * 60))),
            endedAt: ISO8601DateFormatter().string(from: Date()),
            plannedDurationMin: durationMin,
            actualDurationMin: durationMin,
            status: .completed,
            reflectionNote: reflection
        )
        focusSessions.insert(session, at: 0)
        MockDataStore.shared.addFocusSession(session)
        isFocusModalPresented = false
    }
}
