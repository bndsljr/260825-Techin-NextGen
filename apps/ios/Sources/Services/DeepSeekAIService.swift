import Foundation

/// DeepSeek 实时大模型接入服务
/// 模型：deepseek-v4-flash-vision-exp (Key: sk-94c7df0ef42745b5a45f0ac14b0c6874)
/// 严格遵循“辅助不越位”人设、数据溯源归因与结构化建议卡协议
public final class DeepSeekAIService: @unchecked Sendable {
    public static let shared = DeepSeekAIService()

    private let apiKey = "sk-94c7df0ef42745b5a45f0ac14b0c6874"
    private let endpoint = URL(string: "https://api.deepseek.com/chat/completions")!
    private let primaryModel = "deepseek-v4-flash-vision-exp"
    private let fallbackModel = "deepseek-v4-flash"

    private init() {}

    /// 发送真实对话请求至 DeepSeek 大模型
    public func chatWithMentor(
        userMessage: String,
        contextTag: String? = nil,
        history: [MentorMessage] = []
    ) async throws -> MentorMessage {
        let studentContext = buildLiveStudentContext()

        let systemPrompt = """
        你是北京十一学校（BNDS）专属 AI 学业与人生规划导师，遵循【辅助不越位】核心原则。

        【导师核心原则】：
        1. 你只提供方向梳理、规划建议、学业归因与提醒，绝不代替学生做主；涉及选课、时间精力分配、参赛与长远发展方向时，决策权始终在学生手中。
        2. 语气温和、真诚、具体、可落地，直击问题核心，忌空话套话。

        【学生当前学业与路径全景数据】：
        \(studentContext)

        【结构化建议卡规范】：
        请先输出面向学生的完整对话正文（结合具体课表时间、教室与评价进行推导）。
        当你在回答中给出可落地的具体行动建议时，请在回答末尾附带一个 ```suggestion_json 代码块，格式如下（若无明确单项目标建议则无需输出）：
        ```suggestion_json
        {
          "kind": "schedule_adjust" 或 "life_path_entry" 或 "assessment_plan" 或 "goal",
          "importance": "high" 或 "mid" 或 "low",
          "decisionRequired": true 或 false,
          "title": "简短建议标题",
          "text": "具体落地举措描述（1-2句）",
          "reason": "依据：结合课表或评价的具体推导理由",
          "targetNodeType": "task" 或 "shortTermGoal" 或 "longTermGoal",
          "proposedNodeTitle": "预填落地的节点标题",
          "proposedNodeDescription": "预填落地的节点详细描述"
        }
        ```
        """

        var messages: [[String: String]] = [
            ["role": "system", "content": systemPrompt]
        ]

        for msg in history.suffix(6) {
            let role = msg.sender == "user" ? "user" : "assistant"
            messages.append(["role": role, "content": msg.content])
        }

        var currentUserPrompt = userMessage
        if let tag = contextTag, !tag.isEmpty {
            currentUserPrompt = "【当前聚焦上下文：\(tag)】\n\(userMessage)"
        }
        messages.append(["role": "user", "content": currentUserPrompt])

        // 尝试主模型，失败时尝试备用模型
        do {
            return try await performChatRequest(model: primaryModel, messages: messages, contextTag: contextTag)
        } catch {
            print("[DeepSeekAIService] Primary model request error: \(error), trying fallback model...")
            return try await performChatRequest(model: fallbackModel, messages: messages, contextTag: contextTag)
        }
    }

    private func performChatRequest(
        model: String,
        messages: [[String: String]],
        contextTag: String?
    ) async throws -> MentorMessage {
        let requestBody: [String: Any] = [
            "model": model,
            "messages": messages,
            "temperature": 0.6,
            "max_tokens": 1500
        ]

        var request = URLRequest(url: endpoint)
        request.httpMethod = "POST"
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        request.timeoutInterval = 30

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NSError(domain: "DeepSeekAIService", code: -1, userInfo: [NSLocalizedDescriptionKey: "网络通信异常"])
        }

        guard httpResponse.statusCode == 200 else {
            let errorText = String(data: data, encoding: .utf8) ?? "未知错误"
            throw NSError(domain: "DeepSeekAIService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "DeepSeek API 响应异常 (\(httpResponse.statusCode)): \(errorText)"])
        }

        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let messageObj = firstChoice["message"] as? [String: Any],
              let rawContent = messageObj["content"] as? String else {
            throw NSError(domain: "DeepSeekAIService", code: -2, userInfo: [NSLocalizedDescriptionKey: "大模型返回数据解析失败"])
        }

        let (cleanContent, suggestion) = parseSuggestionFromResponse(rawContent)

        return MentorMessage(
            id: UUID().uuidString,
            sender: "mentor",
            content: cleanContent,
            suggestion: suggestion,
            relatedContextTag: contextTag
        )
    }

    /// 动态提取学生最新多维上下文
    private func buildLiveStudentContext() -> String {
        let store = LocalDataStore.shared
        let user = store.currentUser
        let pathNodes = store.lifePath.nodes
        let assessments = store.formativeAssessments
        let grades = store.grades

        var lines: [String] = []
        lines.append("- 学生姓名：\(user.name)（\(user.grade == 10 ? "高一" : "高\(user.grade)")，学号：\(user.studyCode ?? "26111422")，学期：\(user.schoolPeriodName ?? "2026-2027学年上学期")）")
        lines.append("- 核心选修与课表重点：周五 14:25-18:00 为「工程-创意万物造-1」（容光楼T109 3节连堂实践）；周二/周四有「皮划艇-6」；主修数学Ⅲ-4 (S218A)、物理ⅢA-2 (S319A)。")

        lines.append("- 人生路径树状态：")
        for node in pathNodes {
            let statusDesc: String
            switch node.status {
            case .pending: statusDesc = "[待定]"
            case .inProgress: statusDesc = "[进行中]"
            case .achieved: statusDesc = "[已达成]"
            case .abandoned: statusDesc = "[已放弃]"
            }
            lines.append("  * \(node.type.displayName) \(statusDesc)：\(node.title)（\(node.description)）")
        }

        lines.append("- 最新过程性评价：")
        for fa in assessments {
            lines.append("  * \(fa.courseName) [\(fa.dimension.displayName)·\(fa.gradeLevel.displayName)]：\(fa.comment)")
        }

        lines.append("- 近期阶段测验成绩：")
        for g in grades {
            lines.append("  * \(g.courseName)（\(g.examName)）：\(String(format: "%.1f", g.score)) / \(String(format: "%.1f", g.maxScore))")
        }

        return lines.joined(separator: "\n")
    }

    /// 解析 LLM 输出中的 ```suggestion_json 块或 <<<SUGGESTIONS>>>
    private func parseSuggestionFromResponse(_ raw: String) -> (cleanText: String, suggestion: MentorSuggestion?) {
        let pattern = "```(?:suggestion_json|json)?\\s*([\\s\\S]*?)\\s*```"
        if let regex = try? NSRegularExpression(pattern: pattern, options: []) {
            let nsString = raw as NSString
            if let match = regex.firstMatch(in: raw, options: [], range: NSRange(location: 0, length: nsString.length)) {
                let jsonRange = match.range(at: 1)
                let jsonString = nsString.substring(with: jsonRange)
                let cleanText = regex.stringByReplacingMatches(in: raw, options: [], range: NSRange(location: 0, length: nsString.length), withTemplate: "").trimmingCharacters(in: .whitespacesAndNewlines)

                if let jsonData = jsonString.data(using: .utf8) {
                    if let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                        if let suggestion = createSuggestionFromDict(dict) {
                            return (cleanText, suggestion)
                        }
                    } else if let arr = try? JSONSerialization.jsonObject(with: jsonData) as? [[String: Any]], let firstDict = arr.first {
                        if let suggestion = createSuggestionFromDict(firstDict) {
                            return (cleanText, suggestion)
                        }
                    }
                }
                return (cleanText, nil)
            }
        }

        return (raw, nil)
    }

    private func createSuggestionFromDict(_ dict: [String: Any]) -> MentorSuggestion? {
        let title = dict["title"] as? String ?? "学业规划建议"
        let text = dict["text"] as? String ?? dict["body"] as? String ?? "建议根据当前课表调整时间分配。"
        let reason = dict["reason"] as? String ?? dict["detail"] as? String ?? "依据：十一学校云平台课表与学业反馈"
        let rawType = dict["targetNodeType"] as? String ?? "task"
        let proposedTitle = dict["proposedNodeTitle"] as? String ?? title
        let proposedDesc = dict["proposedNodeDescription"] as? String ?? text

        let targetType: LifePathNodeType
        switch rawType {
        case "vision": targetType = .vision
        case "longTermGoal": targetType = .longTermGoal
        case "shortTermGoal": targetType = .shortTermGoal
        default: targetType = .task
        }

        return MentorSuggestion(
            id: UUID().uuidString,
            title: title,
            text: text,
            reason: reason,
            targetNodeType: targetType,
            proposedNodeTitle: proposedTitle,
            proposedNodeDescription: proposedDesc,
            source: "ai_suggest",
            status: .pendingReview
        )
    }
}
