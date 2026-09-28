// plan.test.ts — 学习计划判据单测（TS 移植版，与 scripts/lib/plan.test.mjs 同判据；
// 双实现纪律：改判据两边一起改，两边测试都要过——数字必须与脚本侧手算一致）。
// 时间口径：now 是 ms 时间戳，按**本地自然日**解释；测试用「本地正午」构造，
// 任意时区跑都得同一自然日（跨时区确定）。
import { describe, it, expect } from 'vitest';
import type { PlanFile, PlanUnit, Progress } from '../types';
import {
  toLocalDateStr, parseLocalDate, diffCalendarDays,
  deriveCoverage, deriveCalendarDiff, deriveProjection, deriveGap, derivePlanReport, planUnitsByDay,
} from './plan';

/** 本地正午时间戳（h 可覆盖，同一天内任意小时不影响自然日判定）。 */
const NOON = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h, 0, 0).getTime();
const NOW = NOON(2026, 9, 28); // 「今天」= 2026-09-28

const u = (over: Partial<PlanUnit> & Pick<PlanUnit, 'id' | 'title' | 'order' | 'status'>): PlanUnit => over;
const planOf = (units: PlanUnit[], deadline?: string): PlanFile => ({ units, ...(deadline ? { deadline } : {}) });

const PLAN4 = planOf([
  u({ id: 'U-01', title: '基础', order: 1, plannedDate: '2026-09-01', status: 'done', doneDate: '2026-09-02' }),
  u({ id: 'U-02', title: '进阶', order: 2, plannedDate: '2026-09-08', status: 'in-progress' }),
  u({ id: 'U-03', title: '综合', order: 3, plannedDate: '2026-09-30', status: 'planned' }),
  u({ id: 'U-04', title: '补漏', order: 4, status: 'paused' }),
], '2026-10-15');

// ── 日期工具 ─────────────────────────────────────────────
describe('日期工具（本地自然日口径）', () => {
  it('toLocalDateStr：本地日历日，补零', () => {
    expect(toLocalDateStr(NOON(2026, 3, 5))).toBe('2026-03-05');
  });
  it('parseLocalDate：格式坏值与不存在的日历日 → null', () => {
    expect(parseLocalDate('2026-09-28')).toBeInstanceOf(Date);
    expect(parseLocalDate('2026-02-31')).toBeNull();   // 2 月没有 31 号
    expect(parseLocalDate('20260928')).toBeNull();
    expect(parseLocalDate(undefined)).toBeNull();
  });
  it('diffCalendarDays：自然日差（to − from），任一侧非法 → null', () => {
    expect(diffCalendarDays('2026-09-28', '2026-10-03')).toBe(5);
    expect(diffCalendarDays('2026-10-03', '2026-09-28')).toBe(-5);
    expect(diffCalendarDays('bad', '2026-10-03')).toBeNull();
  });
});

// ── 1. 覆盖 ───────────────────────────────────────────────
describe('deriveCoverage', () => {
  it('done/total、当前单元（in-progress 优先）、剩余清单按 order（含 paused）', () => {
    const c = deriveCoverage(PLAN4);
    expect(c.done).toBe(1);
    expect(c.total).toBe(4);
    expect(c.byStatus).toEqual({ planned: 1, 'in-progress': 1, done: 1, paused: 1 });
    expect(c.current?.id).toBe('U-02');                         // in-progress 优先当当前单元
    expect(c.remaining.map((x) => x.id)).toEqual(['U-02', 'U-03', 'U-04']); // 非 done 按 order
    expect(c.remaining[2].status).toBe('paused');               // paused 未完成 → 进剩余清单
    expect(c.current?.plannedDate).toBe('2026-09-08');          // 视图保留 plannedDate/day/topic
  });
  it('无 in-progress 时当前单元 = 第一个 planned（接下来该做的）', () => {
    const c = deriveCoverage(planOf([
      u({ id: 'U-01', title: 'a', order: 1, status: 'done' }),
      u({ id: 'U-02', title: 'b', order: 2, status: 'planned' }),
      u({ id: 'U-03', title: 'c', order: 3, status: 'planned' }),
    ]));
    expect(c.current?.id).toBe('U-02');
  });
  it('只剩 done/paused 时当前单元为 null（搁置不算在做）；空计划 0/0', () => {
    const c = deriveCoverage(planOf([
      u({ id: 'U-01', title: 'a', order: 1, status: 'done' }),
      u({ id: 'U-02', title: 'b', order: 2, status: 'paused' }),
    ]));
    expect(c.current).toBeNull();
    expect(c.remaining.map((x) => x.id)).toEqual(['U-02']);
    const empty = deriveCoverage(planOf([]));
    expect(empty).toEqual({ done: 0, total: 0, current: null, remaining: [], byStatus: { planned: 0, 'in-progress': 0, done: 0, paused: 0 } });
  });
  it('order 是排序真源（输入乱序输出仍按 order）', () => {
    const shuffled = planOf([...PLAN4.units!].reverse());
    expect(deriveCoverage(shuffled).remaining.map((x) => x.id)).toEqual(['U-02', 'U-03', 'U-04']);
  });
});

// ── 2. 节奏·日历对照 ──────────────────────────────────────
describe('deriveCalendarDiff', () => {
  it('落后——U-02 该 09-08 完成但未完成，今天 09-28 → 落后 20 天', () => {
    const d = deriveCalendarDiff(PLAN4, NOW);
    expect(d.available).toBe(true);
    expect(d.today).toBe('2026-09-28');
    expect(d.state).toBe('behind');
    expect(d.diffDays).toBe(-20);                       // 09-08 → 09-28 = 20 天，落后为负
    expect(d.shouldAt?.id).toBe('U-02');                // 今天该完成到这里（plannedDate<=今天 的最后一个）
    expect(d.actualAt?.id).toBe('U-01');                // 实际完成到哪（done 按 order 的最后一个）
    expect(d.overdue.map((o) => [o.id, o.daysOverdue])).toEqual([['U-02', 20]]);
  });
  it('富余——该到今天的都做完了，下一到期 10-03 → 富余 5 天', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' }),
      u({ id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-20', status: 'done' }),
      u({ id: 'U-03', title: 'c', order: 3, plannedDate: '2026-10-03', status: 'planned' }),
    ]), NOW);
    expect(d.state).toBe('slack');
    expect(d.diffDays).toBe(5);                         // 09-28 → 10-03
    expect(d.overdue).toEqual([]);
    expect(d.shouldAt?.id).toBe('U-02');
    expect(d.actualAt?.id).toBe('U-02');
  });
  it('下一单元今天到期（plannedDate==今天）不算逾期 → diffDays 0 / due-today', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' }),
      u({ id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-28', status: 'in-progress' }),
    ]), NOW);
    expect(d.state).toBe('due-today');
    expect(d.diffDays).toBe(0);
    expect(d.overdue).toEqual([]);                      // 逾期是严格 < 今天
  });
  it('有日程的都完成了、剩余单元无 plannedDate → cleared（diffDays 无锚点）', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'done' }),
      u({ id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-10', status: 'done' }),
      u({ id: 'U-03', title: 'c', order: 3, status: 'planned' }),   // 无 plannedDate：只进清单不进对照
    ]), NOW);
    expect(d.state).toBe('cleared');
    expect(d.diffDays).toBeNull();
    expect(d.actualAt?.id).toBe('U-02');
  });
  it('全计划无一个 plannedDate → available=false 诚实降级（UI 走降级文案）', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, status: 'planned' }),
    ]), NOW);
    expect(d.available).toBe(false);
    expect(d.reason).toBe('no-dated-units');
  });
  it('今天早于全部日程 → shouldAt=null、富余到第一个日程点', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, plannedDate: '2026-10-05', status: 'planned' }),
      u({ id: 'U-02', title: 'b', order: 2, plannedDate: '2026-10-20', status: 'planned' }),
    ]), NOW);
    expect(d.shouldAt).toBeNull();
    expect(d.state).toBe('slack');
    expect(d.diffDays).toBe(7); // 09-28 → 10-05
  });
  it('paused 逾期也按未完成算（搁置不豁免日程）；乱序完成时 actualAt 取 order 最大', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-01', title: 'a', order: 1, plannedDate: '2026-09-01', status: 'paused' }),
      u({ id: 'U-02', title: 'b', order: 2, plannedDate: '2026-09-10', status: 'done' }),
      u({ id: 'U-03', title: 'c', order: 3, plannedDate: '2026-09-15', status: 'done' }),
    ]), NOW);
    expect(d.state).toBe('behind');
    expect(d.diffDays).toBe(-27);
    expect(d.overdue.map((o) => o.id)).toEqual(['U-01']);
    expect(d.actualAt?.id).toBe('U-03'); // 实际完成推进到 order 最大者（非线性完成也如实）
  });
  it('plannedDate 无法解析（如 2026-02-31）→ 按 undated 处理 + invalidDateUnits 披露', () => {
    const d = deriveCalendarDiff(planOf([
      u({ id: 'U-BAD', title: 'x', order: 1, plannedDate: '2026-02-31', status: 'in-progress' }),
      u({ id: 'U-OK', title: 'y', order: 2, plannedDate: '2026-10-01', status: 'planned' }),
    ]), NOW);
    expect(d.invalidDateUnits).toEqual(['U-BAD']);
    expect(d.available).toBe(true);          // 还有合法日程单元 → 对照继续
    expect(d.state).toBe('slack');           // U-BAD 不参与，只剩 10-01 的日程
    expect(d.diffDays).toBe(3);
  });
});

// ── 3. 节奏·速率外推 ──────────────────────────────────────
// 复算说明（手算一遍，防判据漂移；改判据必须重算这里，且与 scripts/lib/plan.test.mjs 一致）：
//   今天 2026-09-28，窗口 = 含今天往前 14 个自然日 = 2026-09-15 ～ 2026-09-28。
//   U-01 doneDate 09-20、U-02 doneDate 09-26 均落窗 → eventsInWindow = 2。
//   速率 = 2/14（分母固定窗口长）→ 剩 2 单元 → 2 ÷ (2/14) = 14 天 → 09-28 + 14 = 10-12。
//   deadline 10-15 → slack = 10-15 − 10-12 = +3 天（富余为正）。
const PLAN_PROJ = planOf([
  u({ id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-20' }),
  u({ id: 'U-02', title: 'b', order: 2, status: 'done', doneDate: '2026-09-26' }),
  u({ id: 'U-03', title: 'c', order: 3, status: 'planned' }),
  u({ id: 'U-04', title: 'd', order: 4, status: 'planned' }),
], '2026-10-15');

describe('deriveProjection', () => {
  it('近 14 天 2 完成 → 预计 2026-10-12 完成，比 deadline 富余 3 天（手算见上）', () => {
    const p = deriveProjection(PLAN_PROJ, NOW);
    expect(p.available).toBe(true);
    expect(p.windowDays).toBe(14);
    expect(p.eventsInWindow).toBe(2);
    expect(p.ratePerDay).toBe(2 / 14);
    expect(p.remaining).toBe(2);
    expect(p.estimatedDays).toBe(14);
    expect(p.estimatedDoneDate).toBe('2026-10-12');
    expect(p.slackDays).toBe(3);
    expect(p.state).toBe('slack');
  });
  it('窗口边界：doneDate=今天−13（09-15）落窗、今天−14（09-14）不落窗；doneDate=今天也落窗', () => {
    const p = deriveProjection(planOf([
      u({ id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-15' }), // 距今 13 天 → 窗内
      u({ id: 'U-02', title: 'b', order: 2, status: 'done', doneDate: '2026-09-14' }), // 距今 14 天 → 窗外
      u({ id: 'U-03', title: 'c', order: 3, status: 'done', doneDate: '2026-09-28' }), // 今天 → 窗内
      u({ id: 'U-04', title: 'd', order: 4, status: 'planned' }),
    ]), NOW);
    expect(p.eventsInWindow).toBe(2);
    // 复算：2/14 每天，剩 1 单元 → 1 ÷ (2/14) = 7 天 → 09-28 + 7 = 10-05
    expect(p.estimatedDays).toBe(7);
    expect(p.estimatedDoneDate).toBe('2026-10-05');
  });
  it('降级：近 14 天无完成事件（doneDate 太老或缺失）→ 不硬算，available=false（UI 走降级文案）', () => {
    const p = deriveProjection(PLAN4, NOW); // 唯一 done 是 09-02（距今 26 天，窗外）
    expect(p.available).toBe(false);
    expect(p.reason).toBe('no-recent-completions');
    expect(p.ratePerDay).toBeNull();
    expect(p.estimatedDoneDate).toBeNull();
    expect(p.remaining).toBe(3);           // 数字照实给，只是不外推
    expect(p.note).toBeTruthy();            // 降级要给人读的理由
  });
  it('降级：全部完成 → complete；空计划 → no-units', () => {
    expect(deriveProjection(planOf(PLAN_PROJ.units!.slice(0, 2)), NOW).reason).toBe('complete');
    expect(deriveProjection(planOf([]), NOW).reason).toBe('no-units');
  });
  it('无 deadline → 预计完成日照算，slack 诚实置 null（no-deadline）', () => {
    const p = deriveProjection(planOf(PLAN_PROJ.units!), NOW); // 同 PLAN_PROJ 但去掉 deadline
    expect(p.available).toBe(true);
    expect(p.estimatedDoneDate).toBe('2026-10-12');
    expect(p.deadline).toBeNull();
    expect(p.slackDays).toBeNull();
    expect(p.state).toBe('no-deadline');
  });
  it('速率撑不到 deadline → 缺口为负（deficit）。复算：1 完成/14 天 × 剩 10 = 140 天', () => {
    // events=1（doneDate=今天）→ rate=1/14；剩 10 单元 → 10×14 = 140 天；
    //   09-28 + 140 天 = 2027-02-15；deadline 2026-12-01 → slack = −76 天（缺口）。
    const p = deriveProjection(planOf([
      u({ id: 'U-01', title: 'a', order: 1, status: 'done', doneDate: '2026-09-28' }),
      ...Array.from({ length: 10 }, (_, i) =>
        u({ id: `U-${String(i + 2).padStart(2, '0')}`, title: 'x', order: i + 2, status: 'planned' })),
    ], '2026-12-01'), NOW);
    expect(p.eventsInWindow).toBe(1);
    expect(p.estimatedDays).toBe(140);
    expect(p.estimatedDoneDate).toBe('2027-02-15');
    expect(p.slackDays).toBe(-76);
    expect(p.state).toBe('deficit');
  });
});

// ── 4. 断档天数 ───────────────────────────────────────────
describe('deriveGap', () => {
  const prog = (p: Partial<Progress>): Progress => ({ version: 1, answers: {}, ...p } as Progress);
  // 最小答题/SRS 记录（deriveGap 只读 submittedAt/updatedAt/deletedAt，判据对记录其余字段无感）
  const ans = (o: Record<string, Record<string, number | boolean>>): Progress['answers'] =>
    o as unknown as Progress['answers'];
  const srs = (o: Record<string, Record<string, number | string>>): NonNullable<Progress['srs']> =>
    o as unknown as NonNullable<Progress['srs']>;
  it('三通道（answers/srs/课学完）取最大，自然日差，报来源', () => {
    const g = deriveGap(prog({
      answers: ans({ A: { correct: true, submittedAt: NOON(2026, 9, 25, 9) } }),
      srs: srs({ 'FC-1': { phase: 'review', updatedAt: NOON(2026, 9, 27, 22) } }),
      coursesRead: { 't/git.html': NOON(2026, 9, 20, 10) },
    }), NOW, { questionIds: ['A'], cardIds: ['FC-1'], theme: 't' });
    expect(g.available).toBe(true);
    expect(g.source).toBe('srs');
    expect(g.daysSinceLastContact).toBe(1);   // 09-27 → 09-28（自然日，不是 24h 取整）
    expect(g.lastContactAt).toBe(NOON(2026, 9, 27, 22));
  });
  it('今天接触过 → 0 天；墓碑答案也算接触（提交发生过）', () => {
    const g = deriveGap(prog({
      answers: ans({ A: { correct: true, submittedAt: NOON(2026, 9, 28, 8), deletedAt: NOON(2026, 9, 28, 9) } }),
    }), NOW, { questionIds: ['A'], cardIds: [], theme: 't' });
    expect(g.available).toBe(true);
    expect(g.daysSinceLastContact).toBe(0);
    expect(g.source).toBe('answers');
  });
  it('无任何接触时间戳 → 诚实降级 no-contact（不是 0 天，UI 走降级文案）', () => {
    const g = deriveGap(prog({}), NOW, { questionIds: [], cardIds: [], theme: 't' });
    expect(g.available).toBe(false);
    expect(g.reason).toBe('no-contact');
    expect(g.daysSinceLastContact).toBeNull();
  });
  it('多主题隔离：其他主题的 answers/srs/课学完记录不参与（读端过滤红线）', () => {
    const g = deriveGap(prog({
      answers: ans({
        A: { correct: true, submittedAt: NOON(2026, 9, 25) },
        OTHER: { correct: true, submittedAt: NOON(2026, 9, 27) },
      }),
      srs: srs({
        'FC-1': { phase: 'review', updatedAt: NOON(2026, 9, 20) },
        'FC-9': { phase: 'review', updatedAt: NOON(2026, 9, 27) },
      }),
      coursesRead: { 't/x.html': NOON(2026, 9, 18), 'other/y.html': NOON(2026, 9, 27) },
    }), NOW, { questionIds: ['A'], cardIds: ['FC-1'], theme: 't' });
    expect(g.source).toBe('answers');               // 本主题最晚接触 = A 的 09-25
    expect(g.daysSinceLastContact).toBe(3);         // 09-25 → 09-28；OTHER/FC-9/other 主题全被滤掉
  });
});

// ── 5. day 映射（全景页 day 卡状态 chip 的数据面，#93）──────
describe('planUnitsByDay', () => {
  it('有 day 的单元按 day 分组、组内按 order；无 day 的不进映射（呈现面在首页面板）', () => {
    const m = planUnitsByDay(planOf([
      u({ id: 'U-02', title: 'b', order: 2, day: 'D2', status: 'in-progress' }),
      u({ id: 'U-01', title: 'a', order: 1, day: 'D2', status: 'done' }),
      u({ id: 'U-03', title: 'c', order: 3, status: 'planned' }),          // 无 day：只进首页剩余清单
      u({ id: 'U-04', title: 'd', order: 4, day: 'D1', status: 'planned' }),
    ]));
    expect([...m.keys()].sort()).toEqual(['D1', 'D2']);
    expect(m.get('D2')!.map((x) => x.id)).toEqual(['U-01', 'U-02']);       // 组内 order 序（输入乱序）
    expect(m.get('D1')!.map((x) => x.id)).toEqual(['U-04']);
    expect(m.get('D2')![0]).toMatchObject({ id: 'U-01', title: 'a', status: 'done' }); // 视图带 id/title/status
  });
  it('day 是 ADR-0009 命名空间的逐字匹配：不 trim、不归一大小写', () => {
    const m = planUnitsByDay(planOf([
      u({ id: 'U-01', title: 'a', order: 1, day: ' D1', status: 'planned' }),
      u({ id: 'U-02', title: 'b', order: 2, day: 'd1', status: 'planned' }),
    ]));
    expect([...m.keys()].sort()).toEqual([' D1', 'd1']);                   // 与 examDays 的 'D1' 都不是同一键
    expect(m.has('D1')).toBe(false);
  });
  it('脏数据容忍：空串/非字符串 day 与非对象条目跳过；空/无计划 → 空映射', () => {
    const dirty = { units: [null, 42,
      { id: 'U-01', title: 'a', order: 1, day: '', status: 'planned' },
      { id: 'U-02', title: 'b', order: 2, day: 7, status: 'planned' },
      { id: 'U-03', title: 'c', order: 3, day: 'D1', status: 'done' },
    ] } as unknown as PlanFile;
    expect([...planUnitsByDay(dirty).keys()]).toEqual(['D1']);
    expect(planUnitsByDay(dirty).get('D1')).toHaveLength(1);
    expect(planUnitsByDay(planOf([])).size).toBe(0);
    expect(planUnitsByDay(null).size).toBe(0);
  });
});

// ── 总装 + 边界 ──────────────────────────────────────────
describe('derivePlanReport 总装（首页面板复算入口）', () => {
  it('四组信号一次派生（含降级面），数字与 scripts/lib/plan.mjs 的 fixture 复算一致', () => {
    const r = derivePlanReport({
      plan: PLAN4, progress: { version: 1, answers: {} }, now: NOW,
      questionIds: [], cardIds: [], theme: 'plan-with',
    });
    expect(r.coverage.done).toBe(1);
    expect(r.coverage.current?.id).toBe('U-02');
    expect(r.coverage.remaining.map((x) => x.id)).toEqual(['U-02', 'U-03', 'U-04']);
    expect(r.calendarDiff.state).toBe('behind');               // U-02 该 09-08 完成，今天 09-28
    expect(r.calendarDiff.diffDays).toBe(-20);
    expect(r.projection.available).toBe(false);                // 唯一 done 的 doneDate 09-02 在窗外
    expect(r.projection.reason).toBe('no-recent-completions');
    expect(r.gap.available).toBe(false);                       // 空进度 → 无接触
    expect(r.gap.reason).toBe('no-contact');
  });
  it('空计划（无 plan.json 的 sync 回退形态）：全降级不编数——首页据此不渲染面板', () => {
    const r = derivePlanReport({ plan: planOf([]), progress: null, now: NOW, questionIds: [], cardIds: [], theme: 'x' });
    expect(r.coverage.remaining).toEqual([]);
    expect(r.coverage.total).toBe(0);
    expect(r.calendarDiff.available).toBe(false);
    expect(r.projection.available).toBe(false);
    expect(r.gap.available).toBe(false);
  });
  it('脏数据容忍：units 里的非对象条目跳过不崩（sync 只保证 units 是数组）', () => {
    const dirty = { units: [null, 42, PLAN4.units![0], PLAN4.units![1]] } as unknown as PlanFile;
    expect(deriveCoverage(dirty).total).toBe(2);
    expect(deriveCoverage(dirty).done).toBe(1);
    expect(deriveCoverage(dirty).current?.id).toBe('U-02');
    expect(deriveCalendarDiff(dirty, NOW).state).toBe('behind');   // U-02 plannedDate 09-08 逾期
    expect(deriveProjection(dirty, NOW).reason).toBe('no-recent-completions');
  });
});
