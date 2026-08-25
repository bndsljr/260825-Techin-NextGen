/**
 * 同步报告（Sync Report）
 *
 * 每次 `runSync` 都会产出一份报告，交给 apps/api 再转发给客户端，
 * 用于展示「同步了什么、去重了什么、哪里有冲突/错误」。
 * 对应 `docs/module-data-ingest.md` 第 3 节的 `{ status, counts, errors }`。
 */

import type { Conflict, DataSource, NormalizedData } from './model.ts';

export type SyncStatus = 'success' | 'partial' | 'failed';

export interface SyncCounts {
  courses: number;
  assessments: number;
  grades: number;
}

export interface SyncReport {
  source: DataSource;
  /** success=无错误；partial=有冲突/部分失败但仍产出数据；failed=无法产出数据 */
  status: SyncStatus;
  started_at: string;
  finished_at: string;
  /** 归一化阶段识别到的实体总数 */
  counts: SyncCounts;
  /** 本次新增（未被幂等去重）的实体数 */
  added: SyncCounts;
  /** 因幂等去重而忽略的实体数 */
  deduped: SyncCounts;
  /** 错误（不抛出，记录在案） */
  errors: string[];
  /** 一般性告警 */
  warnings: string[];
  /** 无法识别 / 有歧义的数据 */
  conflicts: Conflict[];
}

export function emptyCounts(): SyncCounts {
  return { courses: 0, assessments: 0, grades: 0 };
}

/** 计算 status 的值 */
export function resolveStatus(hasErrors: boolean, hasData: boolean, hasConflicts: boolean): SyncStatus {
  if (hasErrors) return hasData ? 'partial' : 'failed';
  if (hasConflicts) return 'partial';
  return 'success';
}

/** 由一次归一化结果 + 去重统计构造 SyncReport */
export function buildReport(params: {
  source: DataSource;
  data: NormalizedData;
  added: SyncCounts;
  deduped: SyncCounts;
  startedAt: string;
  finishedAt: string;
  errors?: string[];
}): SyncReport {
  const errors = params.errors ?? [];
  const hasData = params.data.courses.length + params.data.assessments.length + params.data.grades.length > 0;
  const hasConflicts = params.data.raw_meta.conflicts.length > 0;
  return {
    source: params.source,
    status: resolveStatus(errors.length > 0, hasData, hasConflicts),
    started_at: params.startedAt,
    finished_at: params.finishedAt,
    counts: {
      courses: params.data.courses.length,
      assessments: params.data.assessments.length,
      grades: params.data.grades.length,
    },
    added: params.added,
    deduped: params.deduped,
    errors,
    warnings: [...params.data.raw_meta.warnings],
    conflicts: [...params.data.raw_meta.conflicts],
  };
}
