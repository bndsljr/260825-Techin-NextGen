import Foundation

/// 统一数据模型 - 课程 / 课表条目 (Course)
/// 对齐 docs/data-model.md § 2.4 与 packages/data-ingest NormalizedCourse
public struct Course: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var source: String             // "cloud" | "managebac" | "manual"
    public var externalId: String?        // 如 "fdd50ce3-...:33"
    public var name: String               // 如 "生物ⅡA-4"
    public var teacher: String            // 如 "李老师"
    public var room: String               // 如 "S101A"
    public var dayOfWeek: Int             // 1-7
    public var startTime: String          // "09:50"
    public var endTime: String            // "10:35"
    public var weekParity: String         // "all" | "odd" | "even"
    public var term: String               // "2026-2027学年上学期"
    public var category: String           // "required" | "elective" | "club" | "self_study"

    public init(
        id: String = UUID().uuidString,
        source: String = "cloud",
        externalId: String? = nil,
        name: String,
        teacher: String = "待同步",
        room: String = "未定教室",
        dayOfWeek: Int = 1,
        startTime: String = "08:00",
        endTime: String = "08:45",
        weekParity: String = "all",
        term: String = "2026-2027学年上学期",
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

    public var dayOfWeekDisplayName: String {
        switch dayOfWeek {
        case 1: return "周一"
        case 2: return "周二"
        case 3: return "周三"
        case 4: return "周四"
        case 5: return "周五"
        case 6: return "周六"
        case 7: return "周日"
        default: return "周\(dayOfWeek)"
        }
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
    public var date: String               // "2026-08-25"
    public var dayOfWeek: Int             // 1-7
    public var startAt: String            // "08:00"
    public var endAt: String              // "08:45"
    public var courseId: String?
    public var title: String
    public var subtitle: String?
    public var room: String?
    public var kind: SlotKind
    public var source: String             // "cloud" | "managebac" | "manual" | "focus"

    public init(
        id: String = UUID().uuidString,
        date: String = "2026-08-25",
        dayOfWeek: Int = 2,
        startAt: String,
        endAt: String,
        courseId: String? = nil,
        title: String,
        subtitle: String? = nil,
        room: String? = nil,
        kind: SlotKind = .class,
        source: String = "cloud"
    ) {
        self.id = id
        self.date = date
        self.dayOfWeek = dayOfWeek
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
        case dayOfWeek = "day_of_week"
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
