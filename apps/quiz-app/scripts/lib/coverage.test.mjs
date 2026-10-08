// coverage.test.mjs — 覆盖快照单测：形状白名单 + 「无个人叙述」内容断言（隐私边界）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCoverageSnapshot } from './coverage.mjs';
import { buildPanorama } from './panorama.mjs';
import { parseSessionRecord } from './records.mjs';

// 带金句/错点原文的记录——快照绝不能把这些带出去
const GOLDEN = '4xx 怪客户端，5xx 怪服务端';
const WRONG_POINT = '复述时把 301/302 方向说反——已当场纠';
const records = [parseSessionRecord(`---
id: 1
topic: HTTP 状态码
mode: deep
status: done
---

## 已过考点
- EP-01 状态码家族划分 · 金句：「${GOLDEN}」

## 错的点
- ${WRONG_POINT}

## 待办
- [x] 状态码家族划分

## 口头题计数
- EP-01 状态码家族划分：问 3 对 2
`)];

const questions = [
  { id: 'A', examPoint: 'EP-01' },
  { id: 'B', examPoint: 'EP-02' },
];

test('覆盖快照形状：字段白名单（ep/布尔×3/oral 计数/oralStatus 枚举），无 name/叙述字段', () => {
  const pano = buildPanorama({
    questions, answers: { A: { correct: true } },
    epNames: { 'EP-01': '状态码家族划分' }, epDays: { 'EP-01': 'D1', 'EP-02': 'D1' },
    records,
    coursesRead: { lessonsTotal: 1, lessonsDone: 0 },
  });
  const snap = buildCoverageSnapshot(pano);
  assert.equal(snap.points.length, 2);
  for (const p of snap.points) {
    assert.deepEqual(Object.keys(p).sort(), ['ep', 'mastered', 'oral', 'oralStatus', 'practiced', 'taught']);
    assert.equal(typeof p.ep, 'string');
    assert.equal(typeof p.taught, 'boolean');
    assert.equal(typeof p.practiced, 'boolean');
    assert.equal(typeof p.mastered, 'boolean');
    if (p.oral) assert.deepEqual(Object.keys(p.oral).sort(), ['asked', 'correct']);
    // oralStatus 只允许四值枚举或 null（无口述数据）——叙述性字符串进不来
    assert.ok(p.oralStatus === null || ['mastered', 'inProgress', 'weak'].includes(p.oralStatus));
  }
  assert.deepEqual(snap.points[0], {
    ep: 'EP-01', taught: true, practiced: true, mastered: true,
    oral: { asked: 3, correct: 2 },
    oralStatus: null, // 旧记录手写「口头题计数」无时序，不进口述四态（只有流水才算）
  });
});

test('口述流水 → oralStatus 进快照（v1.2 掌握判据输入）；非法值被白名单枚举拦下', () => {
  const pano = buildPanorama({
    questions, answers: { A: { correct: true } },
    epNames: { 'EP-01': '状态码家族划分' },
    oralAttempts: [
      { target: 'EP-01 状态码家族划分', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 状态码家族划分', correct: true, at: 2000, source: 'recite' },
      { target: 'EP-01 状态码家族划分', correct: true, at: 3000, source: 'case' },
    ],
  });
  const snap = buildCoverageSnapshot(pano);
  assert.equal(snap.points[0].oralStatus, 'mastered');
  // 形状兜底：上游给怪值（叙述字符串/数字）→ 压成 null，不带出快照
  const weird = buildCoverageSnapshot({
    generatedAt: '', courseTaughtAll: false,
    groups: [{ day: 'D1', points: [{ ep: 'EP-01', taught: true, practiced: true, mastered: true, oral: null, oralStatus: '金句：不该出现' }], summary: {} }],
  });
  assert.equal(weird.points[0].oralStatus, null);
});

test('内容断言：金句/错点原文绝不进快照（有即红）', () => {
  const pano = buildPanorama({
    questions, answers: {},
    epNames: { 'EP-01': '状态码家族划分' }, records,
    coursesRead: { lessonsTotal: 0, lessonsDone: 0 },
  });
  const snap = buildCoverageSnapshot(pano);
  const json = JSON.stringify(snap);
  assert.ok(!json.includes(GOLDEN), '金句原文泄漏进快照');
  assert.ok(!json.includes(WRONG_POINT), '错点原文泄漏进快照');
  assert.ok(!json.includes('金句'), '「金句」标记泄漏进快照');
  assert.ok(!json.includes('已过考点'), '记录节名泄漏进快照');
});

test('courseTaughtAll 透传布尔，oral 为 null 时保 null', () => {
  const pano = buildPanorama({
    questions, answers: {}, records: [],
    coursesRead: { lessonsTotal: 2, lessonsDone: 2 },
  });
  const snap = buildCoverageSnapshot(pano);
  assert.equal(snap.courseTaughtAll, true);
  assert.equal(snap.points[1].oral, null);
  assert.equal(snap.points[1].taught, true); // 课程通道点亮
});
