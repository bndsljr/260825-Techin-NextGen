/**
 * 归一化数据模型（Normalized Data Model）
 *
 * 本文件定义了 `data-ingest` 对外输出的「归一化结果」结构 —— 所有外部平台
 * （云平台 / ManageBac / 手动导入）最终都会被这里的类型统一。
 *
 * ⚠️ 权威来源：字段语义、枚举取值与 `docs/data-model.md` 保持一致。
 * 本包**只负责把外部原始数据归一化为上述结构**，不做任何业务决策；
 * 真正的持久化与 UUID 分配由 `apps/api` 完成（它会把 `source + external_id`
 * 解析为内部唯一标识，并填入 `id`）。
 *
 * 说明：`packages/contracts` 目前尚未由他人落地，因此这些类型先在包内自洽定义；
 * 待 `contracts` 完成后，应把这里的类型搬运/对齐到 `packages/contracts`，
 * 并保持 `docs/data-model.md` 为唯一权威。请勿在两处各自扩展字段。
 */

/** 数据源标识（对应 docs/data-model.md 中 data-ingest 支持的三类 source） */
export type DataSource = 'cloud' | 'managebac' | 'manual';

/** 课次单双周 / 全周 */
export type WeekParity = 'all' | 'odd' | 'even';

/** 课程类别 */
export type CourseCategory = 'required' | 'elective' | 'club' | 'self_study';

/** 过程性评价维度 */
export type AssessmentDimension =
  | 'participation'
  | 'homework'
  | 'quiz'
  | 'project'
  | 'conduct';

/** 过程性评价等级 */
export type GradeLevel =
  | 'excellent'
  | 'good'
  | 'pass'
  | 'needs_improvement';

/** 成绩表达方式：数值分 / 等级 */
export type GradeScoreType = 'score' | 'level';

/** 评 价/成绩的来源（仅云平台 / ManageBac 提供） */
export type AcademicSource = 'cloud' | 'managebac';

/** 归一化课程 / 课表条目（对应 data-model.md `Course`） */
export interface NormalizedCourse {
  /** 内部 UUID；归一化阶段通常为空，由 apps/api 在落库时分配 */
  id?: string;
  /** 来源系统 */
  source: DataSource;
  /** 来源系统内的唯一 ID —— 与 source 一起构成幂等去重键 */
  external_id: string;
  /** 课程名称 */
  name: string;
  /** 授课教师（可选） */
  teacher?: string;
  /** 教室（可选） */
  room?: string;
  /** 星期几：1=周一 … 7=周日 */
  day_of_week: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  /** 开始时间，HH:mm */
  start_time: string;
  /** 结束时间，HH:mm */
  end_time: string;
  /** 单双周 */
  week_parity: WeekParity;
  /** 学期，如 "2026-Fall" */
  term: string;
  /** 课程类别 */
  category: CourseCategory;
}

/** 归一化过程性评价（对应 data-model.md `FormativeAssessment`） */
export interface NormalizedAssessment {
  id?: string;
  source: AcademicSource;
  external_id: string;
  /** 关联课程的来源外部 ID；由 apps/api 解析为内部 course_id */
  course_external_id?: string;
  /** 关联课程的来源系统 */
  course_source?: DataSource;
  dimension: AssessmentDimension;
  grade_level: GradeLevel;
  comment?: string;
  /** 评价时间，ISO 8601 带时区 */
  assessed_at: string;
}

/** 归一化成绩（对应 data-model.md `Grade`） */
export interface NormalizedGrade {
  id?: string;
  source: AcademicSource;
  external_id: string;
  /** 关联课程的来源外部 ID；由 apps/api 解析为内部 course_id */
  course_external_id?: string;
  course_source?: DataSource;
  /** 考试/作业名称，如 "期中考试" */
  exam_name: string;
  /** 当 score_type=score 时使用 */
  score?: number;
  score_type: GradeScoreType;
  max_score?: number;
  weight?: number;
  /** 考试日期，ISO 8601 */
  exam_date: string;
}

/** 归一化过程中的冲突项（无法识别/有歧义的数据，交由后端处理） */
export interface Conflict {
  /** 冲突类型，如 "unknown_course_week_parity" */
  kind: string;
  /** 人类可读说明 */
  message: string;
  /** 冲突的原始数据（可选，便于人工排查） */
  raw?: unknown;
}

/** 校园个人档案（信息对接时从平台「个人信息」提取） */
export interface StudentProfile {
  /** 平台学生 GUID（用于跨接口关联，如课表/评价的 studentId） */
  studentId: string;
  /** 姓名 */
  name: string;
  /** 学号 / 登录账号 */
  studyCode?: string;
  /** 英文名 / 拼音 */
  englishName?: string;
  /**
   * 性别。⚠️ 云平台「个人信息」里的性别**字段不可采信**（平台数据有误），
   * 因此**不从云平台提取/填充**；仅当由可信来源人工确认后可选填。
   */
  gender?: 'male' | 'female' | 'unknown';
  /** 出生日期（YYYY-MM-DD） */
  birthday?: string;
  /** 手机号 */
  mobile?: string;
  /** 年级，如 "高一" */
  gradeLevel?: string;
  /** 学年 */
  schoolYear?: string;
  /** 班级 / 教学组（若可得） */
  className?: string;
  /** 监护人（可选） */
  guardians?: Array<{ name?: string; loginName?: string }>;
}

/** 归一化元信息（随实体一并上报，便于后端审计与人工排查） */
export interface RawMeta {
  source: DataSource;
  /** 数据拉取时间，ISO 8601 */
  fetched_at: string;
  /** 原始数据的格式，如 "cloud-html-detail" / "csv" / "ical" / "json-api" */
  raw_format: string;
  /** 不能识别 / 有冲突的原始条目 */
  conflicts: Conflict[];
  /** 一般性告警 */
  warnings: string[];
}

/** `normalize(source, raw)` 的返回值 —— 归一化结果 */
export interface NormalizedData {
  courses: NormalizedCourse[];
  assessments: NormalizedAssessment[];
  grades: NormalizedGrade[];
  /** 可选：校园个人档案（从平台「个人信息」提取） */
  profile?: StudentProfile;
  raw_meta: RawMeta;
}

/** 归一化流水线的汇总结果（供 apps/api / 客户端展示） */
export interface NormalizedOutcome {
  data: NormalizedData;
  /** 本次同步中，各资源新增（未被去重）的 external id 集合 */
  newKeys: {
    courses: string[];
    assessments: string[];
    grades: string[];
  };
  /** 因幂等去重而忽略的键 */
  dedupedKeys: {
    courses: string[];
    assessments: string[];
    grades: string[];
  };
}
