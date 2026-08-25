import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runSync } from '../src/pipeline.ts';
import { ManualAdapter } from '../src/adapters/manual.ts';
import { CloudAdapter } from '../src/adapters/cloud.ts';
import { NoopEventSink } from '../src/events.ts';
import { MemoryKeyStore, emptyKeys } from '../src/key-store.ts';
import { courseKey, assessmentKey, gradeKey } from '../src/dedupe.ts';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}
function manualRaw(): Record<string, unknown> {
  return JSON.parse(fixture('manual-courses.json')) as Record<string, unknown>;
}

test('runSync 首次同步成功并产生事件', async () => {
  const adapter = new ManualAdapter(manualRaw());
  const sink = new NoopEventSink();
  const report = await runSync(adapter, {
    sink,
    existing: emptyKeys(),
  });
  assert.equal(report.status, 'success');
  assert.equal(report.counts.courses, 3);
  assert.equal(report.counts.assessments, 1);
  assert.equal(report.counts.grades, 1);
  assert.equal(report.added.courses, 3);
  assert.equal(report.added.assessments, 1);
  assert.equal(report.added.grades, 1);

  const events = sink.emitted.map((e) => e.event);
  assert.ok(events.includes('data.synced'));
  assert.ok(events.includes('assessment.new'));
  assert.ok(events.includes('grade.new'));
});

test('runSync 第二次同步全部被幂等去重', async () => {
  const adapter = new ManualAdapter(manualRaw());
  const store = new MemoryKeyStore();
  const first = await runSync(adapter, { sink: new NoopEventSink(), existing: emptyKeys() });

  // 把首次同步的实体标记为已入库
  const normalized = adapter.normalize({ source: 'manual' }, manualRaw());
  store.mark(normalized.courses, normalized.assessments, normalized.grades);
  void first;

  const sink = new NoopEventSink();
  const second = await runSync(adapter, { sink, existing: store.snapshot() });
  assert.equal(second.status, 'success');
  assert.equal(second.added.courses, 0);
  assert.equal(second.deduped.courses, 3);
  assert.equal(second.added.assessments, 0);
  assert.equal(second.deduped.assessments, 1);
  assert.equal(sink.emitted.length, 0); // 没有新事件
});

test('runSync 部分已入库时只对新增发事件', async () => {
  const adapter = new ManualAdapter(manualRaw());
  const store = new MemoryKeyStore();
  const normalized = adapter.normalize({ source: 'manual' }, manualRaw());
  // 只入库第一门课
  store.mark([normalized.courses[0]], [], []);

  const sink = new NoopEventSink();
  const report = await runSync(adapter, { sink, existing: store.snapshot() });
  assert.equal(report.added.courses, 2);
  assert.equal(report.deduped.courses, 1);
  // 仍有 assessment / grade 新增
  assert.equal(report.added.assessments, 1);
  assert.equal(report.added.grades, 1);
  assert.ok(sink.emitted.some((e) => e.event === 'assessment.new'));
});

test('runSync 用 cloud 爬虫端到端', async () => {
  const crawler = { fetch: async () => JSON.parse(fixture('cloud.json')) };
  const adapter = new CloudAdapter(crawler);
  const sink = new NoopEventSink();
  const report = await runSync(adapter, { sink, existing: emptyKeys() });
  assert.equal(report.source, 'cloud');
  assert.equal(report.status, 'success');
  assert.equal(report.counts.courses, 32);       // 真实课表
  assert.equal(report.counts.assessments, 0);    // 过程性评价暂未评价
  assert.equal(report.counts.grades, 0);
  assert.equal(report.added.courses, 32);
});

test('runSync 适配器未接入时返回失败报告', async () => {
  const adapter = new CloudAdapter(); // 无爬虫
  const report = await runSync(adapter, { existing: emptyKeys() });
  assert.equal(report.status, 'failed');
  assert.ok(report.errors.length > 0);
});
