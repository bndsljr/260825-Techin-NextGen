/**
 * 原始行 → 归一化实体 的共享映射器
 *
 * 云平台 / ManageBac / 手动 JSON 的「原始行」虽来源不同、字段名不同，
 * 但归一化逻辑一致。这里把 `Record<string, unknown>` 形状的原始行，
 * 依据语义别名映射为归一化实体，并收集冲突 / 告警。
 */

import type {
  AcademicSource,
  DataSource,
  NormalizedAssessment,
  NormalizedCourse,
  NormalizedData,
  NormalizedGrade,
  StudentProfile,
} from '../model.ts';
import {
  normalizeTime,
  parseDayOfWeek,
  parseWeekParity,
  parseCourseCategory,
  parseScoreType,
  reportConflict,
  validateCourse,
} from '../normalize.ts';

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined;
  return String(v);
}
function num(v: unknown): number | undefined {
  if (v === undefined || v === null) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function toCourse(row: Record<string, unknown>, source: DataSource, data: NormalizedData): void {
  const name = str(row.name) ?? str(row.title) ?? str(row.course) ?? str(row.subject) ?? '';
  if (!name) { reportConflict(data, 'missing_name', '课程行缺少名称', row); return; }
  const day = parseDayOfWeek(row.day_of_week ?? row.weekday ?? row.week ?? row.星期);
  const start = normalizeTime(row.start_time ?? row.start ?? row.startTime);
  const end = normalizeTime(row.end_time ?? row.end ?? row.endTime);
  const course: NormalizedCourse = {
    source,
    external_id: str(row.external_id) ?? str(row.id) ?? str(row.code) ?? str(row.course_id) ?? `${name}-${day ?? ''}-${start ?? ''}`,
    name,
    teacher: str(row.teacher) ?? str(row.teacher_name),
    room: str(row.room) ?? str(row.location) ?? str(row.教室),
    day_of_week: day ?? 1,
    start_time: start ?? '00:00',
    end_time: end ?? '01:00',
    week_parity: parseWeekParity(row.week_parity ?? row.parity ?? row.单双周) ?? 'all',
    term: str(row.term) ?? str(row.学期) ?? 'unknown',
    category: parseCourseCategory(row.category ?? row.type ?? row.类型) ?? 'required',
  };
  const err = validateCourse(course);
  if (err) { reportConflict(data, 'invalid_course', err, row); return; }
  data.courses.push(course);
}

export function toAssessment(row: Record<string, unknown>, source: AcademicSource, data: NormalizedData): void {
  const assessedAt = str(row.assessed_at) ?? str(row.date) ?? str(row.evaluated_at);
  if (!assessedAt) { reportConflict(data, 'missing_assessed_at', '评价缺少 assessed_at', row); return; }
  const dim = str(row.dimension) ?? str(row.维度);
  const level = str(row.grade_level) ?? str(row.level) ?? str(row.等级) ?? 'pass';
  const courseExternal = str(row.course_external_id) ?? str(row.course_id) ?? str(row.课程编号);
  data.assessments.push({
    id: str(row.id),
    source,
    external_id: str(row.external_id) ?? str(row.id) ?? `${assessedAt}-${dim ?? ''}`,
    course_external_id: courseExternal,
    course_source: courseExternal ? source : undefined,
    dimension: (dim as NormalizedAssessment['dimension']) ?? 'participation',
    grade_level: (level as NormalizedAssessment['grade_level']) ?? 'pass',
    comment: str(row.comment) ?? str(row.评语),
    assessed_at: assessedAt,
  });
}

export function toGrade(row: Record<string, unknown>, source: AcademicSource, data: NormalizedData): void {
  const examDate = str(row.exam_date) ?? str(row.date) ?? str(row.考试日期);
  if (!examDate) { reportConflict(data, 'missing_exam_date', '成绩缺少 exam_date', row); return; }
  const score = num(row.score);
  const rawScoreType = str(row.score_type) ?? str(row.type);
  const courseExternal = str(row.course_external_id) ?? str(row.course_id) ?? str(row.课程编号);
  data.grades.push({
    id: str(row.id),
    source,
    external_id: str(row.external_id) ?? str(row.id) ?? `${examDate}-${str(row.exam_name) ?? ''}`,
    course_external_id: courseExternal,
    course_source: courseExternal ? source : undefined,
    exam_name: str(row.exam_name) ?? str(row.name) ?? '考试',
    score,
    score_type: parseScoreType(rawScoreType) ?? (score !== undefined ? 'score' : 'level'),
    max_score: num(row.max_score) ?? num(row.满分),
    weight: num(row.weight) ?? num(row.权重),
    exam_date: examDate,
  });
}

/** 从一个信封 `{ courses, assessments, grades, profile }` 批量生成归一化实体 */
export function mapEnvelope(
  data: NormalizedData,
  env: { courses?: unknown; assessments?: unknown; grades?: unknown; profile?: unknown },
  source: DataSource,
): void {
  if (env.profile && typeof env.profile === 'object') {
    const p = env.profile as Record<string, unknown>;
    const prev = data.profile;
    const profile: StudentProfile = {
      studentId: prev?.studentId ?? '',
      name: prev?.name ?? str(p.name) ?? '',
      studyCode: prev?.studyCode ?? str(p.studyCode),
      englishName: prev?.englishName ?? str(p.englishName),
      // 性别不从云平台采信（平台字段有误），仅保留先前可信值
      gender: prev?.gender,
      birthday: prev?.birthday ?? str(p.birthday),
      mobile: prev?.mobile ?? str(p.mobile),
      gradeLevel: prev?.gradeLevel ?? str(p.gradeLevel),
      schoolYear: prev?.schoolYear ?? str(p.schoolYear),
      className: prev?.className ?? str(p.className),
      guardians: prev?.guardians ?? (Array.isArray(p.guardians) ? (p.guardians as StudentProfile['guardians']) : undefined),
    };
    data.profile = profile;
  }
  mapRows(env.courses, data, (r) => toCourse(r, source, data));
  // 评价/成绩的来源必须是 cloud | managebac；manual 导入时默认按 managebac 处理并告警
  const academic: AcademicSource = source === 'cloud' || source === 'managebac' ? source : 'managebac';
  if (source === 'manual' && (hasItems(env.assessments) || hasItems(env.grades))) {
    data.raw_meta.warnings.push('手动导入的评价/成绩缺少真实来源系统，默认按 managebac 处理');
  }
  mapRows(env.assessments, data, (r) => toAssessment(r, academic, data));
  mapRows(env.grades, data, (r) => toGrade(r, academic, data));
}

export function mapRows(input: unknown, data: NormalizedData, mapper: (row: Record<string, unknown>) => void): void {
  if (!Array.isArray(input)) return;
  for (const r of input) {
    if (r && typeof r === 'object') mapper(r as Record<string, unknown>);
    else data.raw_meta.conflicts.push({ kind: 'invalid_row', message: '有无法识别的原始行', raw: r });
  }
}

function hasItems(input: unknown): boolean {
  return Array.isArray(input) && input.length > 0;
}
