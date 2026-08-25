/**
 * ManageBac 适配器（source: managebac）
 *
 * ⚠️ 当前为「框架 + 中间格式契约」，真实爬虫尚未接入。
 * ManageBac 的接入方式（API / 导出 / 手动）与数据结构正在 Phase 0 调研。
 *
 * 与 `cloud.ts` 同理：`fetch` 目前是占位，`normalize` 接受 `ManageBacRawPayload`
 * 中间格式（未来由爬虫产出）。拿到真实站点后，注入 `Crawler` 即可。
 */

import type { Adapter, Crawler, SyncContext } from './types.ts';
import type { NormalizedData } from '../model.ts';
import { newNormalizedData } from '../normalize.ts';
import { IngestionError } from '../errors.ts';
import { mapEnvelope } from './normalize-payload.ts';

/** ManageBac 原始载荷（建议形状，待调研确认） */
export interface ManageBacRawPayload {
  student_ref?: string;
  academic_year?: string;
  courses?: unknown[];
  assessments?: unknown[];
  grades?: unknown[];
  /** 爬虫可附带的原始页面 / IB 结构片段 */
  pages?: unknown[];
}

export class ManageBacAdapter implements Adapter {
  readonly source = 'managebac' as const;
  private readonly crawler?: Crawler;

  constructor(crawler?: Crawler) {
    this.crawler = crawler;
  }

  async fetch(ctx: SyncContext): Promise<unknown> {
    if (this.crawler) return this.crawler.fetch(ctx);
    throw new IngestionError(
      'NOT_IMPLEMENTED',
      'ManageBac 爬虫尚未接入。请在确认接入方式（API/导出/手动）后，注入一个 Crawler 实现 fetch()。',
    );
  }

  normalize(_ctx: SyncContext, raw: unknown): NormalizedData {
    const fetchedAt = (_ctx.now ?? new Date()).toISOString();
    const data = newNormalizedData('managebac', 'managebac-raw-payload', fetchedAt);
    if (raw && typeof raw === 'object') {
      mapEnvelope(data, raw as ManageBacRawPayload, 'managebac');
    } else {
      data.raw_meta.conflicts.push({ kind: 'invalid_raw', message: 'ManageBac 原始载荷不是对象', raw });
    }
    return data;
  }
}
