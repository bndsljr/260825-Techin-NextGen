import Foundation

/// 统一数据模型 - 人生路径 (LifePath)
/// 对齐 docs/data-model.md § 2.2
public struct LifePath: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public var title: String
    public var nodes: [LifePathNode]
    public var status: String
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String = UUID().uuidString,
        userId: String,
        title: String = "我的高中三年",
        nodes: [LifePathNode] = [],
        status: String = "active",
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.userId = userId
        self.title = title
        self.nodes = nodes
        self.status = status
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case title
        case nodes
        case status
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// 路径节点类型
public enum LifePathNodeType: String, Codable, CaseIterable, Sendable {
    case vision = "vision"                     // 人生愿景 / 宏观方向
    case longTermGoal = "long_term_goal"       // 长期目标 (1-3年)
    case shortTermGoal = "short_term_goal"     // 短期目标 (学期/月度)
    case task = "task"                         // 具体执行任务
    case interest = "interest"                 // 兴趣探索
    case note = "note"                         // 思考笔记

    public var displayName: String {
        switch self {
        case .vision: return "愿景"
        case .longTermGoal: return "长期目标"
        case .shortTermGoal: return "短期目标"
        case .task: return "行动任务"
        case .interest: return "兴趣领域"
        case .note: return "成长手记"
        }
    }

    public var iconName: String {
        switch self {
        case .vision: return "sparkles"
        case .longTermGoal: return "mountain.2.fill"
        case .shortTermGoal: return "flag.fill"
        case .task: return "checkmark.circle"
        case .interest: return "heart.fill"
        case .note: return "note.text"
        }
    }
}

/// 节点状态 - 严格遵循“待定是一等公民”原则
public enum LifePathNodeStatus: String, Codable, CaseIterable, Sendable {
    case inProgress = "in_progress"  // 进行中
    case achieved = "achieved"        // 已达成
    case pending = "pending"          // 待定（允许任意位置待定）
    case abandoned = "abandoned"      // 已放弃/调整

    public var displayName: String {
        switch self {
        case .inProgress: return "进行中"
        case .achieved: return "已达成"
        case .pending: return "待定"
        case .abandoned: return "已放弃"
        }
    }

    public var iconName: String {
        switch self {
        case .inProgress: return "arrow.triangle.2.circlepath"
        case .achieved: return "checkmark.seal.fill"
        case .pending: return "questionmark.circle.dashed"
        case .abandoned: return "xmark.circle"
        }
    }
}

/// 节点来源
public enum LifePathNodeSource: String, Codable, Sendable {
    case user = "user"                // 用户沉淀/亲自确认
    case aiSuggest = "ai_suggest"     // AI 建议草案（必须用户确认后转为 user）
}

/// 统一数据模型 - 人生路径节点 (LifePathNode)
/// 对齐 docs/data-model.md § 2.3
public struct LifePathNode: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var parentId: String?
    public var type: LifePathNodeType
    public var title: String
    public var description: String
    public var status: LifePathNodeStatus
    public var startAt: String?
    public var dueAt: String?
    public var completedAt: String?
    public var order: Int
    public var source: LifePathNodeSource
    public var aiNote: String?
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String = UUID().uuidString,
        parentId: String? = nil,
        type: LifePathNodeType,
        title: String,
        description: String = "",
        status: LifePathNodeStatus = .inProgress,
        startAt: String? = nil,
        dueAt: String? = nil,
        completedAt: String? = nil,
        order: Int = 0,
        source: LifePathNodeSource = .user,
        aiNote: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.parentId = parentId
        self.type = type
        self.title = title
        self.description = description
        self.status = status
        self.startAt = startAt
        self.dueAt = dueAt
        self.completedAt = completedAt
        self.order = order
        self.source = source
        self.aiNote = aiNote
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case parentId = "parent_id"
        case type
        case title
        case description
        case status
        case startAt = "start_at"
        case dueAt = "due_at"
        case completedAt = "completed_at"
        case order
        case source
        case aiNote = "ai_note"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}
