/**
 * 归一化流水线（Pipeline）
 *
 * 把「一次数据同步」编排为：
 *   fetch(原始数据) → normalize(归一化) → dedupe(幂等去重)
 *   → emit(事件) → report(汇总)
 *
 * 由 `data.ingest_requested` 事件或定时调度器触发。对 apps/api 而言，
 * 它只负责调用 `runSync` 并拿到 `SyncReport`。所有业务逻辑均在 apps/api 侧，
 * 本包不落库、不写回外部平台、不做任何决策。
 */

import type { Adapter } from './adapters/types.ts';
import type { DataSource, NormalizedData } from './model.ts';
import type { EventSink } from './events.ts';
import { buildSyncEvents, NoopEventSink } from './events.ts';
import { courseKey, assessmentKey, gradeKey, partitionNew, unionKeys } from './dedupe.ts';
import type { SyncReport, SyncCounts } from './report.ts';
import { buildReport, emptyCounts } from './report.ts';
import type { IngestionKeyStore } from './key-store.ts';
import { emptyKeys } from './key-store.ts';

export interface RunSyncOptions {
  /** 事件发送端；缺省为 NoopEventSink（仅记录不外发） */
  sink?: EventSink;
  /** 已入库键集合；缺省为空 */
  existing?: Partial<IngestionKeyStore>;
  /** 出错时：'report' 返回失败报告（默认），'throw' 向上抛出 */
  onError?: 'report' | 'throw';
}

/** 归一化/抓取阶段抛出的错误（附带原始错误，便于上层定位） */
export class IngestionFailedError extends Error {
  readonly original: unknown;
  constructor(message: string, original: unknown) {
    super(message);
    this.name = 'IngestionFailedError';
    this.original = original;
  }
}

/**
 * 执行一次同步。
 * @param adapter 数据源适配器（决定了 fetch + normalize）
 * @returns SyncReport —— 即使失败也会返回，方便上层统一上报
 */
export async function runSync(adapter: Adapter, opts: RunSyncOptions = {}): Promise<SyncReport> {
  const sink = opts.sink ?? new NoopEventSink();
  const existing: IngestionKeyStore = { ...emptyKeys(), ...opts.existing };
  const startedAt = new Date().toISOString();

  let data: NormalizedData;
  try {
    const raw = await adapter.fetch({ source: adapter.source, now: new Date() });
    data = adapter.normalize({ source: adapter.source, now: new Date() }, raw);
  } catch (err) {
    const finishedAt = new Date().toISOString();
    const message = err instanceof Error ? err.message : `同步失败：${String(err)}`;
    if (opts.onError === 'throw') {
      throw new IngestionFailedError(`[${adapter.source}] ${message}`, err);
    }
    return buildReport({
      source: adapter.source,
      data: emptyNormalized(adapter.source, startedAt),
      added: emptyCounts(),
      deduped: emptyCounts(),
      startedAt,
      finishedAt,
      errors: [message],
    });
  }

  const finishedAt = new Date().toISOString();

  // —— 幂等去重：只保留「新增」实体 ——
  const addedCourses = partitionNew(data.courses, courseKey, existing.courses).added.map((k) => k.entity);
  const addedAssessments = partitionNew(data.assessments, assessmentKey, existing.assessments).added.map((k) => k.entity);
  const addedGrades = partitionNew(data.grades, gradeKey, existing.grades).added.map((k) => k.entity);

  // —— 事件：只对新增实体发 data.synced / assessment.new / grade.new ——
  const generated = buildSyncEvents(addedCourses, addedAssessments, addedGrades, finishedAt);
  for (const e of generated.dataSynced) sink.emit(e);
  for (const e of generated.assessmentNew) sink.emit(e);
  for (const e of generated.gradeNew) sink.emit(e);

  const added: SyncCounts = {
    courses: addedCourses.length,
    assessments: addedAssessments.length,
    grades: addedGrades.length,
  };
  const deduped: SyncCounts = {
    courses: data.courses.length - addedCourses.length,
    assessments: data.assessments.length - addedAssessments.length,
    grades: data.grades.length - addedGrades.length,
  };

  return buildReport({ source: adapter.source, data, added, deduped, startedAt, finishedAt });
}

function emptyNormalized(source: DataSource, fetchedAt: string): NormalizedData {
  return {
    courses: [],
    assessments: [],
    grades: [],
    raw_meta: { source, fetched_at: fetchedAt, raw_format: 'unknown', conflicts: [], warnings: [] },
  };
}

export { unionKeys };
