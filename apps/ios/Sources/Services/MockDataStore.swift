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

    private init() {
        let userId = "user-bnds-001"

        // 1. 用户
        self.currentUser = User(
            id: userId,
            name: "张博宇",
            grade: 10,
            interests: ["cs", "math", "art", "robotics"]
        )

        // 2. 兴趣板块
        self.interestPillars = [
            InterestPillar(id: "cs", name: "计算机与AI", iconName: "cpu", description: "大模型、全栈开发与算法"),
            InterestPillar(id: "math", name: "数学与逻辑", iconName: "function", description: "高等数学、代数与数模"),
            InterestPillar(id: "art", name: "艺术与交互设计", iconName: "paintpalette.fill", description: "UI/UX、数字艺术与视觉表达"),
            InterestPillar(id: "robotics", name: "创客与机器人", iconName: "gearshape.2.fill", description: "VEX 机器人、机械设计与自动化"),
            InterestPillar(id: "humanities", name: "人文与社会探索", iconName: "character.book.closed.fill", description: "社会学、哲学思辨与写作"),
            InterestPillar(id: "athletics", name: "体能与户外运动", iconName: "figure.run", description: "飞盘、攀岩与体能挑战"),
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
                    status: .pending, // 待定：清晰可见一等公民
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
                    status: .pending, // 待定
                    order: 5,
                    source: .aiSuggest,
                    aiNote: "由导师在学业分析对话中启发提出"
                ),
                LifePathNode(
                    id: "node-task-1",
                    parentId: shortTerm1Id,
                    type: .task,
                    title: "完成微积分多变量极限章节探究报告",
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

        // 4. 课程
        self.courses = [
            Course(id: "c-math", name: "AP 微积分 (Calculus BC)", teacher: "王老师", room: "教学楼 A-301", dayOfWeek: 2, startTime: "08:00", endTime: "09:35", category: "required"),
            Course(id: "c-cs", name: "IB 计算机科学 HL", teacher: "李老师", room: "实验楼 C-204", dayOfWeek: 2, startTime: "09:55", endTime: "11:30", category: "required"),
            Course(id: "c-art", name: "现代艺术与人机交互设计", teacher: "陈老师", room: "艺术中心 B-102", dayOfWeek: 2, startTime: "13:30", endTime: "15:05", category: "elective"),
            Course(id: "c-eng", name: "学术英语写作与批判性阅读", teacher: "Sarah Johnson", room: "综合楼 D-405", dayOfWeek: 2, startTime: "15:25", endTime: "16:10", category: "required"),
            Course(id: "c-phy", name: "大学先修物理学", teacher: "赵老师", room: "实验楼 A-108", dayOfWeek: 3, startTime: "08:00", endTime: "09:35", category: "required")
        ]

        // 5. 日程时段
        let todayStr = "2026-08-25"
        self.scheduleSlots = [
            ScheduleSlot(id: "s-1", date: todayStr, startAt: "08:00", endAt: "09:35", courseId: "c-math", title: "AP 微积分 (Calculus BC)", subtitle: "王老师", room: "A-301", kind: .class),
            ScheduleSlot(id: "s-2", date: todayStr, startAt: "09:35", endAt: "09:55", title: "大课间休息 & 导师答疑", kind: .break),
            ScheduleSlot(id: "s-3", date: todayStr, startAt: "09:55", endAt: "11:30", courseId: "c-cs", title: "IB 计算机科学 HL", subtitle: "李老师", room: "C-204", kind: .class),
            ScheduleSlot(id: "s-4", date: todayStr, startAt: "11:30", endAt: "13:30", title: "午餐 & 图书馆阅览", kind: .break),
            ScheduleSlot(id: "s-5", date: todayStr, startAt: "13:30", endAt: "15:05", courseId: "c-art", title: "现代艺术与人机交互设计", subtitle: "陈老师", room: "B-102", kind: .class),
            ScheduleSlot(id: "s-6", date: todayStr, startAt: "15:25", endAt: "16:10", courseId: "c-eng", title: "学术英语写作与批判性阅读", subtitle: "Sarah Johnson", room: "D-405", kind: .class),
            ScheduleSlot(id: "s-7", date: todayStr, startAt: "16:30", endAt: "17:30", title: "放学后自主研修 · 深度专注", subtitle: "微积分作业与项目代码编写", room: "自习室 203", kind: .focus)
        ]

        // 6. 过程性评价
        self.formativeAssessments = [
            FormativeAssessment(
                id: "fa-1",
                userId: userId,
                courseId: "c-cs",
                courseName: "IB 计算机科学 HL",
                teacherName: "李老师",
                dimension: .project,
                gradeLevel: .excellent,
                comment: "自主编写的校园日程解析归一化工具表现惊艳，代码结构清晰，兼顾了异常处理与类型安全。"
            ),
            FormativeAssessment(
                id: "fa-2",
                userId: userId,
                courseId: "c-math",
                courseName: "AP 微积分 BC",
                teacherName: "王老师",
                dimension: .participation,
                gradeLevel: .excellent,
                comment: "在多变量极限与曲面切平面的研讨环节中主动提出创新解法，逻辑缜密。"
            ),
            FormativeAssessment(
                id: "fa-3",
                userId: userId,
                courseId: "c-art",
                courseName: "现代艺术与交互设计",
                teacherName: "陈老师",
                dimension: .homework,
                gradeLevel: .excellent,
                comment: "iOS 界面卡片与状态色调的微交互细节设计极具美感，符合人本设计原则。"
            ),
            FormativeAssessment(
                id: "fa-4",
                userId: userId,
                courseId: "c-eng",
                courseName: "学术英语写作",
                teacherName: "Sarah Johnson",
                dimension: .conduct,
                gradeLevel: .good,
                comment: "Essay 论点清晰，论据充分，后续可在学术词汇多样性上进一步拓展。"
            )
        ]

        // 7. 成绩
        self.grades = [
            Grade(id: "g-1", userId: userId, courseId: "c-cs", courseName: "IB 计算机科学 HL", examName: "阶段性项目机试", score: 98.0, examDate: "2026-10-12"),
            Grade(id: "g-2", userId: userId, courseId: "c-math", courseName: "AP 微积分 BC", examName: "期中阶段检测", score: 96.0, examDate: "2026-10-18"),
            Grade(id: "g-3", userId: userId, courseId: "c-art", courseName: "现代艺术与交互设计", examName: "中期原型大作业", score: 95.0, examDate: "2026-10-20"),
            Grade(id: "g-4", userId: userId, courseId: "c-phy", courseName: "大学先修物理学", examName: "力学单元综合考", score: 91.5, examDate: "2026-10-08")
        ]

        // 8. 专注历史
        self.focusSessions = [
            FocusSession(id: "f-1", userId: userId, goalTitle: "微积分作业与曲线探究", plannedDurationMin: 45, actualDurationMin: 45, status: .completed, reflectionNote: "效率极高，提前搞懂了切平面方程"),
            FocusSession(id: "f-2", userId: userId, goalTitle: "iOS 状态管理与数据流重构", plannedDurationMin: 60, actualDurationMin: 55, status: .completed, reflectionNote: "梳理通了 3-Tab 状态生命周期")
        ]

        // 9. 导师消息与结构化建议卡
        self.mentorMessages = [
            MentorMessage(
                id: "m-1",
                sender: "mentor",
                content: "你好博宇！我是你的学业与人生规划导师。在这里，我会基于你的日常课表、成长评价与人生路径提供个性化参考与分析。\n\n记住：我们共同探讨可能，但每一次规划与选择，**决定权始终由你自己拍板**。"
            ),
            MentorMessage(
                id: "m-2",
                sender: "user",
                content: "我最近在准备微积分探究报告，同时也在开发校园助手 iOS 端，时间感觉有点紧，下周目标该怎么平衡？"
            ),
            MentorMessage(
                id: "m-3",
                sender: "mentor",
                content: "我分析了你近期的评价、成绩和日程安排：你的微积分当前保持 96 分且课堂评价卓越，说明基础非常扎实。反而是放学后的碎片时间可以更好地利用专注窗口聚焦在代码开发上。",
                suggestion: MentorSuggestion(
                    id: "sug-1",
                    title: "将【微积分探究报告可视化】合并到今天下午 16:30 专注时段",
                    text: "建议今天下午 16:30 的专注时段前 30 分钟锁定微积分 Python 绘图，后 30 分钟进行 iOS 原型联调。",
                    reason: "依据：今日下午有整段 60 分钟专注窗口；且两者均涉及计算机技能，结合执行心流更连贯，能有效减轻周五压力。",
                    targetNodeType: .task,
                    proposedNodeTitle: "完成微积分可视化与 iOS 联调",
                    proposedNodeDescription: "在 16:30 专注窗口内高效推进",
                    source: "ai_suggest",
                    status: .pendingReview
                ),
                relatedContextTag: "学业与项目精力平衡"
            )
        ]
    }

    // MARK: - 业务操作方法（仅用户可直接修改状态）

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
