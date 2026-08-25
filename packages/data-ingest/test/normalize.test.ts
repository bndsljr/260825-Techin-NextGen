import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeTime,
  parseDayOfWeek,
  parseWeekParity,
  parseCourseCategory,
  parseScoreType,
  validateCourse,
  isTime,
} from '../src/normalize.ts';
import type { NormalizedCourse } from '../src/model.ts';

test('normalizeTime 规整为 HH:mm', () => {
  assert.equal(normalizeTime('8:00'), '08:00');
  assert.equal(normalizeTime('09:05'), '09:05');
  assert.equal(normalizeTime('25:00'), undefined);
  assert.equal(normalizeTime('12:60'), undefined);
  assert.equal(normalizeTime('abc'), undefined);
});

test('isTime 校验', () => {
  assert.equal(isTime('08:00'), true);
  assert.equal(isTime('8:00'), true);
  assert.equal(isTime('9:99'), false);
});

test('parseDayOfWeek 支持多种表示', () => {
  assert.equal(parseDayOfWeek(3), 3);
  assert.equal(parseDayOfWeek('3'), 3);
  assert.equal(parseDayOfWeek('周二'), 2);
  assert.equal(parseDayOfWeek('周日'), 7);
  assert.equal(parseDayOfWeek('周五'), 5);
  assert.equal(parseDayOfWeek('Monday'), 1);
  assert.equal(parseDayOfWeek('friday'), 5);
  assert.equal(parseDayOfWeek('十三'), undefined);
});

test('parseWeekParity 支持中英文', () => {
  assert.equal(parseWeekParity('all'), 'all');
  assert.equal(parseWeekParity('双周'), 'even');
  assert.equal(parseWeekParity('单'), 'odd');
  assert.equal(parseWeekParity('every'), 'all');
  assert.equal(parseWeekParity('什么'), undefined);
});

test('parseCourseCategory', () => {
  assert.equal(parseCourseCategory('必修'), 'required');
  assert.equal(parseCourseCategory('选修'), 'elective');
  assert.equal(parseCourseCategory('club'), 'club');
  assert.equal(parseCourseCategory('自习'), 'self_study');
  assert.equal(parseCourseCategory('zzz'), undefined);
});

test('parseScoreType', () => {
  assert.equal(parseScoreType('score'), 'score');
  assert.equal(parseScoreType('等级'), 'level');
  assert.equal(parseScoreType('92'), 'score');
  assert.equal(parseScoreType('other'), undefined);
});

function course(over: Partial<NormalizedCourse>): NormalizedCourse {
  return {
    source: 'manual',
    external_id: 'C1',
    name: '数学',
    day_of_week: 1,
    start_time: '08:00',
    end_time: '08:45',
    week_parity: 'all',
    term: '2026-Fall',
    category: 'required',
    ...over,
  };
}

test('validateCourse 接受合法课程', () => {
  assert.equal(validateCourse(course({})), null);
});

test('validateCourse 拒绝非法课程', () => {
  assert.notEqual(validateCourse(course({ name: '' })), null);
  assert.notEqual(validateCourse(course({ day_of_week: 8 as 1 })), null);
  assert.notEqual(validateCourse(course({ start_time: '09:00', end_time: '08:00' })), null);
  assert.notEqual(validateCourse(course({ external_id: '' })), null);
});
