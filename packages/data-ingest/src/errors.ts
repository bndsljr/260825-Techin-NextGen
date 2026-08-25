/**
 * 数据接入错误与冲突处理
 *
 * - 适配器 / 流水线抛出的错误集中在这里，便于上层区分「可重试」「不可重试」。
 * - `Conflict`（无法识别 / 有歧义的数据）**不抛错**，而是收纳进 `raw_meta.conflicts`
 *   交给后端人工处理 —— 这与 `docs/module-data-ingest.md` 第 4 节一致。
 */

import type { Conflict, NormalizedData } from './model.ts';

export type IngestionErrorKind =
  /** 凭证缺失 / 授权失败，需用户重新授权 */
  | 'AUTH_REQUIRED'
  /** 外部平台网络 / 服务不可用，可重试 */
  | 'UPSTREAM_UNAVAILABLE'
  /** 平台返回了意料之外的结构，解析失败 */
  | 'INVALID_RAW'
  /** 爬虫 / 解析器尚未接入（占位适配器） */
  | 'NOT_IMPLEMENTED'
  /** 平台限流 / 反爬 */
  | 'RATE_LIMITED';

export class IngestionError extends Error {
  readonly kind: IngestionErrorKind;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(kind: IngestionErrorKind, message: string, opts?: { retryable?: boolean; cause?: unknown }) {
    super(message);
    this.name = 'IngestionError';
    this.kind = kind;
    this.retryable = opts?.retryable ?? isRetryable(kind);
    this.cause = opts?.cause;
  }
}

function isRetryable(kind: IngestionErrorKind): boolean {
  return kind === 'UPSTREAM_UNAVAILABLE' || kind === 'RATE_LIMITED';
}

/** 收集一条冲突记录 */
export function conflict(kind: string, message: string, raw?: unknown): Conflict {
  return { kind, message, ...(raw === undefined ? {} : { raw }) };
}

/** 把一条 NormalizedData 汇总为「整体是否有需人工处理的冲突」 */
export function hasConflicts(data: NormalizedData): boolean {
  return data.raw_meta.conflicts.length > 0;
}
