/**
 * 手动导入适配器（manual）
 *
 * 第一版最稳妥的对接方式：**用户导出 → 应用解析归一化**。本适配器负责
 * 解析用户提供的文件/内容，支持三种格式：
 *   1. **JSON 信封**：`{ courses?, assessments?, grades? }`（推荐，确定性最高）
 *   2. **iCal/ICS**：日历导出，抽取 VEVENT 为归一化课程
 *   3. **CSV**：按表头自动路由 course / assessment / grade（见 README 的模板）
 *
 * `fetch` 不需要外部网络；内容由调用方经 `ctx.meta.raw` 或构造参数传入。
 */

import type { Adapter, SyncContext } from './types.ts';
import type { NormalizedData } from '../model.ts';
import { newNormalizedData, reportConflict, reportWarning } from '../normalize.ts';
import { IngestionError } from '../errors.ts';
import { csvToRows, pick, type CsvRow } from '../csv.ts';
import { parseIcs, parseCalDateTime, dateToWeekday } from '../ical.ts';
import { mapEnvelope, toCourse, toAssessment, toGrade } from './normalize-payload.ts';
import { validateCourse } from '../normalize.ts';
import type { NormalizedCourse } from '../model.ts';

export type ManualRaw = string | Record<string, unknown> | unknown[];

export class ManualAdapter implements Adapter {
  readonly source = 'manual' as const;
  private readonly defaultRaw?: ManualRaw;

  constructor(defaultRaw?: ManualRaw) {
    this.defaultRaw = defaultRaw;
  }

  async fetch(ctx: SyncContext): Promise<unknown> {
    const raw = (ctx.meta?.raw as ManualRaw) ?? this.defaultRaw;
    if (raw === undefined) {
      throw new IngestionError('NOT_IMPLEMENTED', 'manual 需要提供导入内容（JSON / CSV / ICS）');
    }
    return raw;
  }

  normalize(ctx: SyncContext, raw: unknown): NormalizedData {
    const fetchedAt = (ctx.now ?? new Date()).toISOString();
    const data = newNormalizedData('manual', detectFormat(raw), fetchedAt);

    if (typeof raw === 'string') {
      const s = raw.trim();
      if (s.toUpperCase().includes('BEGIN:VCALENDAR')) {
        data.courses.push(...normalizeIcs(s, data));
      } else {
        const rows = csvToRows(s);
        if (rows.length === 0) reportWarning(data, 'CSV 无有效数据行');
        for (const row of rows) routeCsvRow(row, data);
      }
    } else if (Array.isArray(raw)) {
      for (const row of raw) {
        if (row && typeof row === 'object') routeJsonRow(row as Record<string, unknown>, data);
        else reportConflict(data, 'invalid_row', 'JSON 数组中有无法识别的行', row);
      }
    } else if (raw && typeof raw === 'object') {
      mapEnvelope(data, raw as Record<string, unknown>, 'manual');
    } else {
      reportConflict(data, 'unsupported_raw', 'manual 无法识别该格式的数据', raw);
    }

    return data;
  }
}

function detectFormat(raw: unknown): string {
  if (typeof raw === 'string') {
    if (raw.trim().toUpperCase().includes('BEGIN:VCALENDAR')) return 'ical';
    return 'csv';
  }
  if (Array.isArray(raw)) return 'json-array';
  if (raw && typeof raw === 'object') return 'json-envelope';
  return 'unknown';
}

// —————————————————— JSON 数组路由 ——————————————————

function routeJsonRow(row: Record<string, unknown>, data: NormalizedData): void {
  const type = String(row.type ?? row.kind ?? row.record_type ?? '');
  if (type === 'course' || (!type && (row.name || row.title) && (row.day_of_week || row.start_time))) {
    toCourse(row, 'manual', data);
  } else if (type === 'assessment' || row.dimension || row.grade_level) {
    toAssessment(row, 'managebac', data);
  } else if (type === 'grade' || row.score || row.exam_name || row.exam_date) {
    toGrade(row, 'managebac', data);
  } else {
    reportConflict(data, 'unroutable_row', 'JSON 行无法识别类型', row);
  }
}

// —————————————————— CSV 路由 ——————————————————

function routeCsvRow(row: CsvRow, data: NormalizedData): void {
  const type = pick(row, ['type', 'kind', 'record_type']);
  if (type === 'assessment' || row.dimension) { toAssessment(row, 'managebac', data); return; }
  if (type === 'grade' || row.exam_name || row.exam_date || row.score) { toGrade(row, 'managebac', data); return; }
  toCourse(row, 'manual', data);
}

// —————————————————— iCal ——————————————————

function normalizeIcs(text: string, data: NormalizedData): NormalizedCourse[] {
  const cal = parseIcs(text);
  const courses: NormalizedCourse[] = [];
  for (const evt of cal.events) {
    const start = evt.dtstart ? parseCalDateTime(evt.dtstart) : undefined;
    if (!start) { reportConflict(data, 'ical_missing_dtstart', `VEVENT 缺少可解析的 DTSTART: ${evt.uid}`, evt); continue; }
    const end = evt.dtend ? parseCalDateTime(evt.dtend) : undefined;
    const [name, teacher, room] = splitSummary(evt.summary ?? '未命名课程');
    const course: NormalizedCourse = {
      source: 'manual',
      external_id: evt.uid || `${name}-${start.getTime()}`,
      name,
      teacher,
      room: room ?? evt.location,
      day_of_week: dateToWeekday(start),
      start_time: `${pad(start.getUTCHours())}:${pad(start.getUTCMinutes())}`,
      end_time: end ? `${pad(end.getUTCHours())}:${pad(end.getUTCMinutes())}` : '00:00',
      week_parity: 'all',
      term: `${start.getUTCFullYear()}-${termSeason(start.getUTCMonth())}`,
      category: 'required',
    };
    const err = validateCourse(course);
    if (err) { reportConflict(data, 'invalid_ical_course', err, evt); continue; }
    courses.push(course);
  }
  return courses;
}

function splitSummary(summary: string): [string, string | undefined, string | undefined] {
  const parts = summary.split(/\s+/).filter(Boolean);
  return [parts[0] ?? summary, parts[1], parts[2]];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function termSeason(month: number): 'Spring' | 'Fall' {
  return month >= 8 || month <= 1 ? 'Fall' : 'Spring';
}
