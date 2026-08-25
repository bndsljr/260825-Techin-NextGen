import Foundation

/// 统一 API 客户端
/// 对齐 docs/api-contract.md
public final class APIClient: @unchecked Sendable {
    public static let shared = APIClient()

    public var baseURL: URL = URL(string: "https://api.bnds.example.com/api/v1")!
    public var bearerToken: String? = nil
    public var useMockFallback: Bool = true

    private init() {}

    // MARK: - 契约标准请求结构
    public struct APIResponse<T: Codable>: Codable {
        public let data: T?
        public let error: APIErrorDetail?
    }

    public struct APIErrorDetail: Codable {
        public let code: String
        public let message: String
    }

    // MARK: - 人生路径 API
    public func fetchLifePath() async throws -> LifePath {
        if useMockFallback {
            return MockDataStore.shared.lifePath
        }
        return try await performRequest(endpoint: "/life-path", method: "GET")
    }

    public func saveNode(_ node: LifePathNode) async throws {
        if useMockFallback {
            MockDataStore.shared.updateLifePathNode(node)
            return
        }
        let _: LifePathNode = try await performRequest(
            endpoint: "/life-path/nodes/\(node.id)",
            method: "PATCH",
            body: node
        )
    }

    // MARK: - AI 导师 API
    public func askMentor(question: String, contextTag: String? = nil) async throws -> MentorMessage {
        if useMockFallback {
            // 智能本地响应
            let responseContent = "针对「\(question)」：\n\n从你目前的学业数据看，你整体进展良好。建议优先拆解为可操作的小步任务，并适时为未知环节保留【待定】空间。"
            let suggestion = MentorSuggestion(
                title: "将此项疑问拆解为 2 个短期探索任务",
                text: "本周先进行 30 分钟调研，下周视体验再决定是否长期投入。",
                reason: "依据：避免过早锁定计划，保留灵活调整弹性。",
                targetNodeType: .shortTermGoal,
                proposedNodeTitle: "调研与体验：\(question)",
                proposedNodeDescription: "初步探索，允许随时调整",
                source: "ai_suggest",
                status: .pendingReview
            )

            let msg = MentorMessage(
                sender: "mentor",
                content: responseContent,
                suggestion: suggestion,
                relatedContextTag: contextTag
            )
            MockDataStore.shared.addMentorMessage(msg)
            return msg
        }

        struct MentorPayload: Codable {
            let prompt: String
            let contextTag: String?
        }

        return try await performRequest(
            endpoint: "/ai/mentor",
            method: "POST",
            body: MentorPayload(prompt: question, contextTag: contextTag)
        )
    }

    // MARK: - 基础网络请求封装
    private func performRequest<T: Codable, B: Codable>(
        endpoint: String,
        method: String,
        body: B? = nil
    ) async throws -> T {
        guard let url = URL(string: endpoint, relativeTo: baseURL) else {
            throw URLError(.badURL)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token = bearerToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            request.httpBody = try JSONEncoder().encode(body)
        }

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse, (200...299).contains(httpResponse.statusCode) else {
            throw URLError(.badServerResponse)
        }

        let decoded = try JSONDecoder().decode(APIResponse<T>.self, from: data)
        guard let resultData = decoded.data else {
            throw URLError(.cannotDecodeContentData)
        }
        return resultData
    }

    private func performRequest<T: Codable>(
        endpoint: String,
        method: String
    ) async throws -> T {
        let nilBody: String? = nil
        return try await performRequest(endpoint: endpoint, method: method, body: nilBody)
    }
}
