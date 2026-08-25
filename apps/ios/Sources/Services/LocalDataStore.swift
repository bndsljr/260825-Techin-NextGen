import Foundation

/// 本地持久化包装实体
public struct LocalStorePayload: Codable {
    public var user: User
    public var lifePath: LifePath
    public var formativeAssessments: [FormativeAssessment]
    public var grades: [Grade]
    public var focusSessions: [FocusSession]
    public var mentorMessages: [MentorMessage]?

    enum CodingKeys: String, CodingKey {
        case user
        case lifePath = "life_path"
        case formativeAssessments = "formative_assessments"
        case grades
        case focusSessions = "focus_sessions"
        case mentorMessages = "mentor_messages"
    }
}

/// 本地 JSON 文件数据中心（无需后端服务，完全本地持久化与读写）
public final class LocalDataStore: @unchecked Sendable {
    public static let shared = LocalDataStore()

    public private(set) var currentUser: User
    public private(set) var lifePath: LifePath
    public private(set) var courses: [Course]
    public private(set) var scheduleSlots: [ScheduleSlot]
    public private(set) var formativeAssessments: [FormativeAssessment]
    public private(set) var grades: [Grade]
    public private(set) var focusSessions: [FocusSession]
    public private(set) var mentorMessages: [MentorMessage]
    public private(set) var interestPillars: [InterestPillar]
    public private(set) var lastSyncedAt: String

    private static var fileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent("bnds_store.json")
    }

    private init() {
        self.interestPillars = [
            InterestPillar(id: "cs", name: "计算机与AI", iconName: "cpu", description: "大模型、全栈开发与算法"),
            InterestPillar(id: "stem", name: "科创与工程", iconName: "gearshape.2.fill", description: "容光楼工坊、创客制作与智能硬件"),
            InterestPillar(id: "math", name: "数学与逻辑", iconName: "function", description: "数学Ⅲ、空间解析几何与数模"),
            InterestPillar(id: "athletics", name: "体能与运动", iconName: "figure.run", description: "皮划艇水上运动、体能进阶"),
            InterestPillar(id: "art", name: "艺术与交互", iconName: "paintpalette.fill", description: "UI/UX、数字艺术与原型设计"),
            InterestPillar(id: "robotics", name: "机器人社团", iconName: "antenna.radiowaves.left.and.right", description: "VEX 机器人与自主导航"),
            InterestPillar(id: "humanities", name: "人文与社会", iconName: "character.book.closed.fill", description: "社会学、哲学思辨与学术写作")
        ]

        // 加载真实 32 节云平台课表
        let cloudData = CloudIngestService.shared.loadCloudTimetable()
        self.courses = cloudData.courses
        self.scheduleSlots = cloudData.slots
        self.lastSyncedAt = "刚刚"

        let targetURL = Self.fileURL
        if let data = try? Data(contentsOf: targetURL),
           let payload = try? JSONDecoder().decode(LocalStorePayload.self, from: data) {
            self.currentUser = payload.user
            self.lifePath = payload.lifePath
            self.formativeAssessments = payload.formativeAssessments
            self.grades = payload.grades
            self.focusSessions = payload.focusSessions
            self.mentorMessages = payload.mentorMessages ?? Self.defaultMentorMessages()
            return
        }

        // 默认初始化李佳睿真实数据
        let userId = "c60bf0e8-29c1-4531-854e-c17eb9efbd1a"
        self.currentUser = User(
            id: userId,
            name: "李佳睿",
            grade: 10,
            studyCode: "26111422",
            studentId: userId,
            schoolPeriodName: "2026-2027学年上学期",
            interests: ["cs", "stem", "athletics", "robotics"]
        )

        let visionId = "node-vision-1"
        let longTerm1Id = "node-lt-1"
        let longTerm2Id = "node-lt-2"
        let shortTerm1Id = "node-st-1"

        self.lifePath = LifePath(
            id: "path-001",
            userId: userId,
            title: "高一至高三全景探索与规划",
            nodes: [
                LifePathNode(
                    id: visionId,
                    type: .vision,
                    title: "成为兼具工程落地能力与跨学科创造力的科技创造者",
                    description: "依托十一学校丰富的选修课程与工坊资源，兼顾算法深度与工程实现。",
                    status: .inProgress,
                    order: 0,
                    source: .user
                ),
                LifePathNode(
                    id: longTerm1Id,
                    parentId: visionId,
                    type: .longTermGoal,
                    title: "高二下学期前在容光楼工坊完成「工程-创意万物造」软硬件一体化创新项目",
                    description: "结合微控制器、传感器与交互软件，做出能解决真实校园场景痛点的作品。",
                    status: .inProgress,
                    order: 1,
                    source: .user
                ),
                LifePathNode(
                    id: longTerm2Id,
                    parentId: visionId,
                    type: .longTermGoal,
                    title: "高三前确定大学理工与跨学科探索方向（计算机工程 + 智能制造）",
                    description: "目前在纯软件算法与软硬件结合方向之间探索，细分申请方向待定。",
                    status: .pending,
                    order: 2,
                    source: .user,
                    aiNote: "导师提示：可在高一暑假参加高校科研夏令营实地体验"
                ),
                LifePathNode(
                    id: shortTerm1Id,
                    parentId: longTerm1Id,
                    type: .shortTermGoal,
                    title: "高一上学期系统掌握数学Ⅲ-4、物理ⅢA-2 核心模型并应用于工程实践",
                    description: "筑牢理科数理底座，为后续算法设计与受力分析打下坚实基础。",
                    status: .inProgress,
                    order: 3,
                    source: .user
                ),
                LifePathNode(
                    id: "node-st-2",
                    parentId: longTerm1Id,
                    type: .shortTermGoal,
                    title: "在周五容光楼工坊实践中完成自主避障机器人软硬件搭建与调试",
                    description: "利用周五下午 3 节连堂时间，完成底盘机械结构安装与控制板烧录。",
                    status: .achieved,
                    order: 4,
                    source: .user
                ),
                LifePathNode(
                    id: "node-st-3",
                    parentId: longTerm2Id,
                    type: .shortTermGoal,
                    title: "高一下学期选修与国际竞赛申报方向探索",
                    description: "评估学科竞赛与科研项目的时间精力分配，视期末成绩再做最终定夺。",
                    status: .pending,
                    order: 5,
                    source: .aiSuggest,
                    aiNote: "由导师在学业分析对话中启发提出"
                ),
                LifePathNode(
                    id: "node-task-1",
                    parentId: shortTerm1Id,
                    type: .task,
                    title: "完成数学Ⅲ-4 空间曲面方程解析与课堂微汇报",
                    description: "准备周三第 6 节数学课堂的交互演示与结论陈述。",
                    status: .inProgress,
                    order: 6,
                    source: .user
                ),
                LifePathNode(
                    id: "node-task-2",
                    parentId: shortTerm1Id,
                    type: .task,
                    title: "整理周五「工程-创意万物造-1」容光楼T109 工坊工具清单与物料",
                    description: "提前备齐电机驱动模块、杜邦线与 3D 打印结构件。",
                    status: .inProgress,
                    order: 7,
                    source: .user
                )
            ]
        )

        self.formativeAssessments = [
            FormativeAssessment(
                id: "fa-1",
                userId: userId,
                courseId: "course-cloud-sx-1",
                courseName: "数学Ⅲ-4",
                teacherName: "十一名师",
                dimension: .project,
                gradeLevel: .excellent,
                comment: "空间解析几何与曲面切线推导逻辑清晰，课堂研讨中多次提出独到证明思路，探究报告结构严密。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-2",
                userId: userId,
                courseId: "course-cloud-gc-51",
                courseName: "工程-创意万物造-1",
                teacherName: "工坊导师",
                dimension: .homework,
                gradeLevel: .excellent,
                comment: "在容光楼T109 工坊实践中表现出极强的工程动手与结构装配能力，电路走线规范，调试效率高。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-3",
                userId: userId,
                courseId: "course-cloud-wl-1",
                courseName: "物理ⅢA-2",
                teacherName: "十一名师",
                dimension: .participation,
                gradeLevel: .excellent,
                comment: "电磁场与力学实验数据采集严谨，实验报告误差分析详实准确，善于从物理本质思考问题。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-4",
                userId: userId,
                courseId: "course-cloud-pht-2",
                courseName: "皮划艇-6",
                teacherName: "体育教练",
                dimension: .conduct,
                gradeLevel: .good,
                comment: "水上平衡与划桨节奏控制进步明显，训练中展现出优秀的体能韧性与团队协作默契。",
                source: "cloud"
            )
        ]

        self.grades = [
            Grade(id: "g-1", userId: userId, courseId: "course-cloud-sx-1", courseName: "数学Ⅲ-4", examName: "阶段性检测", score: 97.5, examDate: "2026-10-15", source: "cloud"),
            Grade(id: "g-2", userId: userId, courseId: "course-cloud-wl-1", courseName: "物理ⅢA-2", examName: "单元实验与测验", score: 96.0, examDate: "2026-10-18", source: "cloud"),
            Grade(id: "g-3", userId: userId, courseId: "course-cloud-hx-1", courseName: "化学ⅡA-7", examName: "阶段实验报告考评", score: 94.5, examDate: "2026-10-22", source: "cloud"),
            Grade(id: "g-4", userId: userId, courseId: "course-cloud-sw-2", courseName: "生物ⅡA-4", examName: "探究综合考", score: 93.0, examDate: "2026-10-25", source: "cloud")
        ]

        self.focusSessions = [
            FocusSession(id: "f-1", userId: userId, goalTitle: "数学Ⅲ-4 空间曲面方程推导与习题", plannedDurationMin: 45, actualDurationMin: 45, status: .completed, reflectionNote: "专注度很高，攻克了多元函数最值判别条件"),
            FocusSession(id: "f-2", userId: userId, goalTitle: "工程创意项目电路原理图与结构设计", plannedDurationMin: 60, actualDurationMin: 55, status: .completed, reflectionNote: "完成了容光楼工坊主板驱动排线规划")
        ]

        self.mentorMessages = Self.defaultMentorMessages()
        self.saveToLocalDisk()
    }

    private static func defaultMentorMessages() -> [MentorMessage] {
        return [
            MentorMessage(
                id: "m-1",
                sender: "mentor",
                content: "你好佳睿！我是你的学业与人生规划导师（由 DeepSeek 大模型驱动）。已为你接入**十一学校云平台**（共同步 32 节周课表及 2026-2027学年上学期 学业档案）。\n\n请记住：我们共同探讨学业与未来可能，但每一次规划与选择，**决定权始终由你自己拍板**。"
            ),
            MentorMessage(
                id: "m-2",
                sender: "user",
                content: "我看到周五下午有连续 3 节【工程-创意万物造-1】（容光楼T109），该怎么高效利用这段时间？"
            ),
            MentorMessage(
                id: "m-3",
                sender: "mentor",
                content: "云平台课表显示你周五 14:25 - 18:00 为整段工程选修时段（容光楼T109）。这非常适合整块时间进行原型动手实践，建议将前期的理论调研与元件采购安排在周二或周三的自习时段。",
                suggestion: MentorSuggestion(
                    id: "sug-1",
                    title: "将【创意万物造工坊实践】集中于周五下午工程时段",
                    text: "利用周五 14:25 - 18:00 的容光楼实验工坊，集中完成硬件装配与控制算法联调。",
                    reason: "依据：云平台显示周五下午为 3 节连堂实践课，整块时间更易进入心流。",
                    targetNodeType: .task,
                    proposedNodeTitle: "容光楼工程工坊实践",
                    proposedNodeDescription: "周五下午集中推进原型装配与调试",
                    source: "ai_suggest",
                    status: .pendingReview
                ),
                relatedContextTag: "周五工程课表规划"
            )
        ]
    }

    // MARK: - 持久化落盘与业务更新

    public func saveToLocalDisk() {
        let payload = LocalStorePayload(
            user: currentUser,
            lifePath: lifePath,
            formativeAssessments: formativeAssessments,
            grades: grades,
            focusSessions: focusSessions,
            mentorMessages: mentorMessages
        )
        if let data = try? JSONEncoder().encode(payload) {
            try? data.write(to: Self.fileURL, options: .atomic)
        }
    }

    public func updateLifePathNode(_ updatedNode: LifePathNode) {
        if let idx = lifePath.nodes.firstIndex(where: { $0.id == updatedNode.id }) {
            lifePath.nodes[idx] = updatedNode
            saveToLocalDisk()
        }
    }

    public func addLifePathNode(_ newNode: LifePathNode) {
        lifePath.nodes.append(newNode)
        saveToLocalDisk()
    }

    public func deleteLifePathNode(id: String) {
        lifePath.nodes.removeAll(where: { $0.id == id || $0.parentId == id })
        saveToLocalDisk()
    }

    public func addFocusSession(_ session: FocusSession) {
        focusSessions.insert(session, at: 0)
        saveToLocalDisk()
    }

    public func addMentorMessage(_ message: MentorMessage) {
        mentorMessages.append(message)
        saveToLocalDisk()
    }

    public func updateSuggestionStatus(id: String, status: SuggestionStatus) {
        for idx in 0..<mentorMessages.count {
            if mentorMessages[idx].suggestion?.id == id {
                mentorMessages[idx].suggestion?.status = status
            }
        }
        saveToLocalDisk()
    }

    public func updateUserInterests(_ interests: [String]) {
        currentUser.interests = interests
        saveToLocalDisk()
    }

    public func syncFromCloudPlatform() {
        let cloudData = CloudIngestService.shared.loadCloudTimetable()
        self.courses = cloudData.courses
        self.scheduleSlots = cloudData.slots
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        self.lastSyncedAt = formatter.string(from: Date())
        saveToLocalDisk()
    }
}
