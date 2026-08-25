import Foundation

/// 统一数据模型 - 用户实体
/// 对齐 docs/data-model.md § 2.1 与云平台真实抓取档案 (packages/data-ingest/test/fixtures/cloud.json)
public struct User: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var name: String
    public var grade: Int
    public var studyCode: String?         // 十一云平台真实学号，如 "26111422"
    public var studentId: String?         // 十一云平台真实 student GUID
    public var schoolPeriodName: String?  // 真实学期，如 "2026-2027学年上学期"
    public var interests: [String]
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String = "c60bf0e8-29c1-4531-854e-c17eb9efbd1a",
        name: String = "李佳睿",
        grade: Int = 10,
        studyCode: String? = "26111422",
        studentId: String? = "c60bf0e8-29c1-4531-854e-c17eb9efbd1a",
        schoolPeriodName: String? = "2026-2027学年上学期",
        interests: [String] = ["cs", "stem", "athletics", "robotics"],
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.name = name
        self.grade = grade
        self.studyCode = studyCode
        self.studentId = studentId
        self.schoolPeriodName = schoolPeriodName
        self.interests = interests
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case grade
        case studyCode = "study_code"
        case studentId = "student_id"
        case schoolPeriodName = "school_period_name"
        case interests
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// 兴趣板块定义
public struct InterestPillar: Identifiable, Codable, Equatable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let iconName: String
    public let description: String

    public init(id: String, name: String, iconName: String, description: String) {
        self.id = id
        self.name = name
        self.iconName = iconName
        self.description = description
    }
}
