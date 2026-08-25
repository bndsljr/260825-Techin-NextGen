import Foundation

/// 专注会话状态
public enum FocusSessionStatus: String, Codable, CaseIterable, Sendable {
    case planned = "planned"
    case running = "running"
    case completed = "completed"
    case aborted = "aborted"

    public var displayName: String {
        switch self {
        case .planned: return "计划中"
        case .running: return "进行中"
        case .completed: return "已完成"
        case .aborted: return "已中止"
        }
    }
}

/// 统一数据模型 - 专注会话 (FocusSession)
/// 对齐 docs/data-model.md § 2.8
public struct FocusSession: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var userId: String
    public var slotId: String?
    public var goalTitle: String
    public var startedAt: String
    public var endedAt: String?
    public var plannedDurationMin: Int
    public var actualDurationMin: Int
    public var status: FocusSessionStatus
    public var reflectionNote: String?

    public init(
        id: String = UUID().uuidString,
        userId: String,
        slotId: String? = nil,
        goalTitle: String = "自主专注学习",
        startedAt: String = ISO8601DateFormatter().string(from: Date()),
        endedAt: String? = nil,
        plannedDurationMin: Int = 45,
        actualDurationMin: Int = 0,
        status: FocusSessionStatus = .planned,
        reflectionNote: String? = nil
    ) {
        self.id = id
        self.userId = userId
        self.slotId = slotId
        self.goalTitle = goalTitle
        self.startedAt = startedAt
        self.endedAt = endedAt
        self.plannedDurationMin = plannedDurationMin
        self.actualDurationMin = actualDurationMin
        self.status = status
        self.reflectionNote = reflectionNote
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case slotId = "slot_id"
        case goalTitle = "goal_title"
        case startedAt = "started_at"
        case endedAt = "ended_at"
        case plannedDurationMin = "planned_duration_min"
        case actualDurationMin = "actual_duration_min"
        case status
        case reflectionNote = "reflection_note"
    }
}
