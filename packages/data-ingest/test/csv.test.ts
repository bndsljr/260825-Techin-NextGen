import { test } from 'node:test';
import assert from 'node:assert/strict';
import { csvToRows, parseCsvMatrix, pick } from '../src/csv.ts';

test('csvToRows 解析带表头的 CSV', () => {
  const rows = csvToRows('name,age\n张三,18\n李四,19\n');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], { name: '张三', age: '18' });
  assert.deepEqual(rows[1], { name: '李四', age: '19' });
});

test('csvToRows 处理引号字段内的逗号与换行', () => {
  const rows = csvToRows('name,note\n张三,"你好,世界"\n李四,"第一行\n第二行"\n');
  assert.equal(rows[0].note, '你好,世界');
  assert.equal(rows[1].note, '第一行\n第二行');
});

test('csvToRows 跳过注释与空行', () => {
  const rows = csvToRows('# a comment\nname,age\n张三,18\n\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].name, '张三');
});

test('csvToRows 支持 CRLF', () => {
  const rows = csvToRows('a,b\r\n1,2\r\n3,4\r\n');
  assert.equal(rows.length, 2);
  assert.equal(rows[1].a, '3');
});

test('parseCsvMatrix 基本拆行', () => {
  const m = parseCsvMatrix('1,2,3\n4,5,6\n');
  assert.deepEqual(m, [
    ['1', '2', '3'],
    ['4', '5', '6'],
  ]);
});

test('pick 按别名取第一个非空', () => {
  const row = { extern: '', name: '数学', day_of_week: '1' };
  assert.equal(pick(row, ['extern', 'name']), '数学');
  assert.equal(pick(row, ['missing', 'name']), '数学');
  assert.equal(pick(row, ['missing']), undefined);
});
