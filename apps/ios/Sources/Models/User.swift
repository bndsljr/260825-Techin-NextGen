import Foundation

/// 统一数据模型 - 用户实体
/// 对齐 docs/data-model.md § 2.1
public struct User: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var name: String
    public var grade: Int
    public var interests: [String]
    public var createdAt: String
    public var updatedAt: String

    public init(
        id: String = UUID().uuidString,
        name: String,
        grade: Int = 10,
        interests: [String] = [],
        createdAt: String = ISO8601DateFormatter().string(from: Date()),
        updatedAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.name = name
        self.grade = grade
        self.interests = interests
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case grade
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
