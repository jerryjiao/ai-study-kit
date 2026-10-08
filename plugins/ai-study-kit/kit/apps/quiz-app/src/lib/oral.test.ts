// oral.test.ts — 口头答题流水 TS 移植单测（与 scripts/lib/oral.test.mjs 同判据）。
// #122（v0.26）起末段跨侧一致性断言：直接 import 脚本侧 oral.mjs，同一夹具对拍两侧输出
// （判据本体在 mastery-report 消费链上的就是那份 oral.mjs；类型面经 scripts/lib/oral.d.mts）。
import { describe, it, expect } from 'vitest';
import {
  mergeOralAttempts, oralMastery, resolveOralTargetEp, groupOralByEp, oralAttemptsForTheme,
  ORAL_WEIGHTS, ORAL_CAPS,
} from './oral';
import {
  mergeOralAttempts as mergeOralAttemptsMjs,
  oralMastery as oralMasteryMjs,
} from '../../scripts/lib/oral.mjs';
import type { OralAttempt } from '../types';

const att = (corrects: boolean[], target = 'EP-01'): OralAttempt[] =>
  corrects.map((c, i) => ({ target, correct: c, at: 1000 + i, source: 'recall' }));

describe('oralMastery（与 oral.mjs 同判据）', () => {
  it('空流水 = untouched（score null）', () => {
    expect(oralMastery([])).toEqual({ asked: 0, correct: 0, score: null, status: 'untouched' });
  });
  it('答 1 次封 0.5——一次蒙对只是 inProgress', () => {
    const r = oralMastery(att([true]));
    expect(r.score).toBe(0.5);
    expect(r.status).toBe('inProgress');
  });
  it('答 2 次封 0.8——两次全对仍不到掌握线', () => {
    const r = oralMastery(att([true, true]));
    expect(r.score).toBe(0.8);
    expect(r.status).toBe('inProgress');
  });
  it('3 次全对 = 加权 1.0 = mastered', () => {
    const r = oralMastery(att([true, true, true]));
    expect(r.score).toBe(1);
    expect(r.status).toBe('mastered');
  });
  it('最近一次判错 → weak（负面证据优先）', () => {
    expect(oralMastery(att([true, true, false])).status).toBe('weak');
  });
  it('5 次窗口：旧错在窗外、近 5 次全对 → mastered', () => {
    const r = oralMastery(att([false, true, true, true, true, true]));
    expect(r).toMatchObject({ asked: 6, correct: 5, score: 1, status: 'mastered' });
  });
  it('乱序输入按 at 取信', () => {
    const shuffled: OralAttempt[] = [
      { target: 'EP-01', correct: true, at: 3, source: 'case' },
      { target: 'EP-01', correct: false, at: 1, source: 'recall' },
      { target: 'EP-01', correct: true, at: 2, source: 'recite' },
    ];
    // 排序后 [F@1, T@2, T@3]，末 3 权重 [0.85,0.95,1.0]：(0 + 0.95 + 1.0)/2.8 = 0.696 → inProgress
    expect(oralMastery(shuffled)).toMatchObject({ asked: 3, correct: 2, score: 0.696, status: 'inProgress' });
  });
  it('常量与封顶表同款（权重末位 1.0、封顶 1→0.5 / 2→0.8）', () => {
    expect(ORAL_WEIGHTS[ORAL_WEIGHTS.length - 1]).toBe(1.0);
    expect(ORAL_CAPS[1]).toBe(0.5);
    expect(ORAL_CAPS[2]).toBe(0.8);
  });
});

describe('mergeOralAttempts', () => {
  it('四元组相同去重、按 at 升序、不同 source 不误伤', () => {
    const a: OralAttempt[] = [{ target: 'EP-01', correct: true, at: 300, source: 'recall' }];
    const b: OralAttempt[] = [
      { target: 'EP-01', correct: true, at: 100, source: 'recall' },
      { target: 'EP-01', correct: true, at: 300, source: 'recall' },   // 重复
      { target: 'EP-01', correct: true, at: 300, source: 'recite' },   // source 不同 → 保留
      { target: 'EP-01', correct: false, at: 200, source: 'recall' },
    ];
    expect(mergeOralAttempts(a, b).map((x) => [x.at, x.correct, x.source])).toEqual([
      [100, true, 'recall'], [200, false, 'recall'], [300, true, 'recall'], [300, true, 'recite'],
    ]);
  });
  it('theme 标记不进四元组——包内/API 两路的同一笔仍是一笔', () => {
    const a: OralAttempt[] = [{ target: 'EP-02', correct: true, at: 100, source: 'recall' }];
    const b: OralAttempt[] = [{ theme: 'dev-intro', target: 'EP-02', correct: true, at: 100, source: 'recall' }];
    expect(mergeOralAttempts(a, b)).toEqual([{ target: 'EP-02', correct: true, at: 100, source: 'recall' }]);
  });
});

describe('resolveOralTargetEp / groupOralByEp（web 侧解析链：EP 前缀 → 裸名）', () => {
  const epNames = { 'EP-01': '暂存区', 'EP-02': 'revert' };
  it('EP 前缀最优先（后缀只作人读备注）；裸考点名精确命中；未解析 → null', () => {
    expect(resolveOralTargetEp('EP-01 暂存区', epNames)).toBe('EP-01');
    expect(resolveOralTargetEp('暂存区', epNames)).toBe('EP-01');
    expect(resolveOralTargetEp('图上没有的概念', epNames)).toBeNull();
  });
  it('按 EP 分组保留完整时序（oralMastery 要每组完整序列算加权）', () => {
    const groups = groupOralByEp([
      { target: 'EP-01', correct: true, at: 2 },
      { target: 'EP-02', correct: false, at: 3 },
      { target: 'EP-01', correct: false, at: 1 },
      { target: '裸知识点', correct: true, at: 4 },   // 未解析 → 不进考点桶
    ], epNames);
    expect(groups.get('EP-01')!.map((x) => x.at)).toEqual([2, 1]);   // 保留插入序，oralMastery 内部排序
    expect(groups.get('EP-02')!.length).toBe(1);
    expect(groups.has('裸知识点')).toBe(false);
  });
});

describe('oralAttemptsForTheme（多主题读端隔离）', () => {
  const attempts: OralAttempt[] = [
    { theme: 'dev-intro', target: 'EP-01', correct: true, at: 1 },
    { target: 'EP-02', correct: true, at: 2 },                       // 缺 theme → 宽容视为当前
    { theme: 'other', target: 'EP-01', correct: false, at: 3 },      // 他主题 → 挡
  ];
  it('只留当前主题与缺 theme 的条目；无主题名时全放行', () => {
    expect(oralAttemptsForTheme(attempts, 'dev-intro').map((a) => a.at)).toEqual([1, 2]);
    expect(oralAttemptsForTheme(attempts, undefined).length).toBe(3);
  });
});

// ── 跨侧一致（#122）：同一夹具，TS 侧与脚本侧 oral.mjs 逐字段对拍 ──────────
// 夹具数据 = scripts/lib/fixtures/oral-cross-fixture.mjs（单一数据源；此处内联同款，
// 漂移会被下面的逐字段对拍当场抓住——沿 mastery.test.ts 的跨侧先例）。
const seq = (base: number, target: string, flags: boolean[]): OralAttempt[] =>
  flags.map((correct, i) => ({ target, correct, at: base + i, source: 'recall' as const }));
const scenarios: { name: string; attempts: OralAttempt[] }[] = [
  { name: '空流水', attempts: [] },
  { name: '1 次全对（封顶 0.5）', attempts: seq(1000, 'EP-01 暂存区', [true]) },
  { name: '2 次全对（封顶 0.8）', attempts: seq(2000, 'EP-02 revert', [true, true]) },
  { name: '3 次全对（mastered）', attempts: seq(3000, 'EP-03 chmod', [true, true, true]) },
  { name: '最近一次判错（weak）', attempts: seq(4000, 'EP-04 相对路径', [true, true, false]) },
  { name: '全错（weak）', attempts: seq(5000, 'EP-05 分支模型', [false, false]) },
  { name: '5 次窗口外旧错', attempts: seq(6000, 'EP-06 对象模型', [false, true, true, true, true, true]) },
  {
    name: '乱序输入',
    attempts: [
      { target: 'EP-03 chmod', correct: true, at: 3002, source: 'case' },
      { target: 'EP-03 chmod', correct: true, at: 3000, source: 'recall' },
      { target: 'EP-03 chmod', correct: true, at: 3001, source: 'recite' },
    ],
  },
];

describe('跨侧一致（TS vs scripts/lib/oral.mjs，同夹具同判据）', () => {
  it('oralMastery：全部场景两侧逐字段相等', () => {
    for (const s of scenarios) {
      expect(oralMastery(s.attempts), `场景「${s.name}」`).toEqual(oralMasteryMjs(s.attempts));
    }
  });
  it('mergeOralAttempts：去重/并集/排序两侧逐字段相等', () => {
    const a = seq(100, 'EP-01', [true, false]);
    const b: OralAttempt[] = [
      { theme: 'dev-intro', target: 'EP-01', correct: false, at: 101, source: 'recall' }, // 与 a[1] 同四元组（theme 不进键）
      { target: 'EP-01', correct: true, at: 102, source: 'recite' },
    ];
    expect(mergeOralAttempts(a, b)).toEqual(mergeOralAttemptsMjs(a, b));
    expect(mergeOralAttempts(a, b).map((x) => x.at)).toEqual([100, 101, 102]);
  });
});
