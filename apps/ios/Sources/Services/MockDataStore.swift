import Foundation

/// 十一校园高保真 Mock 数据中心与离线仓库
public final class MockDataStore: @unchecked Sendable {
    public static let shared = MockDataStore()

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

    private init() {
        let userId = "user-bnds-001"

        // 1. 用户（结合云平台档案）
        self.currentUser = User(
            id: userId,
            name: "张博宇",
            grade: 10,
            studyCode: "26111422",
            studentId: "c60bf0e8-29c1-4531-854e-c17eb9efbd1a",
            schoolPeriodName: "2026-2027学年上学期",
            interests: ["cs", "math", "art", "robotics"]
        )

        // 2. 兴趣板块
        self.interestPillars = [
            InterestPillar(id: "cs", name: "计算机与AI", iconName: "cpu", description: "大模型、全栈开发与算法"),
            InterestPillar(id: "math", name: "数学与逻辑", iconName: "function", description: "高等数学、代数与数模"),
            InterestPillar(id: "art", name: "艺术与交互设计", iconName: "paintpalette.fill", description: "UI/UX、数字艺术与视觉表达"),
            InterestPillar(id: "robotics", name: "创客与机器人", iconName: "gearshape.2.fill", description: "VEX 机器人、机械设计与自动化"),
            InterestPillar(id: "humanities", name: "人文与社会探索", iconName: "character.book.closed.fill", description: "社会学、哲学思辨与写作"),
            InterestPillar(id: "athletics", name: "体能与户外运动", iconName: "figure.run", description: "飞盘、攀岩、皮划艇水上运动"),
            InterestPillar(id: "global", name: "全球视野与未来", iconName: "globe.asia.australia.fill", description: "国际交流、模拟联合国与跨文化")
        ]

        // 3. 人生路径（产品灵魂）
        let visionId = "node-vision-1"
        let longTerm1Id = "node-lt-1"
        let longTerm2Id = "node-lt-2"
        let shortTerm1Id = "node-st-1"
        let shortTerm2Id = "node-st-2"
        let shortTerm3Id = "node-st-3"

        self.lifePath = LifePath(
            id: "path-001",
            userId: userId,
            title: "高一至高三全景探索与规划",
            nodes: [
                LifePathNode(
                    id: visionId,
                    type: .vision,
                    title: "成为能用科技与设计解决真实问题的创造者",
                    description: "保持对交叉学科的好奇心，兼顾工程落地与审美素养。",
                    status: .inProgress,
                    order: 0,
                    source: .user
                ),
                LifePathNode(
                    id: longTerm1Id,
                    parentId: visionId,
                    type: .longTermGoal,
                    title: "高二下学期前完成端到端 AI 校园辅助应用并开源",
                    description: "整合校内多平台数据，在真实校园环境中部署服务 BNDS 同学。",
                    status: .inProgress,
                    order: 1,
                    source: .user
                ),
                LifePathNode(
                    id: longTerm2Id,
                    parentId: visionId,
                    type: .longTermGoal,
                    title: "高三前确定跨学科大学申请方向 (CS + HCI 人机交互)",
                    description: "目前在纯算法研究与人机交互产品之间探索，待定细分方向。",
                    status: .pending,
                    order: 2,
                    source: .user,
                    aiNote: "导师提示：高二寒假可对比两类实验室的研究风格"
                ),
                LifePathNode(
                    id: shortTerm1Id,
                    parentId: longTerm1Id,
                    type: .shortTermGoal,
                    title: "本学期掌握 SwiftUI 与 Agent 编排，完成端侧原型",
                    description: "打通 3-Tab 人为主导界面与结构化建议卡片。",
                    status: .inProgress,
                    order: 3,
                    source: .user
                ),
                LifePathNode(
                    id: shortTerm2Id,
                    parentId: longTerm1Id,
                    type: .shortTermGoal,
                    title: "加入学校 VEX 机器人社团软件算法组",
                    description: "负责机器人自主导航路径规划模块。",
                    status: .achieved,
                    order: 4,
                    source: .user
                ),
                LifePathNode(
                    id: shortTerm3Id,
                    parentId: longTerm2Id,
                    type: .shortTermGoal,
                    title: "申请 Stanford 在线学者计划 (SPICE)",
                    description: "准备文书与学术推荐信，视期末考试复习节奏再定是否投递。",
                    status: .pending,
                    order: 5,
                    source: .aiSuggest,
                    aiNote: "由导师在学业分析对话中启发提出"
                ),
                LifePathNode(
                    id: "node-task-1",
                    parentId: shortTerm1Id,
                    type: .task,
                    title: "完成数学Ⅲ-4 多变量函数探究报告",
                    description: "结合 Python 可视化曲线曲面，准备课堂陈述。",
                    status: .inProgress,
                    order: 6,
                    source: .user
                ),
                LifePathNode(
                    id: "node-task-2",
                    parentId: shortTerm1Id,
                    type: .task,
                    title: "调试 iOS 专注模式倒计时与白噪音模块",
                    description: "支持番茄钟与打卡记录沉淀至成长账本。",
                    status: .inProgress,
                    order: 7,
                    source: .user
                )
            ]
        )

        // 4. 课表与日程时段（从云平台真实 32 节课导入）
        let cloudData = CloudIngestService.shared.loadCloudTimetable()
        self.courses = cloudData.courses
        self.scheduleSlots = cloudData.slots
        self.lastSyncedAt = "刚刚"

        // 5. 过程性评价
        self.formativeAssessments = [
            FormativeAssessment(
                id: "fa-1",
                userId: userId,
                courseId: "course-cloud-sx-1",
                courseName: "数学Ⅲ-4",
                teacherName: "数学教师",
                dimension: .project,
                gradeLevel: .excellent,
                comment: "在多变量极限与曲面切平面的研讨环节中主动提出创新解法，逻辑缜密。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-2",
                userId: userId,
                courseId: "course-cloud-wl-1",
                courseName: "物理ⅢA-2",
                teacherName: "物理教师",
                dimension: .participation,
                gradeLevel: .excellent,
                comment: "实验动手能力强，电磁场仿真数据分析严谨准确。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-3",
                userId: userId,
                courseId: "course-cloud-gc-51",
                courseName: "工程-创意万物造-1",
                teacherName: "工程导师",
                dimension: .homework,
                gradeLevel: .excellent,
                comment: "iOS 界面卡片与状态色调的微交互细节设计极具美感，符合人本设计原则。",
                source: "cloud"
            ),
            FormativeAssessment(
                id: "fa-4",
                userId: userId,
                courseId: "course-cloud-yy-1",
                courseName: "高中英语Ⅱ-a3",
                teacherName: "英语教师",
                dimension: .conduct,
                gradeLevel: .good,
                comment: "Essay 论点清晰，论据充分，学术交流表达流利。",
                source: "cloud"
            )
        ]

        // 6. 成绩记录
        self.grades = [
            Grade(id: "g-1", userId: userId, courseId: "course-cloud-sx-1", courseName: "数学Ⅲ-4", examName: "阶段性检测", score: 98.0, source: "cloud"),
            Grade(id: "g-2", userId: userId, courseId: "course-cloud-wl-1", courseName: "物理ⅢA-2", examName: "单元实验与测验", score: 96.0, source: "cloud"),
            Grade(id: "g-3", userId: userId, courseId: "course-cloud-hx-1", courseName: "化学ⅡA-7", examName: "期中大作业", score: 95.0, source: "cloud"),
            Grade(id: "g-4", userId: userId, courseId: "course-cloud-sw-2", courseName: "生物ⅡA-4", examName: "探究综合考", score: 92.5, source: "cloud")
        ]

        // 7. 专注历史
        self.focusSessions = [
            FocusSession(id: "f-1", userId: userId, goalTitle: "数学作业与曲线探究", plannedDurationMin: 45, actualDurationMin: 45, status: .completed, reflectionNote: "效率极高，提前搞懂了切平面方程"),
            FocusSession(id: "f-2", userId: userId, goalTitle: "iOS 云平台课表数据流对接", plannedDurationMin: 60, actualDurationMin: 55, status: .completed, reflectionNote: "打通了云平台 32 节课星期时间轴")
        ]

        // 8. 导师消息与结构化建议卡
        self.mentorMessages = [
            MentorMessage(
                id: "m-1",
                sender: "mentor",
                content: "你好博宇！我是你的学业与人生规划导师。已为你接入**十一学校云平台**（共同步 32 节课程及学业档案）。\n\n记住：我们共同探讨可能，但每一次规划与选择，**决定权始终由你自己拍板**。"
            ),
            MentorMessage(
                id: "m-2",
                sender: "user",
                content: "我看到周五下午有连续的【工程-创意万物造】，下周时间该怎么规划？"
            ),
            MentorMessage(
                id: "m-3",
                sender: "mentor",
                content: "云平台课表显示你周五 14:25 - 18:00 为整段工程选修时段（容光楼T109）。这非常适合整块时间进行原型动手实践，建议将前期的理论调研安排在周二或周三的自习时段。",
                suggestion: MentorSuggestion(
                    id: "sug-1",
                    title: "将【创意万物造项目开发】集中于周五下午工程时段",
                    text: "利用周五 14:25 - 18:00 的容光楼实验工坊，集中完成硬件装配与界面原型联调。",
                    reason: "依据：云平台显示周五下午为 3 节连堂实践课，整块时间更易进入心流。",
                    targetNodeType: .task,
                    proposedNodeTitle: "容光楼工程工坊实践",
                    proposedNodeDescription: "周五下午集中推进原型",
                    source: "ai_suggest",
                    status: .pendingReview
                ),
                relatedContextTag: "周五工程课表规划"
            )
        ]
    }

    // MARK: - 业务操作方法

    public func syncFromCloudPlatform() {
        let cloudData = CloudIngestService.shared.loadCloudTimetable()
        self.courses = cloudData.courses
        self.scheduleSlots = cloudData.slots
        let formatter = DateFormatter()
        formatter.dateFormat = "HH:mm"
        self.lastSyncedAt = formatter.string(from: Date())
    }

    public func updateLifePathNode(_ updatedNode: LifePathNode) {
        if let idx = lifePath.nodes.firstIndex(where: { $0.id == updatedNode.id }) {
            lifePath.nodes[idx] = updatedNode
        }
    }

    public func addLifePathNode(_ newNode: LifePathNode) {
        lifePath.nodes.append(newNode)
    }

    public func deleteLifePathNode(id: String) {
        lifePath.nodes.removeAll(where: { $0.id == id })
    }

    public func addFocusSession(_ session: FocusSession) {
        focusSessions.insert(session, at: 0)
    }

    public func addMentorMessage(_ message: MentorMessage) {
        mentorMessages.append(message)
    }

    public func updateSuggestionStatus(id: String, status: SuggestionStatus) {
        for idx in 0..<mentorMessages.count {
            if mentorMessages[idx].suggestion?.id == id {
                mentorMessages[idx].suggestion?.status = status
            }
        }
    }

    public func updateUserInterests(_ interests: [String]) {
        currentUser.interests = interests
    }
}
