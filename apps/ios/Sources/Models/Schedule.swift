import Foundation

/// 统一数据模型 - 课程 / 课表条目 (Course)
/// 对齐 docs/data-model.md § 2.4
public struct Course: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var source: String             // "cloud" | "managebac" | "manual"
    public var externalId: String?
    public var name: String
    public var teacher: String
    public var room: String
    public var dayOfWeek: Int             // 1-7
    public var startTime: String          // "08:00"
    public var endTime: String            // "08:45"
    public var weekParity: String         // "all" | "odd" | "even"
    public var term: String               // "2026-Fall"
    public var category: String           // "required" | "elective" | "club" | "self_study"

    public init(
        id: String = UUID().uuidString,
        source: String = "cloud",
        externalId: String? = nil,
        name: String,
        teacher: String,
        room: String,
        dayOfWeek: Int,
        startTime: String,
        endTime: String,
        weekParity: String = "all",
        term: String = "2026-Fall",
        category: String = "required"
    ) {
        self.id = id
        self.source = source
        self.externalId = externalId
        self.name = name
        self.teacher = teacher
        self.room = room
        self.dayOfWeek = dayOfWeek
        self.startTime = startTime
        self.endTime = endTime
        self.weekParity = weekParity
        self.term = term
        self.category = category
    }

    enum CodingKeys: String, CodingKey {
        case id
        case source
        case externalId = "external_id"
        case name
        case teacher
        case room
        case dayOfWeek = "day_of_week"
        case startTime = "start_time"
        case endTime = "end_time"
        case weekParity = "week_parity"
        case term
        case category
    }
}

/// 日程时段种类
public enum SlotKind: String, Codable, CaseIterable, Sendable {
    case `class` = "class"         // 上课
    case study = "study"           // 自习 / 研讨
    case `break` = "break"         // 课间 / 午休
    case focus = "focus"           // 专注窗口

    public var displayName: String {
        switch self {
        case .class: return "课程"
        case .study: return "自主研修"
        case .break: return "课间休息"
        case .focus: return "专注时段"
        }
    }

    public var iconName: String {
        switch self {
        case .class: return "book.closed.fill"
        case .study: return "pencil.and.ruler.fill"
        case .break: return "cup.and.saucer.fill"
        case .focus: return "timer"
        }
    }
}

/// 统一数据模型 - 日程时段 (ScheduleSlot)
/// 对齐 docs/data-model.md § 2.5
public struct ScheduleSlot: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var date: String               // "2026-09-01"
    public var startAt: String            // ISO8601
    public var endAt: String              // ISO8601
    public var courseId: String?
    public var title: String
    public var subtitle: String?
    public var room: String?
    public var kind: SlotKind
    public var source: String             // "schedule" | "focus"

    public init(
        id: String = UUID().uuidString,
        date: String,
        startAt: String,
        endAt: String,
        courseId: String? = nil,
        title: String,
        subtitle: String? = nil,
        room: String? = nil,
        kind: SlotKind = .class,
        source: String = "schedule"
    ) {
        self.id = id
        self.date = date
        self.startAt = startAt
        self.endAt = endAt
        self.courseId = courseId
        self.title = title
        self.subtitle = subtitle
        self.room = room
        self.kind = kind
        self.source = source
    }

    enum CodingKeys: String, CodingKey {
        case id
        case date
        case startAt = "start_at"
        case endAt = "end_at"
        case courseId = "course_id"
        case title
        case subtitle
        case room
        case kind
        case source
    }
}
