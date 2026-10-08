// warmup.test.ts — 断档回归「热身一题」挑题判据单测（#120 / spec #118 T1）。
// 判据在 src/lib/warmup.ts（脚本侧同构实现 scripts/lib/warmup.mjs，双实现纪律：
// 改判据两边一起改，两边测试都要过）。
import { describe, it, expect } from 'vitest';
import type { Question, Progress } from '../types';
import { pickWarmupQuestion } from './warmup';
import type { StationPick } from './nextStation';

const NOON = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).getTime();
const AT = NOON(2026, 9, 20);

const q = (id: string, over: Partial<Question> = {}): Question => ({
  id, source: 'test-kit', type: 'single', question: id, options: { A: 'a' }, answer: ['A'],
  ...over,
});

/** EP-01 三题（题库序 GIT-001..003）+ EP-02 一题（GIT-101）；GIT-003 拓展层。 */
const QUESTIONS = [
  q('GIT-001', { examPoint: 'EP-01' }),
  q('GIT-002', { examPoint: 'EP-01' }),
  q('GIT-003', { examPoint: 'EP-01', tier: 'ext' }),
  q('GIT-101', { examPoint: 'EP-02' }),
];

const stationOf = (ep: string, reason: StationPick['reason']): StationPick => ({
  ep, name: ep, status: 'inProgress', reason,
});

describe('pickWarmupQuestion（热身挑题）', () => {
  it('站点考点有未答题 → 第一道未答（推进），reason 归一化 behindSchedule→schedule', () => {
    const progress = { version: 1, answers: {
      'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
    } } as Progress;
    const pick = pickWarmupQuestion(QUESTIONS, progress, stationOf('EP-01', 'behindSchedule'));
    expect(pick).toEqual({ questionId: 'GIT-002', ep: 'EP-01', reason: 'schedule' });
  });
  it('考点全答过 → 第一道未毕业错题（重做熟悉题找回手感）', () => {
    const progress = { version: 1, answers: {
      'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
      'GIT-002': { selected: ['B'], correct: false, submittedAt: AT, streak: 0, wrongCount: 1 },
    } } as Progress;
    const pick = pickWarmupQuestion(QUESTIONS, progress, stationOf('EP-01', 'weak'));
    expect(pick).toEqual({ questionId: 'GIT-002', ep: 'EP-01', reason: 'weak' });
  });
  it('考点全答且全对（已掌握的复读场景）→ 第一道（非拓展）', () => {
    const progress = { version: 1, answers: {
      'GIT-001': { selected: ['A'], correct: true, submittedAt: AT, streak: 3 },
      'GIT-002': { selected: ['A'], correct: true, submittedAt: AT, streak: 1 },
      // 拓展题答过不算计划内池，不会被挑
    } } as Progress;
    const pick = pickWarmupQuestion(QUESTIONS, progress, stationOf('EP-01', 'unlocked'));
    expect(pick).toEqual({ questionId: 'GIT-001', ep: 'EP-01', reason: 'structural' });
  });
  it('墓碑 / 随机沙盒记录不算已答（mastery 口径）——墓碑题可再次成为热身题', () => {
    const progress = { version: 1, answers: {
      'GIT-001': { selected: [], correct: null, submittedAt: AT, deletedAt: AT + 1 },
      'GIT-002': { selected: ['A'], correct: false, submittedAt: AT, fromRandom: true },
    } } as Progress;
    const pick = pickWarmupQuestion(QUESTIONS, progress, stationOf('EP-01', 'unlocked'));
    expect(pick?.questionId).toBe('GIT-001');
  });
  it('站点考点计划内无题（纯拓展考点）→ 全库回退第一道未答，reason=fallback', () => {
    const onlyExt = [q('GIT-001', { examPoint: 'EP-01', tier: 'ext' }), q('GIT-101', { examPoint: 'EP-02' })];
    const pick = pickWarmupQuestion(onlyExt, { version: 1, answers: {} } as Progress, stationOf('EP-01', 'unlocked'));
    expect(pick).toEqual({ questionId: 'GIT-101', ep: 'EP-02', reason: 'fallback' });
  });
  it('station=null（全掌握/无考点主题）→ 全库回退；回退题带考点则 ep 跟随', () => {
    const pick = pickWarmupQuestion(QUESTIONS, { version: 1, answers: {} } as Progress, null);
    expect(pick).toEqual({ questionId: 'GIT-001', ep: 'EP-01', reason: 'fallback' });
  });
  it('无考点题回退：ep 为空串（UI 层链接降级到题集直达）', () => {
    const noEp = [q('GIT-001'), q('GIT-002')];
    const pick = pickWarmupQuestion(noEp, { version: 1, answers: {} } as Progress, null);
    expect(pick).toEqual({ questionId: 'GIT-001', ep: '', reason: 'fallback' });
  });
  it('全拓展题库（计划内为空）→ null（回归卡不渲染）', () => {
    const allExt = [q('GIT-001', { tier: 'ext' })];
    expect(pickWarmupQuestion(allExt, { version: 1, answers: {} } as Progress, stationOf('EP-01', 'weak'))).toBeNull();
  });
});
