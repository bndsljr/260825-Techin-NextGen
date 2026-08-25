import Foundation

/// 导师建议卡状态
public enum SuggestionStatus: String, Codable, CaseIterable, Sendable {
    case pendingReview = "pending_review"  // 待学生查看
    case accepted = "accepted"              // 已采纳（转去编辑器亲自确认）
    case deferred = "deferred"              // 暂缓
    case rejected = "rejected"              // 已婉拒

    public var displayName: String {
        switch self {
        case .pendingReview: return "待决策"
        case .accepted: return "已采纳"
        case .deferred: return "暂缓"
        case .rejected: return "已婉拒"
        }
    }
}

/// 导师结构化建议卡 (SuggestionCard)
/// 对齐 docs/api-contract.md § 7
public struct MentorSuggestion: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var title: String
    public var text: String
    public var reason: String              // "💡 为什么这么建议" (透明可溯源依据)
    public var targetNodeType: LifePathNodeType?
    public var proposedNodeTitle: String?
    public var proposedNodeDescription: String?
    public var source: String             // "ai_suggest"
    public var status: SuggestionStatus

    public init(
        id: String = UUID().uuidString,
        title: String,
        text: String,
        reason: String,
        targetNodeType: LifePathNodeType? = nil,
        proposedNodeTitle: String? = nil,
        proposedNodeDescription: String? = nil,
        source: String = "ai_suggest",
        status: SuggestionStatus = .pendingReview
    ) {
        self.id = id
        self.title = title
        self.text = text
        self.reason = reason
        self.targetNodeType = targetNodeType
        self.proposedNodeTitle = proposedNodeTitle
        self.proposedNodeDescription = proposedNodeDescription
        self.source = source
        self.status = status
    }

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case text
        case reason
        case targetNodeType = "target_node_type"
        case proposedNodeTitle = "proposed_node_title"
        case proposedNodeDescription = "proposed_node_description"
        case source
        case status
    }
}

/// 导师会话消息 (MentorMessage)
public struct MentorMessage: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var sender: String             // "mentor" | "user"
    public var content: String
    public var suggestion: MentorSuggestion?
    public var relatedContextTag: String?  // 如 "微积分期中复习", "人生路径-AI项目"
    public var createdAt: String

    public init(
        id: String = UUID().uuidString,
        sender: String,
        content: String,
        suggestion: MentorSuggestion? = nil,
        relatedContextTag: String? = nil,
        createdAt: String = ISO8601DateFormatter().string(from: Date())
    ) {
        self.id = id
        self.sender = sender
        self.content = content
        self.suggestion = suggestion
        self.relatedContextTag = relatedContextTag
        self.createdAt = createdAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case sender
        case content
        case suggestion
        case relatedContextTag = "related_context_tag"
        case createdAt = "created_at"
    }
}
