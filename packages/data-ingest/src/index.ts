/**
 * packages/data-ingest — 对外出口
 *
 * 只导出「数据接入」所需的 API。所有类型与语义以 `docs/data-model.md` 为权威；
 * 本包类型与契约（`packages/contracts`）应保持一致。
 */

// —— 数据模型 ——
export type {
  DataSource,
  WeekParity,
  CourseCategory,
  AssessmentDimension,
  GradeLevel,
  GradeScoreType,
  AcademicSource,
  StudentProfile,
  NormalizedCourse,
  NormalizedAssessment,
  NormalizedGrade,
  Conflict,
  RawMeta,
  NormalizedData,
  NormalizedOutcome,
} from './model.ts';

// —— 归一化工具 ——
export {
  isTime,
  normalizeTime,
  parseDayOfWeek,
  parseWeekParity,
  parseCourseCategory,
  parseScoreType,
  validateCourse,
  newNormalizedData,
  reportConflict,
  reportWarning,
  makeCourseId,
} from './normalize.ts';

// —— 幂等去重 ——
export {
  identityKey,
  courseKey,
  assessmentKey,
  gradeKey,
  partitionNew,
  unionKeys,
} from './dedupe.ts';
export type { Keyed, Partition } from './dedupe.ts';

// —— 键存储 ——
export { MemoryKeyStore } from './key-store.ts';
export type { IngestionKeyStore } from './key-store.ts';

// —— 错误 / 冲突 ——
export { IngestionError, conflict, hasConflicts } from './errors.ts';
export type { IngestionErrorKind } from './errors.ts';

// —— 事件 ——
export {
  NoopEventSink,
  makeEvent,
  emitDataSynced,
  emitAssessmentNew,
  emitGradeNew,
  buildSyncEvents,
} from './events.ts';
export type {
  EventEnvelope,
  EventActor,
  EventSink,
  DataSyncedPayload,
  AssessmentNewPayload,
  GradeNewPayload,
  NormalizedEventsOutput,
} from './events.ts';

// —— 同步报告 ——
export { buildReport, emptyCounts, resolveStatus } from './report.ts';
export type { SyncReport, SyncStatus, SyncCounts } from './report.ts';

// —— 流水线 ——
export { runSync, IngestionFailedError } from './pipeline.ts';
export type { RunSyncOptions } from './pipeline.ts';

// —— 适配器契约 ——
export type { Adapter, SyncContext, Crawler } from './adapters/types.ts';
export { CloudAdapter } from './adapters/cloud.ts';
export type { CloudRawPayload, CloudCourseRow, CloudAssessmentRow, CloudGradeRow } from './adapters/cloud.ts';
export { ManageBacAdapter } from './adapters/managebac.ts';
export type { ManageBacRawPayload } from './adapters/managebac.ts';
export { ManualAdapter } from './adapters/manual.ts';
export type { ManualRaw } from './adapters/manual.ts';

// —— CSV / iCal 工具 ——
export { csvToRows, parseCsvMatrix, pick } from './csv.ts';
export type { CsvRow } from './csv.ts';
export { parseIcs, parseCalDateTime, dateToWeekday } from './ical.ts';
export type { CalEvent, CalCalendar } from './ical.ts';
