/**
 * 幂等去重
 *
 * `docs/module-data-ingest.md` 约束：重复同步不产生重复记录，靠 `source + external_id` 去重。
 *
 * 归一化数据里选定的身份键是 `source + external_id`。
 * 流水线用「已入库键集合」（来自 apps/api 存储层）来做增量判断。
 */

import type { NormalizedAssessment, NormalizedCourse, NormalizedGrade } from './model.ts';

/** 生成身份键 */
export function identityKey(source: string, externalId: string): string {
  return `${source}:${externalId}`;
}

export function courseKey(c: NormalizedCourse): string {
  return identityKey(c.source, c.external_id);
}
export function assessmentKey(a: NormalizedAssessment): string {
  return identityKey(a.source, a.external_id);
}
export function gradeKey(g: NormalizedGrade): string {
  return identityKey(g.source, g.external_id);
}

/** 键的简易来源追踪：用于说明某键来自哪条实体 */
export interface Keyed<T> {
  key: string;
  entity: T;
}

function keyed<T>(entities: T[], keyFn: (e: T) => string): Keyed<T>[] {
  return entities.map((entity) => ({ key: keyFn(entity), entity }));
}

/** 对称差：返回「新增的键」与「已存在的键」的实体列表 */
export interface Partition<T> {
  /** 不在已有键集合中（需新增） */
  added: Keyed<T>[];
  /** 已存在（应被幂等忽略） */
  existing: Keyed<T>[];
}

/** 把实体按已有键集合分区 */
export function partitionNew<T>(entities: T[], keyFn: (e: T) => string, existingKeys: ReadonlySet<string>): Partition<T> {
  const added: Keyed<T>[] = [];
  const existing: Keyed<T>[] = [];
  for (const { key, entity } of keyed(entities, keyFn)) {
    if (existingKeys.has(key)) existing.push({ key, entity });
    else added.push({ key, entity });
  }
  return { added, existing };
}

/** 把一个已入库键集合在本次新增后做合并（返回新的 Set） */
export function unionKeys(existing: ReadonlySet<string>, newKeys: Iterable<string>): Set<string> {
  return new Set([...existing, ...newKeys]);
}
