import Foundation

/// DeepSeek 实时大模型接入服务
/// 融合 bnds-ai-mentor 架构设计：严格践行“辅助不越位”人设、数据溯源归因与结构化建议卡协议
/// 模型：deepseekv4flashvisionexp
public final class DeepSeekAIService: @unchecked Sendable {
    public static let shared = DeepSeekAIService()

    private let apiKey = "sk-94c7df0ef42745b5a45f0ac14b0c6874"
    private let endpoint = URL(string: "https://api.deepseek.com/chat/completions")!
    private let modelName = "deepseekv4flashvisionexp"

    private init() {}

    /// 发送对话请求并返回带有结构化建议卡的 MentorMessage
    public func chatWithMentor(
        userMessage: String,
        contextTag: String? = nil,
        history: [MentorMessage] = []
    ) async throws -> MentorMessage {
        // 1. 提取当前学生多维状态上下文
        let studentContext = buildLiveStudentContext()

        // 2. 构建注入了“辅助不越位”与深度校园场景的 System Prompt（萃取自 bnds-ai-mentor 规范）
        let systemPrompt = """
        你是北京十一学校（BNDS）专属学业导师智能助手，严格遵循【辅助不越位】核心原则。

        【导师定位与伦理红线】：
        1. 你只提供分析梳理、规划建议与依据提醒，绝不代替学生做主。
        2. 涉及长远方向选择、选课取舍、竞赛报名等关键决策时，必须明确标注需要学生自己拍板。
        3. 语气温和、克制、具体、可落地，直击问题核心，忌空话套话。

        【学生当前学业与路径全景数据】：
        \(studentContext)

        【输出格式与建议卡规范】：
        请先输出面向学生的对话正文（中文，结合课表教室、评价与路径进行推演）。
        如果回答中包含可落地的具体行动、课表微调或路径目标建议，请在正文末尾附带一个 ```suggestion_json 代码块，格式如下（最多 2 条，若无建议则不输出）：
        ```suggestion_json
        {
          "kind": "schedule_adjust" 或 "life_path_entry" 或 "assessment_plan" 或 "goal",
          "importance": "high" 或 "mid" 或 "low",
          "decisionRequired": true 或 false,
          "title": "简短建议标题（如：容光楼工坊原型攻坚）",
          "text": "具体落地举措（1-2句可执行行动）",
          "reason": "依据：结合课表时段、教师评语或成绩的具体数据推导理由",
          "targetNodeType": "task" 或 "shortTermGoal" 或 "longTermGoal",
          "proposedNodeTitle": "预填落地的节点标题",
          "proposedNodeDescription": "预填落地的节点详细描述"
        }
        ```
        """

        // 3. 组装对话历史
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

        // 4. 发起 DeepSeek API 请求
        let requestBody: [String: Any] = [
            "model": modelName,
            "messages": messages,
            "temperature": 0.5,
            "max_tokens": 1200
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
            throw NSError(domain: "DeepSeekAIService", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "DeepSeek API 错误 (\(httpResponse.statusCode)): \(errorText)"])
        }

        // 5. 解析返回 JSON
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let messageObj = firstChoice["message"] as? [String: Any],
              let rawContent = messageObj["content"] as? String else {
            throw NSError(domain: "DeepSeekAIService", code: -2, userInfo: [NSLocalizedDescriptionKey: "大模型响应格式解析失败"])
        }

        // 6. 解析结构化建议卡
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

    /// 解析 LLM 输出中的 ```suggestion_json 块
    private func parseSuggestionFromResponse(_ raw: String) -> (cleanText: String, suggestion: MentorSuggestion?) {
        let pattern = "```suggestion_json\\s*([\\s\\S]*?)\\s*```"
        guard let regex = try? NSRegularExpression(pattern: pattern, options: []) else {
            return (raw, nil)
        }

        let nsString = raw as NSString
        guard let match = regex.firstMatch(in: raw, options: [], range: NSRange(location: 0, length: nsString.length)) else {
            return (raw, nil)
        }

        let jsonRange = match.range(at: 1)
        let jsonString = nsString.substring(with: jsonRange)
        let cleanText = regex.stringByReplacingMatches(in: raw, options: [], range: NSRange(location: 0, length: nsString.length), withTemplate: "").trimmingCharacters(in: .whitespacesAndNewlines)

        guard let jsonData = jsonString.data(using: .utf8),
              let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            return (cleanText, nil)
        }

        let title = dict["title"] as? String ?? "学业规划建议"
        let text = dict["text"] as? String ?? "建议根据当前课表调整时间分配。"
        let reason = dict["reason"] as? String ?? "依据：十一学校云平台课表与学业反馈"
        let rawType = dict["targetNodeType"] as? String ?? "task"
        let proposedTitle = dict["proposedNodeTitle"] as? String
        let proposedDesc = dict["proposedNodeDescription"] as? String

        let targetType: LifePathNodeType
        switch rawType {
        case "vision": targetType = .vision
        case "longTermGoal": targetType = .longTermGoal
        case "shortTermGoal": targetType = .shortTermGoal
        default: targetType = .task
        }

        let suggestion = MentorSuggestion(
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

        return (cleanText, suggestion)
    }
}
