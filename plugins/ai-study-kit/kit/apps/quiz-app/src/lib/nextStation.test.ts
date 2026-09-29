// nextStation.test.ts — 下一站推荐纯函数单测（v0.25 票⑥，spec #110 测试决策的最高 seam：
// 一次调用吃四态 + 映射 + 计划，吐推荐 + 理由 + 次选）。
//
// 覆盖面（票 #116 验收）：
//   - 补弱优先（含未毕业错题数排序、拖住下游名单、平手排布表序）
//   - 拓扑解锁序（排布表早但被前置锁住的考点不取；薄弱点堵住下游；环容忍）
//   - 目标日插队（有目标日 + 落后日程 → 压过补弱；逾期考点已掌握则跳过）
//   - 无映射回退排布表顺序（无 knowflow 边 → 结构轨 = 数组序近似）
//   - 无目标日输出不含节奏字段（零催办原则的函数面）
//   - 空输入 / 全掌握 → 无推荐（页面隐藏推荐卡）
import { describe, it, expect } from 'vitest';
import { nextStation, type PlanGapInput } from './nextStation';
import type { PanoramaPoint } from './panorama';
import type { MasteryStatus } from './mastery';

/** 夹具考点工厂：name 取 N-{ep} 便于断言下游名单；openWrong 默认 0（weak 判据由调用方给）。 */
const pt = (ep: string, status: MasteryStatus, extra: Partial<PanoramaPoint> = {}): PanoramaPoint => ({
  ep, name: `N-${ep}`, taught: true, practiced: true, mastered: status === 'mastered',
  status, answered: 1, total: 2, openWrong: 0, oral: null, ...extra,
});

const edge = (from: string, to: string, prerequisite = true) => ({ from, to, prerequisite });

describe('补弱优先（复习优先于结构，不受拓扑门控）', () => {
  it('有 weak 考点 → 主推补弱：理由带未毕业错题数与被拖住的直接下游名单', () => {
    const r = nextStation({
      points: [pt('EP-01', 'mastered'), pt('EP-02', 'weak', { openWrong: 2 }), pt('EP-03', 'untouched')],
      edges: [edge('EP-02', 'EP-03'), edge('EP-01', 'EP-02')],
    });
    expect(r.primary).toMatchObject({ ep: 'EP-02', reason: 'weak' });
    expect(r.primary!.weak).toEqual({ openWrong: 2, downstream: ['N-EP-03'] }); // EP-03 以它为前置且未掌握
  });

  it('多个 weak 按未毕业错题数降序；平手按排布表（数组）序', () => {
    const r = nextStation({
      points: [pt('EP-01', 'weak', { openWrong: 1 }), pt('EP-02', 'weak', { openWrong: 3 }), pt('EP-03', 'weak', { openWrong: 3 })],
    });
    expect(r.primary!.ep).toBe('EP-02'); // 3 > 1；EP-02/EP-03 平手 → 数组序在前
  });

  it('下游已掌握就不算「拖住」；无前置映射时下游恒为空', () => {
    const r = nextStation({
      points: [pt('EP-01', 'weak'), pt('EP-02', 'mastered'), pt('EP-03', 'untouched')],
      edges: [edge('EP-01', 'EP-02'), edge('EP-01', 'EP-03')],
    });
    expect(r.primary!.weak!.downstream).toEqual(['N-EP-03']); // EP-02 已掌握不算
    const noMap = nextStation({ points: [pt('EP-01', 'weak'), pt('EP-02', 'untouched')] });
    expect(noMap.primary!.weak!.downstream).toEqual([]);
    expect(noMap.structural).toBe('schedule');
  });
});

describe('拓扑解锁序（无 weak 时结构轨主推）', () => {
  it('排布表早但被未掌握前置锁住的考点不取——取拓扑序最早解锁者', () => {
    const r = nextStation({
      points: [pt('EP-03', 'untouched'), pt('EP-02', 'untouched')], // 数组序 EP-03 在前
      edges: [edge('EP-02', 'EP-03')],                                // EP-02 是 EP-03 的前置
    });
    expect(r.primary).toMatchObject({ ep: 'EP-02', reason: 'unlocked' });
    expect(r.alt).toBeNull(); // 全图仅剩 EP-03 且被主推锁住 → 次选空（页面隐藏次选行，不编造）
    expect(r.structural).toBe('knowflow');
  });

  it('结构轨主推后还有解锁支路 → 次选 = 结构轨下一个', () => {
    const r = nextStation({
      points: [pt('EP-03', 'untouched'), pt('EP-02', 'untouched'), pt('EP-04', 'untouched')],
      edges: [edge('EP-02', 'EP-03')],
    });
    expect(r.primary).toMatchObject({ ep: 'EP-02', reason: 'unlocked' });
    expect(r.alt).toMatchObject({ ep: 'EP-04', reason: 'unlocked' }); // EP-04 无前置、可并行
  });

  it('前置全部掌握 → 下游解锁可取；非前置边（prerequisite=false）不参与解锁判据', () => {
    const r = nextStation({
      points: [pt('EP-01', 'mastered'), pt('EP-02', 'untouched')],
      edges: [edge('EP-01', 'EP-02')],
    });
    expect(r.primary!.ep).toBe('EP-02');
    const related = nextStation({
      points: [pt('EP-01', 'weak'), pt('EP-02', 'untouched')],
      edges: [edge('EP-01', 'EP-02', false)], // 仅关联边：EP-02 不被锁
    });
    expect(related.primary).toMatchObject({ ep: 'EP-01', reason: 'weak' }); // 有 weak 仍补弱
    expect(related.primary!.weak!.downstream).toEqual([]);                  // 关联边不算拖住
  });

  it('薄弱点堵住下游：结构轨（次选）跳过被堵考点，取另一条解锁支路', () => {
    const r = nextStation({
      points: [pt('EP-01', 'weak'), pt('EP-02', 'untouched'), pt('EP-03', 'untouched')],
      edges: [edge('EP-01', 'EP-02')],
    });
    expect(r.primary!.ep).toBe('EP-01');                              // 补弱优先
    expect(r.alt).toMatchObject({ ep: 'EP-03', reason: 'unlocked' }); // EP-02 被 EP-01 堵 → 次选 EP-03
  });

  it('前置成环：环节点垫底不崩，取环外解锁考点；端点未知的边忽略', () => {
    const r = nextStation({
      points: [pt('EP-01', 'untouched'), pt('EP-02', 'untouched'), pt('EP-03', 'untouched')],
      edges: [edge('EP-01', 'EP-02'), edge('EP-02', 'EP-01'), edge('EP-09', 'EP-03')],
    });
    expect(r.primary!.ep).toBe('EP-03'); // EP-01/02 互为前置解析不了 → EP-03（未知端点边已忽略）
    expect(r.structural).toBe('knowflow');
  });
});

describe('目标日插队（落后日程压过补弱——仅当有目标日）', () => {
  const gap = (over: string[], days = 4): PlanGapInput => ({ deadline: '2026-10-15', overdueEps: over, daysOverdue: days });

  it('有目标日 + 落后日程考点 → 主推落后日程（插队压过补弱），次选补弱', () => {
    const r = nextStation({
      points: [pt('EP-01', 'weak', { openWrong: 2 }), pt('EP-02', 'untouched')],
      planGap: gap(['EP-02']),
    });
    expect(r.primary).toMatchObject({ ep: 'EP-02', reason: 'behindSchedule', daysOverdue: 4 });
    expect(r.alt).toMatchObject({ ep: 'EP-01', reason: 'weak' });
  });

  it('逾期清单里已掌握的考点跳过；清单空 → 无落后轨，回补弱/结构', () => {
    const r = nextStation({
      points: [pt('EP-01', 'mastered'), pt('EP-02', 'weak', { openWrong: 1 })],
      planGap: gap(['EP-01']),
    });
    expect(r.primary).toMatchObject({ ep: 'EP-02', reason: 'weak' });
    const empty = nextStation({ points: [pt('EP-01', 'untouched')], planGap: gap([]) });
    expect(empty.primary).toMatchObject({ ep: 'EP-01', reason: 'unlocked' });
  });

  it('插队考点本身就是最弱项 → 次选退到结构轨下一个（不撞同一考点）', () => {
    const r = nextStation({
      points: [pt('EP-01', 'weak', { openWrong: 2 }), pt('EP-02', 'untouched')],
      planGap: gap(['EP-01']),
    });
    expect(r.primary).toMatchObject({ ep: 'EP-01', reason: 'behindSchedule' });
    expect(r.alt).toMatchObject({ ep: 'EP-02', reason: 'unlocked' });
  });
});

describe('无映射回退排布表顺序', () => {
  it("无 knowflow 边 → 结构轨 = 数组序近似（structural='schedule'），主推数组序第一个非掌握", () => {
    const r = nextStation({
      points: [pt('EP-01', 'mastered'), pt('EP-03', 'untouched'), pt('EP-02', 'inProgress')],
    });
    expect(r.structural).toBe('schedule');
    expect(r.primary).toMatchObject({ ep: 'EP-03', reason: 'unlocked' }); // 数组序第一个非掌握
    expect(r.alt).toMatchObject({ ep: 'EP-02' });                          // 次选 = 再下一个
  });

  it('边全为未知端点 → 同无映射（schedule 回退）', () => {
    const r = nextStation({
      points: [pt('EP-01', 'untouched'), pt('EP-02', 'untouched')],
      edges: [edge('EP-09', 'EP-08')],
    });
    expect(r.structural).toBe('schedule');
    expect(r.primary!.ep).toBe('EP-01');
  });
});

describe('无目标日输出不含节奏字段（零催办原则的函数面）', () => {
  it('planGap 为 null/缺省 → 序列化输出零 behindSchedule / daysOverdue / deadline 痕迹', () => {
    for (const planGap of [null, undefined]) {
      const r = nextStation({
        points: [pt('EP-01', 'weak', { openWrong: 2 }), pt('EP-02', 'untouched')],
        planGap,
      });
      expect(r.primary!.reason).toBe('weak');
      const s = JSON.stringify(r);
      expect(s).not.toContain('behindSchedule');
      expect(s).not.toContain('daysOverdue');
      expect(s).not.toContain('deadline');
    }
  });
});

describe('空输入 / 全掌握 → 无推荐', () => {
  it('空考点集 → primary/alt 均 null', () => {
    const r = nextStation({ points: [] });
    expect(r).toEqual({ primary: null, alt: null, structural: 'schedule' });
  });

  it('全部已掌握 → 无可推荐（页面隐藏推荐卡）', () => {
    const r = nextStation({
      points: [pt('EP-01', 'mastered'), pt('EP-02', 'mastered')],
      edges: [edge('EP-01', 'EP-02')],
      planGap: { deadline: '2026-10-15', overdueEps: ['EP-01'], daysOverdue: 3 }, // 逾期但已掌握 → 不推
    });
    expect(r.primary).toBeNull();
    expect(r.alt).toBeNull();
  });
});
