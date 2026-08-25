/**
 * 数据接入 CLI 演示
 *
 * 用法：`node src/cli.ts <path-to-file>`
 *   - `.json`：JSON 信封 `{ courses?, assessments?, grades? }`
 *   - `.csv` / `.ics`：课程表导入
 *   演示「fetch → normalize → dedupe → emit → report」的完整流程。
 *
 * 示例：`node src/cli.ts test/fixtures/manual-courses.json`
 */

import { readFileSync } from 'node:fs';
import { runSync } from './pipeline.ts';
import { ManualAdapter } from './adapters/manual.ts';
import { NoopEventSink } from './events.ts';
import { emptyKeys, MemoryKeyStore } from './key-store.ts';
import type { ManualRaw } from './adapters/manual.ts';

function loadRaw(path: string): ManualRaw {
  const content = readFileSync(path, 'utf8');
  if (path.endsWith('.json')) {
    return JSON.parse(content) as ManualRaw;
  }
  return content;
}

async function main(): Promise<void> {
  const file = process.argv[2];
  if (!file) {
    console.error('用法: node src/cli.ts <path-to-file>  (支持 .json / .csv / .ics)');
    process.exit(1);
  }

  const adapter = new ManualAdapter(loadRaw(file));
  const sink = new NoopEventSink();
  const store = new MemoryKeyStore();

  // 第一次同步
  const report1 = await runSync(adapter, { sink, existing: emptyKeys() });

  // 用首次结果回填键存储
  const normalized = adapter.normalize({ source: 'manual' }, loadRaw(file));
  store.mark(normalized.courses, normalized.assessments, normalized.grades);

  // 第二次同步（应全部被去重）
  const report2 = await runSync(adapter, { sink, existing: store.snapshot() });

  console.log('\n=== 归一化实体 ===');
  console.log(`课程 ${normalized.courses.length} · 评价 ${normalized.assessments.length} · 成绩 ${normalized.grades.length}`);
  for (const c of normalized.courses) {
    console.log(`  ${c.external_id}  ${c.name}  周${c.day_of_week} ${c.start_time}-${c.end_time} [${c.week_parity}] ${c.term} ${c.category}`);
  }

  console.log('\n=== 第一次同步报告 ===');
  console.log(JSON.stringify(report1, null, 2));

  console.log('\n=== 第二次同步报告（幂等去重） ===');
  console.log(JSON.stringify(report2, null, 2));

  console.log('\n=== 本次发出的事件 ===');
  for (const e of sink.emitted) {
    console.log(`  ${e.event}  actor=${e.actor}  ${JSON.stringify(e.payload)}`);
  }
}

await main();
