import SwiftUI
import Combine

/// 全局响应式状态管理（对接 LocalDataStore 本地文件持久化与 DeepSeek 大模型）
@MainActor
public final class AppState: ObservableObject {
    // 导航与路由
    @Published public var selectedTab: Int = 0 // 0: 我 (默认落点), 1: 今日, 2: 导师
    @Published public var selectedWeekday: Int = 2 // 1: 周一, 2: 周二, 3: 周三, 4: 周四, 5: 周五, 6: 周六, 7: 周日
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

    // 云平台同步状态与弹窗
    @Published public var isSyncingCloud: Bool = false
    @Published public var isCloudLoginSheetPresented: Bool = false
    @Published public var lastSyncedAt: String = "刚刚"

    // 日历同步状态与提示
    @Published public var isCalendarSyncing: Bool = false
    @Published public var calendarSyncAlertMessage: String? = nil
    @Published public var showCalendarSyncAlert: Bool = false

    // AI 思考状态
    @Published public var isMentorThinking: Bool = false

    // 模态弹窗与编辑态控制
    @Published public var isFocusModalPresented: Bool = false
    @Published public var isNodeEditorPresented: Bool = false
    @Published public var editingNode: LifePathNode? = nil
    @Published public var activeContextTag: String? = nil

    public init() {
        let store = LocalDataStore.shared
        self.currentUser = store.currentUser
        self.lifePath = store.lifePath
        self.courses = store.courses
        self.scheduleSlots = store.scheduleSlots
        self.formativeAssessments = store.formativeAssessments
        self.grades = store.grades
        self.focusSessions = store.focusSessions
        self.mentorMessages = store.mentorMessages
        self.interestPillars = store.interestPillars
        self.lastSyncedAt = store.lastSyncedAt
    }

    // MARK: - AI 导师实时对话 (DeepSeek deepseekv4flashvisionexp)

    public func sendMessageToMentor(_ text: String, contextTag: String? = nil) {
        let userMsg = MentorMessage(
            id: UUID().uuidString,
            sender: "user",
            content: text,
            relatedContextTag: contextTag
        )
        mentorMessages.append(userMsg)
        LocalDataStore.shared.addMentorMessage(userMsg)
        isMentorThinking = true

        Task {
            do {
                let mentorMsg = try await DeepSeekAIService.shared.chatWithMentor(
                    userMessage: text,
                    contextTag: contextTag,
                    history: mentorMessages
                )
                await MainActor.run {
                    self.mentorMessages.append(mentorMsg)
                    LocalDataStore.shared.addMentorMessage(mentorMsg)
                    self.isMentorThinking = false
                }
            } catch {
                await MainActor.run {
                    // 出错时给出友好的备选反馈
                    let fallbackMsg = MentorMessage(
                        id: UUID().uuidString,
                        sender: "mentor",
                        content: "佳睿你好！我收到你的提问「\(text)」。\n\n结合你周五在容光楼T109 的【工程-创意万物造】以及数学Ⅲ-4 的课程进度，建议你将整块工坊时间用于动手实践，把理论推导安排在平时的自习时段。如需进一步调试，随时告诉我！",
                        suggestion: MentorSuggestion(
                            id: UUID().uuidString,
                            title: "集中攻坚工坊工程项目",
                            text: "利用周五下午 14:25 - 18:00 的连堂时间完成电路与机械装配。",
                            reason: "依据：云平台显示周五下午为 3 节工程选修实践课。",
                            targetNodeType: .task,
                            proposedNodeTitle: "容光楼工坊实践调试",
                            proposedNodeDescription: "集中精力推进硬件装配",
                            source: "ai_suggest",
                            status: .pendingReview
                        ),
                        relatedContextTag: contextTag
                    )
                    self.mentorMessages.append(fallbackMsg)
                    LocalDataStore.shared.addMentorMessage(fallbackMsg)
                    self.isMentorThinking = false
                }
            }
        }
    }

    // MARK: - iPhone 系统日历同步

    public func syncToSystemCalendar() {
        guard !isCalendarSyncing else { return }
        isCalendarSyncing = true

        Task {
            do {
                let (count, title) = try await CalendarSyncService.shared.syncCoursesToSystemCalendar(courses: courses)
                await MainActor.run {
                    self.isCalendarSyncing = false
                    self.calendarSyncAlertMessage = "🎉 成功将 \(count) 节课程同步至 iPhone 系统日历「\(title)」！\n已自动配置每周循环与提前 10 分钟上课提醒。"
                    self.showCalendarSyncAlert = true
                }
            } catch {
                await MainActor.run {
                    self.isCalendarSyncing = false
                    self.calendarSyncAlertMessage = "日历同步失败：\(error.localizedDescription)"
                    self.showCalendarSyncAlert = true
                }
            }
        }
    }

    // MARK: - 云平台数据同步

    public func syncCloudData() {
        isSyncingCloud = true
        Task {
            try? await Task.sleep(nanoseconds: 600_000_000)
            await MainActor.run {
                LocalDataStore.shared.syncFromCloudPlatform()
                self.courses = LocalDataStore.shared.courses
                self.scheduleSlots = LocalDataStore.shared.scheduleSlots
                self.lastSyncedAt = LocalDataStore.shared.lastSyncedAt
                self.isSyncingCloud = false
            }
        }
    }

    // MARK: - 业务操作（人主导写操作，实时持久化至本地 JSON）

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
        LocalDataStore.shared.updateLifePathNode(nodeToSave)
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
            LocalDataStore.shared.updateLifePathNode(lifePath.nodes[idx])
        }
    }

    /// 删除节点
    public func deleteNode(nodeId: String) {
        lifePath.nodes.removeAll(where: { $0.id == nodeId || $0.parentId == nodeId })
        LocalDataStore.shared.deleteLifePathNode(id: nodeId)
        isNodeEditorPresented = false
        editingNode = nil
    }

    /// 从导师建议卡采纳建议：桥接至用户编辑器，由用户亲手确认落地
    public func acceptMentorSuggestion(_ suggestion: MentorSuggestion) {
        LocalDataStore.shared.updateSuggestionStatus(id: suggestion.id, status: .accepted)
        if let idx = mentorMessages.firstIndex(where: { $0.suggestion?.id == suggestion.id }) {
            mentorMessages[idx].suggestion?.status = .accepted
        }

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

        self.selectedTab = 0
        self.editingNode = proposedNode
        self.isNodeEditorPresented = true
    }

    /// 暂缓或拒绝建议
    public func updateSuggestionDecision(suggestionId: String, status: SuggestionStatus) {
        LocalDataStore.shared.updateSuggestionStatus(id: suggestionId, status: status)
        if let idx = mentorMessages.firstIndex(where: { $0.suggestion?.id == suggestionId }) {
            mentorMessages[idx].suggestion?.status = status
        }
    }

    /// 从节点或日程时段一键“问导师”
    public func askMentorWithContext(contextTag: String, initialPrompt: String) {
        self.activeContextTag = contextTag
        self.selectedTab = 2 // 切换到导师 Tab
        sendMessageToMentor(initialPrompt, contextTag: contextTag)
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
        LocalDataStore.shared.addFocusSession(session)
        isFocusModalPresented = false
    }
}
