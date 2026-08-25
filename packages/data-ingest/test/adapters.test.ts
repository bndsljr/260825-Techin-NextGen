import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ManualAdapter } from '../src/adapters/manual.ts';
import { CloudAdapter } from '../src/adapters/cloud.ts';
import { ManageBacAdapter } from '../src/adapters/managebac.ts';
import type { SyncContext } from '../src/adapters/types.ts';
import { IngestionError } from '../src/errors.ts';

function fixture(name: string): string {
  return readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
}
function ctx(source: 'manual' | 'cloud' | 'managebac'): SyncContext {
  return { source, now: new Date('2026-09-01T00:00:00.000Z') };
}

test('manual JSON 信封归一化', () => {
  const adapter = new ManualAdapter();
  const raw = JSON.parse(fixture('manual-courses.json'));
  const data = adapter.normalize(ctx('manual'), raw);
  assert.equal(data.courses.length, 3);
  assert.equal(data.assessments.length, 1);
  assert.equal(data.grades.length, 1);

  const math = data.courses.find((c) => c.external_id === 'MATH-001')!;
  assert.equal(math.name, '数学');
  assert.equal(math.day_of_week, 1);
  assert.equal(math.start_time, '08:00');
  assert.equal(math.week_parity, 'all');

  const eng = data.courses.find((c) => c.external_id === 'ENG-002')!;
  assert.equal(eng.day_of_week, 2); // 周二
  assert.equal(eng.start_time, '09:00'); // 9:00 -> 09:00
  assert.equal(eng.week_parity, 'even'); // 双周
  assert.equal(eng.category, 'elective');
});

test('manual CSV 归一化', () => {
  const adapter = new ManualAdapter();
  const data = adapter.normalize(ctx('manual'), fixture('manual-courses.csv'));
  assert.equal(data.courses.length, 3);
  const robot = data.courses.find((c) => c.external_id === 'ROBOT-CLUB')!;
  assert.equal(robot.name, '机器人社');
  assert.equal(robot.day_of_week, 7);
  assert.equal(robot.category, 'club');
  // 周二的英语：day 2, week_parity even
  const eng = data.courses.find((c) => c.external_id === 'ENG-002')!;
  assert.equal(eng.day_of_week, 2);
  assert.equal(eng.week_parity, 'even');
});

test('manual iCal 归一化', () => {
  const adapter = new ManualAdapter();
  const data = adapter.normalize(ctx('manual'), fixture('manual-courses.ics'));
  assert.equal(data.courses.length, 2);
  // 2026-09-01(周二); SUMMARY "数学 王老师 A-301"
  const math = data.courses.find((c) => c.external_id === 'c001-2026fall@bnds')!;
  assert.equal(math.name, '数学');
  assert.equal(math.teacher, '王老师');
  assert.equal(math.day_of_week, 2);
  assert.equal(math.start_time, '08:00');
  assert.equal(math.term, '2026-Fall'); // 9 月 > 8 -> Fall
});

test('cloud 适配器归一化（真实课表 + 个人档案）', () => {
  const crawler = { fetch: async () => JSON.parse(fixture('cloud.json')) };
  const adapter = new CloudAdapter(crawler);
  const data = adapter.normalize(ctx('cloud'), JSON.parse(fixture('cloud.json')));
  // 真实抓取：本学期课表 32 节；过程性评价暂未评价；无成绩
  assert.equal(data.courses.length, 32);
  assert.equal(data.assessments.length, 0);
  assert.equal(data.grades.length, 0);
  assert.equal(data.raw_meta.conflicts.length, 0);

  const bio = data.courses.find((c) => c.external_id === 'fdd50ce3-8dc9-4e46-a0d0-f78241110661:33')!;
  assert.equal(bio.name, '生物ⅡA-4');
  assert.equal(bio.day_of_week, 3);
  assert.equal(bio.start_time, '09:50');
  assert.equal(bio.end_time, '10:35');
  assert.equal(bio.room, 'S101A');
  assert.equal(bio.term, '2026-2027学年上学期');

  // 个人档案（fixture 已脱敏，仅校验结构与关键字段）
  assert.ok(data.profile);
  assert.equal(data.profile!.name, '张同学');
  assert.equal(data.profile!.gradeLevel, '高一');
  assert.equal(data.profile!.studyCode, '2611xxxx');
  assert.ok(data.profile!.guardians?.length === 1);
  // 云平台性别不可采信：gender 必须为空
  assert.equal(data.profile!.gender, undefined);
});

test('managebac 适配器归一化', () => {
  const adapter = new ManageBacAdapter();
  const raw = JSON.parse(fixture('managebac.json'));
  const data = adapter.normalize(ctx('managebac'), raw);
  assert.equal(data.courses.length, 1);
  assert.equal(data.grades.length, 1);
  const grad = data.grades[0];
  assert.equal(grad.score_type, 'level');
  assert.equal(grad.score, 6); // IB level
});

test('cloud/managebac fetch 未接入时抛 NOT_IMPLEMENTED', async () => {
  const cloud = new CloudAdapter();
  await assert.rejects(() => cloud.fetch(ctx('cloud')), (e: unknown) => {
    assert.ok(e instanceof IngestionError);
    assert.equal((e as IngestionError).kind, 'NOT_IMPLEMENTED');
    return true;
  });
});
