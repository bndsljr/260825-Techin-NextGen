/**
 * 事件契约（对齐 docs/events.md）
 *
 * data-ingest 订阅 `data.ingest_requested`，发布 `data.synced` / `assessment.new` / `grade.new`。
 * 所有事件都通过 `EventSink.emit` 发出，由 `apps/api` 的消息总线统一分发。
 */

import type { NormalizedAssessment, NormalizedCourse, NormalizedGrade } from './model.ts';

export type EventActor = 'system' | 'user' | 'ai';

/** 事件信封 */
export interface EventEnvelope<T = unknown> {
  event: string;
  id: string;
  occurred_at: string;
  actor: EventActor;
  payload: T;
}

/** 事件发送端（由 apps/api 消息总线实现） */
export interface EventSink {
  emit(event: EventEnvelope): void;
}

/** 无操作 sink，供测试 / 无总线场景使用 */
export class NoopEventSink implements EventSink {
  readonly emitted: EventEnvelope[] = [];
  emit(event: EventEnvelope): void {
    this.emitted.push(event);
  }
}

let counter = 0;

/** 生成事件 ID */
export function eventId(prefix = 'evt'): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
}

/** 构造一个信封事件的便捷工厂 */
export function makeEvent<T>(event: string, actor: EventActor, payload: T, occurredAt: string): EventEnvelope<T> {
  return { event, id: eventId(), occurred_at: occurredAt, actor, payload };
}

export interface DataSyncedPayload {
  resource: 'schedule' | 'assessment' | 'grade';
  ids: string[];
}

export interface AssessmentNewPayload {
  assessment_id: string;
}

export interface GradeNewPayload {
  grade_id: string;
}

/** 发布 data.synced（course / assessment / grade 三类资源各自的批量通知） */
export function emitDataSynced(sink: EventSink, resource: DataSyncedPayload['resource'], ids: string[], occurredAt: string): void {
  sink.emit(makeEvent<DataSyncedPayload>('data.synced', 'system', { resource, ids }, occurredAt));
}

/** 发布 assessment.new */
export function emitAssessmentNew(sink: EventSink, assessmentId: string, occurredAt: string): void {
  sink.emit(makeEvent<AssessmentNewPayload>('assessment.new', 'system', { assessment_id: assessmentId }, occurredAt));
}

/** 发布 grade.new */
export function emitGradeNew(sink: EventSink, gradeId: string, occurredAt: string): void {
  sink.emit(makeEvent<GradeNewPayload>('grade.new', 'system', { grade_id: gradeId }, occurredAt));
}

/** 便捷：为一批「已确认为新增」的实体生成同步事件（供 pipeline 使用） */
export interface NormalizedEventsOutput {
  dataSynced: EventEnvelope<DataSyncedPayload>[];
  assessmentNew: EventEnvelope<AssessmentNewPayload>[];
  gradeNew: EventEnvelope<GradeNewPayload>[];
}

/**
 * 生成同步事件。
 * 入参应为**已去重后的新增实体**；内部直接用它们的 `source:external_id` 作为 id。
 */
export function buildSyncEvents(
  courses: NormalizedCourse[],
  assessments: NormalizedAssessment[],
  grades: NormalizedGrade[],
  occurredAt: string,
): NormalizedEventsOutput {
  const dataSynced: EventEnvelope<DataSyncedPayload>[] = [];
  const assessmentNew: EventEnvelope<AssessmentNewPayload>[] = [];
  const gradeNew: EventEnvelope<GradeNewPayload>[] = [];

  if (courses.length > 0) {
    dataSynced.push(makeEvent<DataSyncedPayload>('data.synced', 'system', { resource: 'schedule', ids: courses.map((c) => c.id ?? c.external_id) }, occurredAt));
  }

  if (assessments.length > 0) {
    dataSynced.push(makeEvent<DataSyncedPayload>('data.synced', 'system', { resource: 'assessment', ids: assessments.map((a) => a.id ?? a.external_id) }, occurredAt));
    for (const a of assessments) {
      assessmentNew.push(makeEvent<AssessmentNewPayload>('assessment.new', 'system', { assessment_id: a.id ?? a.external_id }, occurredAt));
    }
  }

  if (grades.length > 0) {
    dataSynced.push(makeEvent<DataSyncedPayload>('data.synced', 'system', { resource: 'grade', ids: grades.map((g) => g.id ?? g.external_id) }, occurredAt));
    for (const g of grades) {
      gradeNew.push(makeEvent<GradeNewPayload>('grade.new', 'system', { grade_id: g.id ?? g.external_id }, occurredAt));
    }
  }

  return { dataSynced, assessmentNew, gradeNew };
}
