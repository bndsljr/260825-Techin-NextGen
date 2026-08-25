import Foundation

/// 评价维度
public enum AssessmentDimension: String, Codable, CaseIterable, Sendable {
    case participation = "participation" // 课堂参与 / 积极度
    case homework = "homework"           // 过程作业
    case quiz = "quiz"                   // 随堂测验
    case project = "project"             // 探究项目
    case conduct = "conduct"             // 合作与素养

    public var displayName: String {
        switch self {
        case .participation: return "课堂研讨"
        case .homework: return "作业表现"
        case .quiz: return "随堂检测"
        case .project: return "项目探究"
        case .conduct: return "学术素养"
        }
    }

    public var iconName: String {
        switch self {
        case .participation: return "bubble.left.and.bubble.right.fill"
        case .homework: return "doc.text.fill"
        case .quiz: return "chart.bar.doc.horizontal.fill"
        case .project: return "folder.badge.gearshape"
        case .conduct: return "person.3.sequence.fill"
        }
    }
}

/// 等级划分
public enum GradeLevel: String, Codable, CaseIterable, Sendable {
    case excellent = "excellent"
    case good = "good"
    case pass = "pass"
    case needsImprovement = "needs_improvement"

    public var displayName: String {
        switch self {
        case .excellent: return "卓越 (A+)"
        case .good: return "优秀 (A)"
        case .pass: return "达标 (B)"
        case .needsImprovement: return "待改进 (C)"
        }
    }
}

/// 统一数据模型 - 过程性评价 (FormativeAssessment)
/// 对齐 docs/data-model.md § 2.6
public struct FormativeAssessment: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var userId: String
    public var courseId: String
    public var courseName: String
    public var teacherName: String
    public var dimension: AssessmentDimension
    public var gradeLevel: GradeLevel
    public var comment: String
    public var assessedAt: String
    public var source: String             // "cloud" | "managebac"

    public init(
        id: String = UUID().uuidString,
        userId: String,
        courseId: String,
        courseName: String,
        teacherName: String = "任课教师",
        dimension: AssessmentDimension = .participation,
        gradeLevel: GradeLevel = .excellent,
        comment: String,
        assessedAt: String = ISO8601DateFormatter().string(from: Date()),
        source: String = "cloud"
    ) {
        self.id = id
        self.userId = userId
        self.courseId = courseId
        self.courseName = courseName
        self.teacherName = teacherName
        self.dimension = dimension
        self.gradeLevel = gradeLevel
        self.comment = comment
        self.assessedAt = assessedAt
        self.source = source
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case courseId = "course_id"
        case courseName = "course_name"
        case teacherName = "teacher_name"
        case dimension
        case gradeLevel = "grade_level"
        case comment
        case assessedAt = "assessed_at"
        case source
    }
}

/// 统一数据模型 - 成绩 (Grade)
/// 对齐 docs/data-model.md § 2.7
public struct Grade: Identifiable, Codable, Equatable, Sendable {
    public let id: String
    public var userId: String
    public var courseId: String
    public var courseName: String
    public var examName: String
    public var score: Double
    public var scoreType: String          // "score" | "level"
    public var maxScore: Double
    public var weight: Double
    public var examDate: String
    public var source: String             // "cloud" | "managebac"

    public init(
        id: String = UUID().uuidString,
        userId: String,
        courseId: String,
        courseName: String,
        examName: String,
        score: Double,
        scoreType: String = "score",
        maxScore: Double = 100.0,
        weight: Double = 0.3,
        examDate: String = "2026-10-15",
        source: String = "cloud"
    ) {
        self.id = id
        self.userId = userId
        self.courseId = courseId
        self.courseName = courseName
        self.examName = examName
        self.score = score
        self.scoreType = scoreType
        self.maxScore = maxScore
        self.weight = weight
        self.examDate = examDate
        self.source = source
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case courseId = "course_id"
        case courseName = "course_name"
        case examName = "exam_name"
        case score
        case scoreType = "score_type"
        case maxScore = "max_score"
        case weight
        case examDate = "exam_date"
        case source
    }
}
