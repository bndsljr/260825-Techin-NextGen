/**
 * 十一学校云平台适配器（source: cloud）
 *
 * ⚠️ 当前为「框架 + 中间格式契约」，真实爬虫尚未接入。
 * 云平台的接入方式（API / 导出 / 手动）与数据结构正在 Phase 0 调研。
 *
 * 本文件定义了两件事，方便后续接入：
 *   1. `CloudRawPayload` —— 爬虫与归一化器之间约定的「中间格式」。
 *      将来你写爬虫时，让爬虫把平台页面/接口解析成这个形状即可，
 *      `normalize` 就能直接把它转成归一化模型。
 *   2. `fetch` —— 目前是占位：如果注入了 `Crawler` 就用它抓取，
 *      否则抛出 `NOT_IMPLEMENTED`。等拿到真实站点后，填上爬虫即可。
 *
 * 中间格式字段名是**建议性**的，实际抓取后可能调整（见各 `_row` 的别名）。
 */

import type { Adapter, Crawler, SyncContext } from './types.ts';
import type { NormalizedData } from '../model.ts';
import { newNormalizedData } from '../normalize.ts';
import { IngestionError } from '../errors.ts';
import { mapEnvelope } from './normalize-payload.ts';

/** 云平台课程原始行（建议形状，待调研确认） */
export interface CloudCourseRow {
  id?: string;
  name?: string;
  title?: string;
  teacher?: string;
  room?: string;
  day_of_week?: unknown;
  start_time?: string;
  end_time?: string;
  week_parity?: unknown;
  term?: string;
  category?: unknown;
}

export interface CloudAssessmentRow {
  id?: string;
  course_id?: string;
  dimension?: string;
  grade_level?: string;
  comment?: string;
  assessed_at?: string;
}

export interface CloudGradeRow {
  id?: string;
  course_id?: string;
  exam_name?: string;
  score?: number | string;
  score_type?: string;
  max_score?: number;
  weight?: number;
  exam_date?: string;
}

/** 云平台原始载荷（爬虫产出的中间格式） */
export interface CloudRawPayload {
  student_id?: string;
  term?: string;
  courses?: unknown[];
  assessments?: unknown[];
  grades?: unknown[];
  /** 爬虫可附带原始页面/片段，便于排查 */
  pages?: unknown[];
}

export class CloudAdapter implements Adapter {
  readonly source = 'cloud' as const;
  private readonly crawler?: Crawler;

  constructor(crawler?: Crawler) {
    this.crawler = crawler;
  }

  async fetch(ctx: SyncContext): Promise<unknown> {
    if (this.crawler) return this.crawler.fetch(ctx);
    throw new IngestionError(
      'NOT_IMPLEMENTED',
      '云平台爬虫尚未接入。请在确认接入方式（API/导出/手动）后，注入一个 Crawler 实现 fetch()。',
    );
  }

  normalize(_ctx: SyncContext, raw: unknown): NormalizedData {
    const fetchedAt = (_ctx.now ?? new Date()).toISOString();
    const data = newNormalizedData('cloud', 'cloud-raw-payload', fetchedAt);
    if (raw && typeof raw === 'object') {
      mapEnvelope(data, raw as CloudRawPayload, 'cloud');
    } else {
      data.raw_meta.conflicts.push({ kind: 'invalid_raw', message: '云平台原始载荷不是对象', raw });
    }
    return data;
  }
}
