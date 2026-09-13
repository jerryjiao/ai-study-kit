// mastery.test.mjs — 考点掌握度判据单测（node:test，随 pnpm test 的 glob 跑）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  streakToPass, isOpenWrong, epNameMap, masteryByExamPoint, rankWeakness, isFlashGraduated,
} from './mastery.mjs';

const qs = (eps) => eps.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep })));
const rec = (extra = {}) => ({ correct: true, ...extra });

test('streakToPass 阈值随历史错次递增（与 progress.ts 同口径）', () => {
  assert.equal(streakToPass(1), 1);
  assert.equal(streakToPass(0), 1);
  assert.equal(streakToPass(2), 2);
  assert.equal(streakToPass(5), 3); // 封顶
});

test('isOpenWrong：无 streak 记录不是错题，未达阈值是', () => {
  assert.equal(isOpenWrong({ streak: undefined }), false);
  assert.equal(isOpenWrong({ streak: 0, wrongCount: 1 }), true);
  assert.equal(isOpenWrong({ streak: 1, wrongCount: 1 }), false);  // 错 1 次连对 1 次 = 毕业
  assert.equal(isOpenWrong({ streak: 1, wrongCount: 2 }), true);   // 错 2 次需连对 2 次
});

test('epNameMap 解析 MISSION 排布表，缺表回退空映射', () => {
  const md = `| 考点id | 考点 | 深度 |\n|---|---|---|\n| EP-01 | 暂存区 | 掌握 |\n| EP-02 | revert | 理解 |`;
  assert.deepEqual(epNameMap(md), { 'EP-01': '暂存区', 'EP-02': 'revert' });
  assert.deepEqual(epNameMap(''), {});
});

test('untouched：一题未答', () => {
  const r = masteryByExamPoint({ questions: qs([['EP-01', ['A', 'B']]]), answers: {} });
  assert.equal(r.points[0].status, 'untouched');
});

test('mastered：全答对且无未毕业错题', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ streak: 1, wrongCount: 1 }) }, // B 曾错已毕业
  });
  assert.equal(r.points[0].status, 'mastered');
});

// ── 闪卡毕业组件（v1.1）──────────────────────────────────────
const fcs = (pairs) => pairs.map(([id, ep]) => ({ id, examPoint: ep }));
const srsRec = (extra = {}) => ({ phase: 'review', ...extra });

test('isFlashGraduated：review 毕业learning/无记录/墓碑不毕业', () => {
  assert.equal(isFlashGraduated(srsRec()), true);
  assert.equal(isFlashGraduated(srsRec({ phase: 'learning' })), false);
  assert.equal(isFlashGraduated(srsRec({ phase: 'relearning' })), false);
  assert.equal(isFlashGraduated(undefined), false);
  assert.equal(isFlashGraduated(srsRec({ deletedAt: 123 })), false); // 重置墓碑 = 未毕业
});

test('mastered 判据补闪卡毕业：题全对但映射闪卡未毕业 → inProgress', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec({ phase: 'learning' }) },
  });
  assert.equal(r.points[0].status, 'inProgress');
  assert.deepEqual(r.points[0].flashOpenIds, ['FC-1']);
  assert.equal(r.points[0].flashMapped, 1);
  assert.equal(r.points[0].flashGraduated, 0);
});

test('映射闪卡全部毕业（review）→ mastered 成立', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-1', 'EP-01'], ['FC-2', 'EP-01']]),
    srs: { 'FC-1': srsRec(), 'FC-2': srsRec() },
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.equal(r.points[0].flashGraduated, 2);
});

test('闪卡映射按考点隔离：别的考点的卡不影响本考点，无 examPoint 的卡不参与', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A']], ['EP-02', ['B']]]),
    answers: { A: rec(), B: rec() },
    flashcards: fcs([['FC-x', 'EP-02'], ['FC-bare', undefined]]),
    srs: { 'FC-x': srsRec({ phase: 'learning' }) }, // EP-02 的卡没毕业
  });
  assert.equal(r.points[0].status, 'mastered'); // EP-01 无映射卡，不受影响
  assert.equal(r.points[1].status, 'inProgress'); // EP-02 差闪卡
  assert.equal(r.points[0].flashMapped, 0);
});

test('闪卡组件不掩盖负面证据：题有错 + 闪卡毕业了也还是 weak', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: false, streak: 0, wrongCount: 1 }) },
    flashcards: fcs([['FC-1', 'EP-01']]),
    srs: { 'FC-1': srsRec() },
  });
  assert.equal(r.points[0].status, 'weak');
});

test('weak：毕业中（streak 未达阈值）即使最近一次答对', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: true, streak: 1, wrongCount: 2 }) }, // 错 2 次才连对 1 次
  });
  assert.equal(r.points[0].status, 'weak');
  assert.deepEqual(r.points[0].openWrongIds, ['B']);
});

test('weak：最近一次答错', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: rec({ correct: false, streak: 0, wrongCount: 1 }) },
  });
  assert.equal(r.points[0].status, 'weak');
});

test('inProgress：部分作答且无负面证据', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B', 'C']]]),
    answers: { A: rec(), B: rec() },
  });
  assert.equal(r.points[0].status, 'inProgress');
});

test('自评未判（correct===null）：算已答、不算掌握也不算负面', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: { A: rec(), B: { correct: null } },
  });
  assert.equal(r.points[0].answered, 2);
  assert.equal(r.points[0].status, 'inProgress'); // 无负面但正向证据不全
});

test('墓碑与随机沙盒不计入', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']]]),
    answers: {
      A: rec({ deletedAt: 123 }),          // 已删
      B: rec({ fromRandom: true }),        // 随机沙盒
    },
  });
  assert.equal(r.points[0].answered, 0);
  assert.equal(r.points[0].status, 'untouched');
});

test('多主题隔离：题库外的 answers 记录不参与', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A']]]),
    answers: { A: rec(), OTHER: rec({ correct: false, streak: 0, wrongCount: 1 }) },
  });
  assert.equal(r.points[0].status, 'mastered');
  assert.equal(r.points.length, 1);
});

test('无 examPoint 的题进 untracked，不进考点报告', () => {
  const r = masteryByExamPoint({
    questions: [{ id: 'X', topic: 'misc' }, { id: 'A', examPoint: 'EP-01' }],
    answers: { A: rec() },
  });
  assert.equal(r.untracked, 1);
  assert.equal(r.points.length, 1);
});

test('rankWeakness：weak 先于 inProgress，weak 按未毕业数降序', () => {
  const r = masteryByExamPoint({
    questions: qs([['EP-01', ['A', 'B']], ['EP-02', ['C', 'D']], ['EP-03', ['E']], ['EP-04', ['F', 'G']]]),
    answers: {
      A: rec({ correct: false, streak: 0, wrongCount: 1 }),  // EP-01 weak，1 未毕业
      B: rec(),
      C: rec({ correct: false, streak: 0, wrongCount: 2 }),  // EP-02 weak，1 未毕业
      D: rec({ correct: false, streak: 0, wrongCount: 1 }),  // EP-02 又一未毕业
      E: rec(),                                             // EP-03 mastered
      F: rec(),                                             // EP-04 inProgress（G 未答）
    },
  });
  const rank = rankWeakness(r.points).map((p) => p.ep);
  assert.deepEqual(rank, ['EP-02', 'EP-01', 'EP-04']); // 2 未毕业 > 1 未毕业 > inProgress
});
