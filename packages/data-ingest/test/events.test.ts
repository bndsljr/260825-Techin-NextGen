import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSyncEvents, NoopEventSink } from '../src/events.ts';
import type { NormalizedAssessment, NormalizedCourse, NormalizedGrade } from '../src/model.ts';

const c = (id: string): NormalizedCourse => ({
  source: 'manual', external_id: id, name: id, day_of_week: 1,
  start_time: '08:00', end_time: '08:45', week_parity: 'all', term: 'T', category: 'required',
});
const a = (id: string): NormalizedAssessment => ({
  source: 'managebac', external_id: id, dimension: 'participation', grade_level: 'good', assessed_at: '2026-01-01T00:00:00+08:00',
});
const g = (id: string): NormalizedGrade => ({
  source: 'managebac', external_id: id, exam_name: '期中', score_type: 'level', exam_date: '2026-01-01',
});

test('buildSyncEvents 生成三类事件', () => {
  const out = buildSyncEvents([c('C1')], [a('A1')], [g('G1')], '2026-09-01T00:00:00Z');
  assert.equal(out.dataSynced.length, 3);
  assert.deepEqual(out.dataSynced.map((e) => e.payload.resource), ['schedule', 'assessment', 'grade']);
  assert.equal(out.assessmentNew.length, 1);
  assert.equal(out.gradeNew.length, 1);
  assert.equal(out.assessmentNew[0].payload.assessment_id, 'A1');

  // 事件信封字段
  const first = out.dataSynced[0];
  assert.equal(first.event, 'data.synced');
  assert.equal(first.actor, 'system');
  assert.ok(first.id.startsWith('evt-'));
});

test('buildSyncEvents 空时不产生事件', () => {
  const out = buildSyncEvents([], [], [], 't');
  assert.equal(out.dataSynced.length, 0);
  assert.equal(out.assessmentNew.length, 0);
  assert.equal(out.gradeNew.length, 0);
});

test('NoopEventSink 收集事件', () => {
  const sink = new NoopEventSink();
  const out = buildSyncEvents([c('C1')], [], [], 't');
  for (const e of out.dataSynced) sink.emit(e);
  assert.equal(sink.emitted.length, 1);
});
