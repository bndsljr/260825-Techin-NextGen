/**
 * 幂等键存储（Key Store）
 *
 * `packages/data-ingest` 只负责去重判断，不负责持久化。这里定义的
 * `IngestionKeyStore` 是「已入库 identity key」的只读视图，由 apps/api 的
 * 存储层实现；`MemoryKeyStore` 是内存版，供测试与本地演示使用。
 *
 * identity key = `source:external_id`，见 `src/dedupe.ts`。
 */

import type { NormalizedAssessment, NormalizedCourse, NormalizedGrade } from './model.ts';
import { courseKey, assessmentKey, gradeKey } from './dedupe.ts';

export interface IngestionKeyStore {
  readonly courses: ReadonlySet<string>;
  readonly assessments: ReadonlySet<string>;
  readonly grades: ReadonlySet<string>;
}

export function emptyKeys(): IngestionKeyStore {
  return {
    courses: new Set<string>(),
    assessments: new Set<string>(),
    grades: new Set<string>(),
  };
}

/** 内存版键存储：记录已入库的 identity key，供测试 / 单进程演示 */
export class MemoryKeyStore {
  private readonly courses = new Set<string>();
  private readonly assessments = new Set<string>();
  private readonly grades = new Set<string>();

  snapshot(): IngestionKeyStore {
    return {
      courses: new Set(this.courses),
      assessments: new Set(this.assessments),
      grades: new Set(this.grades),
    };
  }

  hasCourse(key: string): boolean {
    return this.courses.has(key);
  }
  hasAssessment(key: string): boolean {
    return this.assessments.has(key);
  }
  hasGrade(key: string): boolean {
    return this.grades.has(key);
  }

  /** 记录一批归一化实体为「已入库」状态 */
  mark(courses: NormalizedCourse[], assessments: NormalizedAssessment[], grades: NormalizedGrade[]): void {
    for (const c of courses) this.courses.add(courseKey(c));
    for (const a of assessments) this.assessments.add(assessmentKey(a));
    for (const g of grades) this.grades.add(gradeKey(g));
  }
}
