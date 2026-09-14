// panorama.test.mjs — 考点全景图数据层单测（node:test）。
// fixture：学习记录（parseSessionRecord 输出）+ 答题进度 + 课清单 → 期望全景形状。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPanorama } from './panorama.mjs';
import { parseSessionRecord } from './records.mjs';
import { epNameMap, epDayMap } from './mastery.mjs';

// 排布表（dev-intro 同构，四考点跨 D1/D2）
const MISSION = `# m

## 考点排布表

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | 暂存区 | 掌握 | single×3, multi×1, judge×1 | D1 | 1 |
| EP-02 | revert | 理解 | single×1, multi×1 | D2 | 1 |
| EP-03 | chmod | 掌握 | single×2 | D2 | 2 |
| EP-04 | 相对路径 | 了解 | judge×1 | D10 | 0 |
`;
const epNames = epNameMap(MISSION);
const epDays = epDayMap(MISSION);

const qs = (pairs) => pairs.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep })));
const questions = qs([['EP-01', ['A', 'B']], ['EP-02', ['C']], ['EP-03', ['D', 'E']], ['EP-04', ['F']]]);
const rec = (extra = {}) => ({ correct: true, ...extra });

// 契约二记录：显式 EP 前缀（已过+口头）与裸名字（口头）两种写法都命中
const RECORD_1 = parseSessionRecord(`---
id: 1
topic: git 三区
mode: two-step
status: done
---

## 已过考点
- EP-01 暂存区 · 金句：「add 进暂存，commit 进库」

## 错的点
- 把 add 直接当 commit 用

## 待办
- [x] 暂存区

## 口头题计数
- EP-01 暂存区：问 3 对 2
`);
const RECORD_2 = parseSessionRecord(`---
id: 2
topic: 权限
mode: quick
status: done
---

## 已过考点
- chmod · 金句：「三组三位」

## 口头题计数
- chmod：问 2 对 1
`);

test('三信号各态：记录讲过 / 答题练过 / 口头弱信号 / 掌握判据 / 未动', () => {
  const r = buildPanorama({
    questions,
    answers: {
      A: rec(), B: rec(),                        // EP-01 全对 → practiced + mastered
      C: rec({ correct: false, streak: 0, wrongCount: 1 }),  // EP-02 有答题 → practiced，答错 → 非 mastered
      // EP-03 无答题但有口头计数 → practiced（弱信号）、非 mastered
      // EP-04 什么都没有 → 全 false
    },
    epNames, epDays,
    records: [RECORD_1, RECORD_2],
    coursesRead: { lessonsTotal: 2, lessonsDone: 1 },  // 部分读完不归因
  });
  const byEp = Object.fromEntries(r.groups.flatMap((g) => g.points.map((p) => [p.ep, p])));
  assert.deepEqual(byEp['EP-01'], {
    ep: 'EP-01', name: '暂存区',
    taught: true,      // 记录已过考点显式 EP-01
    practiced: true,   // 答题 > 0
    mastered: true,    // 全对无未毕业
    status: 'mastered', answered: 2, total: 2, openWrong: 0,
    oral: { asked: 3, correct: 2 },
  });
  assert.equal(byEp['EP-02'].taught, false);      // 记录没覆盖 EP-02、课未全读完
  assert.equal(byEp['EP-02'].practiced, true);
  assert.equal(byEp['EP-02'].mastered, false);
  assert.equal(byEp['EP-03'].taught, true);       // 裸名字 chmod 命中排布表名
  assert.equal(byEp['EP-03'].practiced, true);    // 零答题但口头题 > 0（弱信号）
  assert.equal(byEp['EP-03'].mastered, false);
  assert.deepEqual(byEp['EP-03'].oral, { asked: 2, correct: 1 });
  assert.deepEqual(byEp['EP-04'], {
    ep: 'EP-04', name: '相对路径',
    taught: false, practiced: false, mastered: false,
    status: 'untouched', answered: 0, total: 1, openWrong: 0, oral: null,
  });
});

test('课已学完（全部读完）→ 课程通道点亮全部讲过', () => {
  const r = buildPanorama({
    questions, answers: {}, epNames, epDays, records: [],
    coursesRead: { lessonsTotal: 3, lessonsDone: 3 },
  });
  assert.equal(r.courseTaughtAll, true);
  assert.equal(r.summary.taught, 4);          // 全部讲过
  assert.equal(r.summary.practiced, 0);       // 但没练过
  assert.equal(r.summary.mastered, 0);
});

test('分组与汇总行：day 分组（含 D10>D2 数字序）+ 未排程垫底 + 汇总计数', () => {
  const missionNoDay4 = MISSION.replace('| EP-04 | 相对路径 | 了解 | judge×1 | D10 | 0 |', '| EP-04 | 相对路径 | 了解 | judge×1 | —— | 0 |');
  const days = epDayMap(missionNoDay4);
  const r = buildPanorama({
    questions,
    answers: { A: rec(), B: rec() },
    epNames, epDays: days,
    records: [RECORD_1],
    coursesRead: { lessonsTotal: 2, lessonsDone: 2 },  // 课全读 → 全 taught
  });
  assert.deepEqual(r.groups.map((g) => g.day), ['D1', 'D2', '未排程']); // 数字序 + 未排程垫底
  const g1 = r.groups[0];
  assert.deepEqual(g1.summary, { total: 1, taught: 1, practiced: 1, mastered: 1 });
  const gUn = r.groups[2];
  assert.equal(gUn.points[0].ep, 'EP-04');
  assert.equal(gUn.points[0].taught, true);    // 课程通道
  assert.deepEqual(r.summary, { examPoints: 4, taught: 4, practiced: 1, mastered: 1 });
});

test('无记录无进度无排布表：全空信号不抛错，全归未排程组', () => {
  const r = buildPanorama({ questions, answers: {} });
  assert.deepEqual(r.summary, { examPoints: 4, taught: 0, practiced: 0, mastered: 0 });
  assert.equal(r.groups.length, 1);
  assert.equal(r.groups[0].day, '未排程');
  assert.equal(r.groups[0].points.length, 4);
});

test('名字匹配只认排布表考点名（错别字不命中）', () => {
  const wrongName = parseSessionRecord(`---
id: 3
topic: x
status: done
---

## 已过考点
- 暂存  区
`);
  const r = buildPanorama({
    questions, answers: {}, epNames, epDays,
    records: [wrongName],
    coursesRead: { lessonsTotal: 2, lessonsDone: 0 },
  });
  assert.equal(r.summary.taught, 0);   // 「暂存  区」≠「暂存区」，不虚报
});
