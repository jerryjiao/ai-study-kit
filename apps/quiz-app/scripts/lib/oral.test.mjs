// oral.test.mjs — 口头答题流水：解析 / 合并 / 目标解析 / 四态判据 / 合流规则（node:test）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOralAttempts, mergeOralAttempts, resolveOralTarget, aggregateOral,
  oralMastery, mergeMastery, ORAL_WEIGHTS,
} from './oral.mjs';

// ── parseOralAttempts ──────────────────────────────────────

test('parse: 合法数组逐条解析，未知 source 保留为 null、多余字段剥掉', () => {
  const { attempts, skipped } = parseOralAttempts(JSON.stringify([
    { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall', note: 'x' },
    { target: 'concepts/staging.md', correct: false, at: 2000, source: 'weird' },
  ]));
  assert.equal(skipped, 0);
  assert.deepEqual(attempts, [
    { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
    { target: 'concepts/staging.md', correct: false, at: 2000, source: null },
  ]);
});

test('parse: 坏 JSON / 非数组 / 空串 → 空流水不抛错', () => {
  for (const bad of ['{oops', '{"a":1}', '', null]) {
    const r = parseOralAttempts(bad);
    assert.deepEqual(r, { attempts: [], skipped: 0 });
  }
});

test('parse: 残缺条目跳过计数——缺 target / correct 非布尔 / at 非数', () => {
  const { attempts, skipped } = parseOralAttempts(JSON.stringify([
    { correct: true, at: 1 },                        // 缺 target
    { target: 'x', correct: 'yes', at: 1 },          // correct 非布尔
    { target: 'x', correct: true, at: 'now' },       // at 非数
    { target: 'x', correct: true },                  // 缺 at
    null,                                            // 非对象
    { target: ' ok ', correct: false, at: 5 },       // 合法（trim）
  ]));
  assert.equal(skipped, 5);
  assert.deepEqual(attempts, [{ target: 'ok', correct: false, at: 5, source: null }]);
});

// ── mergeOralAttempts ──────────────────────────────────────

test('merge: 四元组相同去重、按 at 升序、不同 source 不误伤', () => {
  const a = [{ target: 'EP-01', correct: true, at: 300, source: 'recall' }];
  const b = [
    { target: 'EP-01', correct: true, at: 100, source: 'recall' },
    { target: 'EP-01', correct: true, at: 300, source: 'recall' },   // 重复
    { target: 'EP-01', correct: true, at: 300, source: 'recite' },   // source 不同 → 保留
    { target: 'EP-01', correct: false, at: 200, source: 'recall' },
  ];
  const m = mergeOralAttempts(a, b);
  assert.deepEqual(m.map((x) => [x.at, x.correct, x.source]), [
    [100, true, 'recall'], [200, false, 'recall'], [300, true, 'recall'], [300, true, 'recite'],
  ]);
});

// ── resolveOralTarget：优先级 EP 前缀 → 映射反查 → 裸名 ──────

const EPNAMES = { 'EP-01': '暂存区', 'EP-02': '分支' };
const GRAPHMAP = {
  byNode: new Map([['concepts/staging.md', { node: 'concepts/staging.md', ep: 'EP-01', label: '暂存区' }]]),
  byLabel: new Map([['暂存区', { node: 'concepts/staging.md', ep: 'EP-01', label: '暂存区' }]]),
};

test('resolve: EP 前缀最优先——节点映射存在也不反查', () => {
  const r = resolveOralTarget('EP-02 分支合并', { epNames: EPNAMES, graphMap: GRAPHMAP });
  assert.deepEqual(r, { ep: 'EP-02', node: null, name: '分支合并', via: 'ep', resolved: true });
});

test('resolve: 节点路径精确命中 → 反查 EP；节点 label 命中次之', () => {
  assert.deepEqual(resolveOralTarget('concepts/staging.md', { epNames: EPNAMES, graphMap: GRAPHMAP }),
    { ep: 'EP-01', node: 'concepts/staging.md', name: '暂存区', via: 'node', resolved: true });
  assert.deepEqual(resolveOralTarget('暂存区', { epNames: EPNAMES, graphMap: GRAPHMAP }),
    { ep: 'EP-01', node: 'concepts/staging.md', name: '暂存区', via: 'node', resolved: true });
});

test('resolve: 裸考点名回退排布表名；完全未解析 → 全 null + resolved:false', () => {
  assert.deepEqual(resolveOralTarget('分支', { epNames: EPNAMES }),
    { ep: 'EP-02', node: null, name: '分支', via: 'name', resolved: true });
  assert.deepEqual(resolveOralTarget(' 图上没有的概念 ', { epNames: EPNAMES, graphMap: GRAPHMAP }),
    { ep: null, node: null, name: '图上没有的概念', via: null, resolved: false });
});

// ── aggregateOral ──────────────────────────────────────────

test('aggregate: EP 目标进 byEp；节点目标只进 byNode（不经映射重复计入 EP）；未解析进 byName', () => {
  const { byEp, byNode, byName } = aggregateOral([
    { target: 'EP-01', correct: true, at: 1 },
    { target: 'EP-01', correct: false, at: 2 },
    { target: 'concepts/staging.md', correct: true, at: 3 },
    { target: '图上没有的概念', correct: true, at: 4 },
  ], { epNames: EPNAMES, graphMap: GRAPHMAP });
  assert.deepEqual(byEp.get('EP-01'), { asked: 2, correct: 1 });   // 节点命中不叠加
  assert.deepEqual(byNode.get('concepts/staging.md'), { asked: 1, correct: 1 });
  assert.deepEqual(byName.get('图上没有的概念'), { asked: 1, correct: 1 });
});

// ── oralMastery：封顶 / 加权 / 空流水 / 负面优先 ─────────────

const att = (corrects) => corrects.map((c, i) => ({ target: 'EP-01', correct: c, at: 1000 + i, source: 'recall' }));

test('mastery: 空流水 = untouched（score null）', () => {
  assert.deepEqual(oralMastery([]), { asked: 0, correct: 0, score: null, status: 'untouched' });
});

test('mastery: 答 1 次封 0.5——一次蒙对只是 inProgress，不是 mastered', () => {
  const r = oralMastery(att([true]));
  assert.equal(r.score, 0.5);
  assert.equal(r.status, 'inProgress');
});

test('mastery: 答 2 次封 0.8——两次全对仍不到掌握线', () => {
  const r = oralMastery(att([true, true]));
  assert.equal(r.score, 0.8);
  assert.equal(r.status, 'inProgress');
});

test('mastery: 3 次全对 = 加权 1.0 = mastered', () => {
  const r = oralMastery(att([true, true, true]));
  assert.equal(r.score, 1);
  assert.equal(r.status, 'mastered');
});

test('mastery: 4 对 1 错（最近错）加权 0.75（按权重和归一），负面证据优先判 weak', () => {
  const r = oralMastery(att([true, true, true, true, false]));
  assert.equal(r.score, 0.75);        // (0.5+0.7+0.85+0.95+0)/4.0
  assert.equal(r.status, 'weak');
});

test('mastery: 早期错、近期全对——近期加权拉回来（问 5 对 4 且最近全对 = mastered）', () => {
  const r = oralMastery(att([false, true, true, true, true]));
  assert.equal(r.score, 0.875);       // (0.5*0 + 0.7+0.85+0.95+1.0)/4.0
  assert.equal(r.status, 'mastered');
});

test('mastery: 不足 5 次取末尾权重并归一——2 次 1 对 1 错 ≈ 0.487 weak', () => {
  const r = oralMastery(att([true, false]));
  assert.equal(r.score, 0.487);       // (0.95*1 + 1.0*0)/1.95
  assert.equal(r.status, 'weak');
});

test('mastery: 权重表末位是 1.0（最近一次权重最大）', () => {
  assert.equal(ORAL_WEIGHTS[ORAL_WEIGHTS.length - 1], 1.0);
});

// ── mergeMastery：负面证据优先的合流规则 ─────────────────────

test('merge: 任一通道 weak → weak（口头拖垮题库已掌握）', () => {
  assert.equal(mergeMastery('mastered', 'weak'), 'weak');
  assert.equal(mergeMastery('weak', 'mastered'), 'weak');
});

test('merge: 题通道有数据以题为准——口头正向不越权降级', () => {
  assert.equal(mergeMastery('mastered', 'inProgress'), 'mastered');
  assert.equal(mergeMastery('inProgress', 'mastered'), 'inProgress'); // 口头好也不替题完成验证
});

test('merge: 题 untouched 时口头最多推到 inProgress（题没刷过不算掌握）', () => {
  assert.equal(mergeMastery('untouched', 'mastered'), 'inProgress');
  assert.equal(mergeMastery('untouched', 'weak'), 'weak');
  assert.equal(mergeMastery('untouched', 'inProgress'), 'inProgress');
});
