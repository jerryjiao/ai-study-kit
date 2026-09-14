// records.test.mjs — 契约二学习记录解析器单测（node:test，随 pnpm test 的 glob 跑）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSessionRecord } from './records.mjs';

// 契约二现行格式（v0.13 起含「## 口头题计数」节）
const FULL = `---
id: 5
topic: HTTP 状态码
mode: two-step
status: in-progress
---

## 已过考点
- 状态码家族划分 · 金句：「4xx 怪客户端，5xx 怪服务端」
- EP-03 3xx 重定向辨析 · 金句：「301 永久搬家，302 临时出门」
- 4xx 具体码辨析

## 错的点
- 复述时把 301/302 方向说反——已当场纠（§7 四拍），变体已补答对

## 待办
- [x] 家族划分
- [x] 3xx 重定向
- [ ] 4xx 具体码辨析

## 口头题计数
- EP-01 状态码家族划分：问 3 对 2
- 3xx 重定向辨析：问 2 对 2
`;

test('新格式全量解析：frontmatter + 四节正文', () => {
  const r = parseSessionRecord(FULL);
  assert.equal(r.legacy, false);
  assert.equal(r.id, 5);
  assert.equal(r.topic, 'HTTP 状态码');
  assert.equal(r.mode, 'two-step');
  assert.equal(r.status, 'in-progress');
  assert.deepEqual(r.passed, [
    { ep: null, name: '状态码家族划分', golden: '4xx 怪客户端，5xx 怪服务端' },
    { ep: 'EP-03', name: '3xx 重定向辨析', golden: '301 永久搬家，302 临时出门' },
    { ep: null, name: '4xx 具体码辨析', golden: null },
  ]);
  assert.deepEqual(r.wrongPoints, [
    '复述时把 301/302 方向说反——已当场纠（§7 四拍），变体已补答对',
  ]);
  assert.deepEqual(r.todos, [
    { text: '家族划分', done: true },
    { text: '3xx 重定向', done: true },
    { text: '4xx 具体码辨析', done: false },
  ]);
  assert.deepEqual(r.oral, [
    { ep: 'EP-01', name: '状态码家族划分', asked: 3, correct: 2 },
    { ep: null, name: '3xx 重定向辨析', asked: 2, correct: 2 },
  ]);
});

test('旧格式（无计数节、无 frontmatter）：照常解析、oral 缺省为空数组', () => {
  const r = parseSessionRecord(`# 第 5 站 · HTTP 状态码

## 已过考点
- 状态码家族划分 · 金句：「4xx 怪客户端，5xx 怪服务端」

## 待办
- [ ] 4xx 具体码辨析
`);
  assert.equal(r.legacy, true);
  assert.equal(r.id, null);
  assert.equal(r.topic, null);
  assert.equal(r.mode, null);
  assert.equal(r.status, null);
  assert.deepEqual(r.passed, [
    { ep: null, name: '状态码家族划分', golden: '4xx 怪客户端，5xx 怪服务端' },
  ]);
  assert.deepEqual(r.oral, []); // 旧记录无计数节不报错、字段缺省
  assert.deepEqual(r.todos, [{ text: '4xx 具体码辨析', done: false }]);
});

test('有 frontmatter 但无口头题计数节（v0.13 前的现行记录）', () => {
  const r = parseSessionRecord(`---
id: 3
topic: git 三区
mode: quick
status: done
---

## 已过考点
- 暂存区

## 错的点

## 待办
- [x] 暂存区
`);
  assert.equal(r.legacy, false);
  assert.equal(r.status, 'done');
  assert.deepEqual(r.passed, [{ ep: null, name: '暂存区', golden: null }]);
  assert.deepEqual(r.oral, []);
  assert.deepEqual(r.wrongPoints, []); // 空节 → 空数组
});

test('frontmatter 残缺容错：未闭合 / 值带引号 / 非数字 id', () => {
  // 未闭合 frontmatter：按旧格式处理，正文照常解析
  const unclosed = parseSessionRecord(`---
id: 5
## 已过考点
- 暂存区
`);
  assert.equal(unclosed.legacy, true);
  assert.equal(unclosed.id, null);
  assert.deepEqual(unclosed.passed, [{ ep: null, name: '暂存区', golden: null }]);

  // 值带引号 / 空白：剥引号、trim
  const quoted = parseSessionRecord(`---
id: "7"
topic:   软件设计 · DFD
mode: deep
status: done
---

## 已过考点
`);
  assert.equal(quoted.id, 7);
  assert.equal(quoted.topic, '软件设计 · DFD');

  // 非数字 id：原样存字符串，不抛错
  const strId = parseSessionRecord(`---
id: 05-git
topic: x
---

## 已过考点
`);
  assert.equal(strId.id, '05-git');
});

test('口头题计数行宽容：无空格 / 英文冒号 / 无 EP 前缀', () => {
  const r = parseSessionRecord(`---
id: 1
topic: t
status: in-progress
---

## 口头题计数
- EP-02 chmod:问3对2
- 相对路径：问 1 对 1
- 格式跑偏的行照旧忽略
`);
  assert.deepEqual(r.oral, [
    { ep: 'EP-02', name: 'chmod', asked: 3, correct: 2 },
    { ep: null, name: '相对路径', asked: 1, correct: 1 },
  ]);
});

test('金句缺失引号 / 已过考点带 EP 无金句：字段缺省不抛错', () => {
  const r = parseSessionRecord(`---
id: 2
topic: t
status: done
---

## 已过考点
- EP-01 暂存区 · 金句：4xx 怪客户端
- EP-02 revert
`);
  assert.deepEqual(r.passed, [
    { ep: 'EP-01', name: '暂存区', golden: '4xx 怪客户端' },
    { ep: 'EP-02', name: 'revert', golden: null },
  ]);
});

test('空文本与杂文本：全缺省、不抛错', () => {
  const empty = parseSessionRecord('');
  assert.equal(empty.legacy, true);
  assert.deepEqual(empty.passed, []);
  assert.deepEqual(empty.oral, []);
  assert.deepEqual(empty.todos, []);
  assert.deepEqual(empty.wrongPoints, []);
  const junk = parseSessionRecord('随便一段话，没有任何节。');
  assert.equal(junk.legacy, true);
  assert.deepEqual(junk.passed, []);
});
