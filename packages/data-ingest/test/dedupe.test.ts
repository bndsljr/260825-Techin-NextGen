import { test } from 'node:test';
import assert from 'node:assert/strict';
import { identityKey, courseKey, partitionNew, unionKeys } from '../src/dedupe.ts';
import type { NormalizedCourse } from '../src/model.ts';

function course(external_id: string): NormalizedCourse {
  return {
    source: 'manual',
    external_id,
    name: '数学',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    week_parity: 'all',
    term: '2026-Fall',
    category: 'required',
  };
}

test('identityKey 拼接 source:external_id', () => {
  assert.equal(identityKey('cloud', 'C1'), 'cloud:C1');
  assert.equal(courseKey(course('C1')), 'manual:C1');
});

test('partitionNew 区分新增与已存在', () => {
  const items = [course('C1'), course('C2'), course('C3')];
  const existing = new Set(['manual:C2']);
  const { added, existing: found } = partitionNew(items, courseKey, existing);
  assert.deepEqual(added.map((k) => k.key), ['manual:C1', 'manual:C3']);
  assert.deepEqual(found.map((k) => k.key), ['manual:C2']);
});

test('unionKeys 合并集合', () => {
  const merged = unionKeys(new Set(['a']), ['b', 'c']);
  assert.deepEqual([...merged].sort(), ['a', 'b', 'c']);
});
