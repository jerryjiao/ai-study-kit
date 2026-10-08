// nextHook.test.ts — 会话收尾开环预告 web 侧判据单测（v0.26 票 #124）。
// 判据在 nextHook.ts（全景四态 → nextStation 主推荐 → 微块钩子形状），与脚本侧
// plan-report `next` 字段（scripts/lib/warmup.mjs）双实现同构：改判据两边一起改，
// 两边测试都要过（plan.ts/plan.mjs 双实现先例）。
import { describe, it, expect } from 'vitest';
import { deriveNextHook } from './nextHook';
import type { AnswerRecord, Flashcard, PlanFile, Progress, Question } from '../types';

const qs = (pairs: [string, string[]][]): Question[] =>
  pairs.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep }) as unknown as Question));
const questions = qs([
  ['EP-01', ['A', 'B']],
  ['EP-02', ['C']],
  ['EP-03', ['D', 'E']],
]);
const rec = (extra: Partial<AnswerRecord> = {}): AnswerRecord =>
  ({ correct: true, ...extra } as AnswerRecord);
const epNames = { 'EP-01': '暂存区', 'EP-02': '分支', 'EP-03': 'chmod' };
const epDays = { 'EP-01': 'D1', 'EP-02': 'D2', 'EP-03': 'D2' };
const NO_PLAN = { units: [] } as PlanFile;

const progressOf = (answers: Record<string, AnswerRecord>): Progress =>
  ({ version: 1, answers, oralAttempts: [] } as unknown as Progress);

const call = (over: Partial<Parameters<typeof deriveNextHook>[0]> = {}) =>
  deriveNextHook({
    questions,
    progress: progressOf({}),
    flashcards: [] as unknown as Flashcard[],
    coverage: null,
    examPoints: epNames,
    examDays: epDays,
    theme: 't',
    plan: NO_PLAN,
    now: new Date(2026, 9, 1, 12).getTime(),
    ...over,
  });

describe('deriveNextHook · 预告考点与下一站推荐同判据', () => {
  it('有未毕业错题（weak）→ 补弱轨主推荐成为预告，形状带动作/时长/直达链接', () => {
    const hook = call({
      progress: progressOf({
        A: rec(), B: rec(),                                        // EP-01 全对 → mastered
        C: rec({ correct: false, streak: 0, wrongCount: 1 }),      // EP-02 未毕业错题 → weak
      }),
    });
    expect(hook).toEqual({
      ep: 'EP-02',
      name: '分支',
      label: 'EP-02 分支',
      reason: 'weak',
      action: 'oral-3',
      minutes: 5,
      to: '/practice/all?ep=EP-02',
    });
  });

  it('无 weak → 结构轨：第一个非掌握考点（EP-01 untouched）', () => {
    const hook = call();
    expect(hook).toMatchObject({ ep: 'EP-01', reason: 'structural' });
  });

  it('有目标日且日程落后 → 落后日程轨插队，reason 归一化为 schedule（零催办不进文案，只在数据里）', () => {
    const plan: PlanFile = {
      deadline: '2026-09-20',
      units: [{
        id: 'U-01', title: '第二天', order: 1, day: 'D2',
        plannedDate: '2026-08-25', status: 'planned',
      }],
    };
    const hook = call({
      plan,
      // EP-01（D1，非逾期日程）拿下、EP-02/EP-03（D2，逾期日程）未动 → 插队选 EP-02
      progress: progressOf({ A: rec(), B: rec() }),
    });
    expect(hook).toMatchObject({ ep: 'EP-02', reason: 'schedule', minutes: 5 });
  });

  it('全掌握 / 题库无考点标记 → null（预告行不渲染，总结卡零变化）', () => {
    expect(call({
      progress: progressOf({ A: rec(), B: rec(), C: rec(), D: rec(), E: rec() }),
    })).toBeNull();
    // 无 examPoint 的题库（chat-first 未标记考点）→ 考点集为空 → 无可推考点
    expect(call({ questions: [{ id: 'X' } as unknown as Question] })).toBeNull();
  });

  it('口述实时回流参与四态：预告考点答错口头压 weak 时被补弱轨优先选中', () => {
    // EP-01 题全对但口头最近答错（负面优先压 weak）→ 补弱轨取 EP-01 而非结构轨
    const progress = progressOf({ C: rec({ correct: false, streak: 0, wrongCount: 1 }) }) as Progress;
    progress.oralAttempts = [
      { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: false, at: 2000, source: 'recall' },
    ];
    const hook = call({ progress });
    // 两个 weak（EP-01 口头弱、EP-02 错题弱）平手按未毕业错题数：EP-02 有 1 道、EP-01 有 0 道
    expect(hook).toMatchObject({ ep: 'EP-02', reason: 'weak' });
  });

  it('口述回流按主题隔离：他主题的口述条目不串进本主题预告', () => {
    // EP-01/EP-02 题全对（无负面即掌握），他主题名下挂着 EP-02 的口头答错——
    // 隔离正确时 EP-02 仍掌握、结构轨取未动的 EP-03；泄漏时 EP-02 被压 weak 抢占预告。
    const progress = progressOf({ A: rec(), B: rec(), C: rec() }) as Progress;
    progress.oralAttempts = [
      { theme: 'other-theme', target: 'EP-02 分支', correct: false, at: 1000, source: 'recall' },
    ];
    expect(call({ progress })).toMatchObject({ ep: 'EP-03', reason: 'structural' });
  });
});
