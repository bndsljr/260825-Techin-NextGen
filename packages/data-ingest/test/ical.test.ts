import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseIcs, parseCalDateTime, dateToWeekday } from '../src/ical.ts';

test('parseIcs 抽取 VEVENT', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:c001@bnds',
    'DTSTART:20260901T080000',
    'DTEND:20260901T084500',
    'SUMMARY:数学 王老师 A-301',
    'LOCATION:A-301',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');
  const cal = parseIcs(ics);
  assert.equal(cal.events.length, 1);
  assert.equal(cal.events[0].uid, 'c001@bnds');
  assert.equal(cal.events[0].summary, '数学 王老师 A-301');
  assert.equal(cal.events[0].location, 'A-301');
});

test('parseCalDateTime 解析基本格式', () => {
  const d = parseCalDateTime('20260901T080000');
  assert.ok(d);
  assert.equal(d.getUTCFullYear(), 2026);
  assert.equal(d.getUTCMonth(), 8); // 9 月 -> 0 基 8
  assert.equal(d.getUTCDate(), 1);
  assert.equal(d.getUTCHours(), 8);
  assert.equal(d.getUTCMinutes(), 0);
});

test('dateToWeekday 正确映射', () => {
  // 2026-09-01 是周二
  const d = new Date(Date.UTC(2026, 8, 1, 8, 0, 0));
  assert.equal(dateToWeekday(d), 2);
  // 2026-09-06 是周日
  assert.equal(dateToWeekday(new Date(Date.UTC(2026, 8, 6, 8, 0, 0))), 7);
});

test('unfold 处理折行', () => {
  const ics = [
    'BEGIN:VEVENT',
    'UID:c001@bnds',
    'DESCRIPTION:这是',
    ' 续行的描述',
    'END:VEVENT',
  ].join('\n');
  const cal = parseIcs(ics);
  assert.equal(cal.events[0].description, '这是续行的描述');
});
