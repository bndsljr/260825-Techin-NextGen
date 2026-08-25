/**
 * 归一化辅助工具
 *
 * 这些纯函数被各适配器共用，负责把外部平台「不太规范」的字段
 * 规整到统一的枚举 / 格式上。无法识别时返回 `undefined`，
 * 由适配器决定是丢进 `raw_meta.conflicts` 还是降级为默认值。
 */

import type {
  CourseCategory,
  DataSource,
  GradeScoreType,
  NormalizedCourse,
  NormalizedData,
  NormalizedGrade,
  RawMeta,
  WeekParity,
} from './model.ts';
import { conflict } from './errors.ts';

const TIME_RE = /^(\d{1,2}):(\d{2})$/;

/** 是否形如 HH:mm（容忍 H:mm） */
export function isTime(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const m = TIME_RE.exec(value.trim());
  if (!m) return false;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h <= 23 && min <= 59;
}

/** 规整为 "HH:mm"；非法返回 `undefined` */
export function normalizeTime(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  if (!isTime(v)) return undefined;
  const m = TIME_RE.exec(v)!;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const hh = String(h).padStart(2, '0');
  const mm = String(min).padStart(2, '0');
  return `${hh}:${mm}`;
}

/**
 * 解析星期几（1=周一 … 7=周日）。
 * 支持：1..7、'周一'..'周日'、'Monday'..'Sunday'、单双周标记等。
 */
export function parseDayOfWeek(value: unknown): 1 | 2 | 3 | 4 | 5 | 6 | 7 | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim();

  if (/^[1-7]$/.test(s)) return Number(s) as 1 | 2 | 3 | 4 | 5 | 6 | 7;

  const zh: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
    一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 7, 天: 7,
  };
  const zhMatch = /^周([一二三四五六日天])$/.exec(s);
  if (zhMatch) return zh[zhMatch[1]];

  const en: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
    monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6, sunday: 7,
  };
  const enKey = s.toLowerCase();
  if (enKey in en) return en[enKey];

  return undefined;
}

/** 解析单双周 */
export function parseWeekParity(value: unknown): WeekParity | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === 'all' || s === '' || s === 'every' || s === 'weekly' || s.includes('全') || s.includes('每')) return 'all';
  if (s === 'odd' || s === '单' || s.includes('单周')) return 'odd';
  if (s === 'even' || s === '双' || s.includes('双周')) return 'even';
  return undefined;
}

/** 解析课程类别 */
export function parseCourseCategory(value: unknown): CourseCategory | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === 'required' || s.includes('必修') || s === '必修') return 'required';
  if (s === 'elective' || s.includes('选修') || s === '选修') return 'elective';
  if (s === 'club' || s.includes('社团')) return 'club';
  if (s === 'self_study' || s.includes('自习') || s === '自习') return 'self_study';
  if (s === 'selfstudy' || s === 'study') return 'self_study';
  return undefined;
}

/** 解析成绩表达方式 */
export function parseScoreType(value: unknown): GradeScoreType | undefined {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined;
  const s = String(value).trim().toLowerCase();
  if (s === 'score' || s === '分数' || s === 'numeric') return 'score';
  if (s === 'level' || s === '等级' || s === 'grade') return 'level';
  if (/^\d+(\.\d+)?$/.test(s)) return 'score';
  return undefined;
}

/** 生成一条 NormalizedData 的骨架 */
export function newNormalizedData(
  source: DataSource,
  rawFormat: string,
  fetchedAt: string,
  partial: Partial<Pick<NormalizedData, 'courses' | 'assessments' | 'grades'>> = {},
): NormalizedData {
  const meta: RawMeta = {
    source,
    fetched_at: fetchedAt,
    raw_format: rawFormat,
    conflicts: [],
    warnings: [],
  };
  return {
    courses: partial.courses ?? [],
    assessments: partial.assessments ?? [],
    grades: partial.grades ?? [],
    raw_meta: meta,
  };
}

/** 适配器常用：上报一条冲突 */
export function reportConflict(data: NormalizedData, kind: string, message: string, raw?: unknown): void {
  data.raw_meta.conflicts.push(conflict(kind, message, raw));
}

/** 适配器常用：上报一条告警 */
export function reportWarning(data: NormalizedData, message: string): void {
  data.raw_meta.warnings.push(message);
}

/** 校验构建好的 Course；缺失关键字段时返回错误描述，否则 null */
export function validateCourse(c: NormalizedCourse): string | null {
  if (!c.external_id) return `course "${c.name}" 缺少 external_id`;
  if (!c.name) return 'course 缺少 name';
  if (!Number.isInteger(c.day_of_week) || c.day_of_week < 1 || c.day_of_week > 7) {
    return `course "${c.name}" day_of_week 非法: ${c.day_of_week}`;
  }
  if (!isTime(c.start_time) || !isTime(c.end_time)) {
    return `course "${c.name}" 时间非法: ${c.start_time}-${c.end_time}`;
  }
  if (c.start_time >= c.end_time) {
    return `course "${c.name}" 结束时间不晚于开始时间`;
  }
  return null;
}

export function makeCourseId(source: DataSource, externalId: string): string {
  return `${source}:${externalId}`;
}
