// panorama.test.ts — 考点全景 web 侧聚合单测（与 scripts/lib/panorama.test.mjs 同口径镜像，
// 双实现纪律：判据两边同步改、测试两边都有——沿 mastery 双实现先例）。
import { describe, it, expect } from 'vitest';
import {
  buildPanorama, UNSCHEDULED_DAY, shouldRenderGraph, parsePanoramaFilter,
  pointMatchesFilter, countStatuses, groupByTopic,
  type CoverageSnapshot, type PanoramaPoint,
} from './panorama';
import type { AnswerRecord, OralAttempt, Question } from '../types';

const qs = (pairs: [string, string[]][]): Question[] =>
  pairs.flatMap(([ep, ids]) => ids.map((id) => ({ id, examPoint: ep }) as unknown as Question));
const questions = qs([
  ['EP-01', ['A', 'B']],
  ['EP-02', ['C']],
  ['EP-03', ['D', 'E']],
  ['EP-04', ['F']],
]);
const rec = (extra: Partial<AnswerRecord> = {}): AnswerRecord =>
  ({ correct: true, ...extra } as AnswerRecord);
const epNames = { 'EP-01': '暂存区', 'EP-02': 'revert', 'EP-03': 'chmod', 'EP-04': '相对路径' };
const epDays = { 'EP-01': 'D1', 'EP-02': 'D2', 'EP-03': 'D2', 'EP-04': 'D10' };

const coverage = (points: CoverageSnapshot['points'], courseTaughtAll = false): CoverageSnapshot => ({
  theme: 't', generatedAt: '2026-09-14T00:00:00Z', courseTaughtAll, points,
});

describe('buildPanorama 三信号（与脚本侧同口径）', () => {
  it('讲过来自快照与课程通道、练过来自答题或口头计数、掌握为四态判据', () => {
    const r = buildPanorama(
      questions,
      {
        A: rec(), B: rec(),                                            // EP-01 全对 → mastered
        C: rec({ correct: false, streak: 0, wrongCount: 1 }),         // EP-02 答错
        // EP-03 无答题但口头计数 → practiced 弱信号；EP-04 全空
      },
      epNames, [], {},
      coverage([
        { ep: 'EP-01', taught: true, practiced: true, mastered: true, oral: { asked: 3, correct: 2 } },
        { ep: 'EP-02', taught: false, practiced: false, mastered: false, oral: null },
        { ep: 'EP-03', taught: true, practiced: true, mastered: false, oral: { asked: 2, correct: 1 } },
        { ep: 'EP-04', taught: false, practiced: false, mastered: false, oral: null },
      ]),
      epDays,
    );
    const byEp = Object.fromEntries(r.groups.flatMap((g) => g.points.map((p) => [p.ep, p])));
    expect(byEp['EP-01']).toMatchObject({ taught: true, practiced: true, mastered: true, oral: { asked: 3, correct: 2 } });
    expect(byEp['EP-02']).toMatchObject({ taught: false, practiced: true, mastered: false });
    expect(byEp['EP-03']).toMatchObject({ taught: true, practiced: true, mastered: false });
    expect(byEp['EP-04']).toMatchObject({ taught: false, practiced: false, mastered: false, oral: null, status: 'untouched' });
  });

  it('courseTaughtAll 点亮全部讲过（无快照单点也亮）；无快照时讲过全 false', () => {
    const r = buildPanorama(questions, {}, epNames, [], {}, coverage([], true), epDays);
    expect(r.courseTaughtAll).toBe(true);
    expect(r.summary).toEqual({ examPoints: 4, taught: 4, practiced: 0, mastered: 0 });

    const none = buildPanorama(questions, {}, epNames, [], {}, null, epDays);
    expect(none.summary).toEqual({ examPoints: 4, taught: 0, practiced: 0, mastered: 0 });
  });

  it('day 分组：数字序（D2 < D10）+ 未排程垫底 + 组内汇总行', () => {
    const days = { ...epDays, 'EP-04': '——' } as Record<string, string>;
    // —— 占位在 sync 侧已被 epDayMap 过滤；web 侧兜底：未列入 epDays 的考点归未排程
    const days2: Record<string, string> = { 'EP-01': 'D1', 'EP-02': 'D2', 'EP-03': 'D2' };
    const r = buildPanorama(questions, { A: rec(), B: rec() }, epNames, [], {}, coverage([], false), days2);
    expect(r.groups.map((g) => g.day)).toEqual(['D1', 'D2', UNSCHEDULED_DAY]);
    expect(r.groups[0].summary).toEqual({ total: 1, taught: 0, practiced: 1, mastered: 1 });
    expect(r.groups[2].points[0].ep).toBe('EP-04');
    expect(days['EP-04']).toBe('——'); // 排布表占位符（文档性断言：sync 侧负责不输出它）
  });

  // ── 口述四态参与掌握判据（v1.2，#119：web 侧输入 = 覆盖快照 oralStatus）─────────
  it('快照 oralStatus 驱动掌握：达标点亮 / 未达标压 inProgress / weak 压 weak；无快照状态 = 解锁', () => {
    const all = { A: rec(), B: rec(), C: rec(), D: rec(), E: rec(), F: rec() }; // 四考点题全对
    const cov = coverage([
      { ep: 'EP-01', taught: false, practiced: true, mastered: true, oral: null, oralStatus: 'mastered' },
      { ep: 'EP-02', taught: false, practiced: true, mastered: true, oral: null, oralStatus: 'inProgress' },
      { ep: 'EP-03', taught: false, practiced: true, mastered: true, oral: { asked: 3, correct: 0 }, oralStatus: 'weak' },
      { ep: 'EP-04', taught: false, practiced: true, mastered: true, oral: null }, // 无口述数据
    ]);
    const r = buildPanorama(questions, all, epNames, [], {}, cov, epDays);
    const byEp = Object.fromEntries(r.groups.flatMap((g) => g.points.map((p) => [p.ep, p])));
    expect(byEp['EP-01']).toMatchObject({ status: 'mastered', mastered: true, oralStatus: 'mastered' });
    expect(byEp['EP-02']).toMatchObject({ status: 'inProgress', mastered: false, oralStatus: 'inProgress' });
    expect(byEp['EP-03']).toMatchObject({ status: 'weak', mastered: false, oralStatus: 'weak' });
    expect(byEp['EP-04']).toMatchObject({ status: 'mastered', mastered: true, oralStatus: null }); // 零闪卡零口述解锁
  });

  it('旧格式快照（无 oralStatus 字段，build 升级前的 coverage.json）不阻塞掌握', () => {
    const cov = coverage([
      { ep: 'EP-01', taught: false, practiced: true, mastered: true, oral: { asked: 5, correct: 1 } },
    ]);
    const r = buildPanorama(questions, { A: rec(), B: rec() }, epNames, [], {}, cov, epDays);
    expect(r.groups.flatMap((g) => g.points).find((p) => p.ep === 'EP-01')!.status).toBe('mastered');
  });

  // ── 口述实时回流（#122，v0.26）：progress.oralAttempts 现算优先、快照回退 ──────────
  it('实时口述驱动掌握：实时流水现算四态与计数，刷新即生效不等 build', () => {
    const all = { A: rec(), B: rec(), C: rec() }; // EP-01/EP-02 题全对
    const live: OralAttempt[] = [
      { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: true, at: 2000, source: 'recite' },
      { target: 'EP-01 暂存区', correct: true, at: 3000, source: 'case' },     // 3 连对 → mastered
      { target: 'EP-02 revert', correct: true, at: 4000, source: 'recall' },
      { target: 'EP-02 revert', correct: false, at: 5000, source: 'recall' },  // 最近判错 → weak
    ];
    // 快照故意给相反的旧状态（EP-01 weak / EP-02 mastered）——实时流水必须压过快照
    const cov = coverage([
      { ep: 'EP-01', taught: false, practiced: true, mastered: false, oral: { asked: 9, correct: 0 }, oralStatus: 'weak' },
      { ep: 'EP-02', taught: false, practiced: true, mastered: false, oral: { asked: 9, correct: 9 }, oralStatus: 'mastered' },
    ]);
    const r = buildPanorama(questions, all, epNames, [], {}, cov, epDays, live);
    const byEp = Object.fromEntries(r.groups.flatMap((g) => g.points.map((p) => [p.ep, p])));
    expect(byEp['EP-01']).toMatchObject({ status: 'mastered', oralStatus: 'mastered', oral: { asked: 3, correct: 3 } });
    expect(byEp['EP-02']).toMatchObject({ status: 'weak', oralStatus: 'weak', oral: { asked: 2, correct: 1 } });
  });

  it('实时口述逐考点回退：无实时流水的考点吃快照 oralStatus/oral（离线场景旧路径不破坏）', () => {
    const all = { A: rec(), B: rec(), C: rec() };
    const live: OralAttempt[] = [
      { target: 'EP-01 暂存区', correct: true, at: 1000, source: 'recall' },
      { target: 'EP-01 暂存区', correct: true, at: 2000, source: 'recite' },
      { target: 'EP-01 暂存区', correct: true, at: 3000, source: 'case' },     // EP-01 实时 mastered
    ];
    const cov = coverage([
      { ep: 'EP-01', taught: false, practiced: true, mastered: false, oral: { asked: 1, correct: 0 }, oralStatus: 'weak' },
      { ep: 'EP-02', taught: false, practiced: true, mastered: false, oral: { asked: 2, correct: 2 }, oralStatus: 'mastered' },
    ]);
    const r = buildPanorama(questions, all, epNames, [], {}, cov, epDays, live);
    const byEp = Object.fromEntries(r.groups.flatMap((g) => g.points.map((p) => [p.ep, p])));
    // EP-01 实时覆盖快照；EP-02 无实时流水 → 快照 mastered 照走
    expect(byEp['EP-01']).toMatchObject({ status: 'mastered', oral: { asked: 3, correct: 3 } });
    expect(byEp['EP-02']).toMatchObject({ status: 'mastered', oral: { asked: 2, correct: 2 }, oralStatus: 'mastered' });
  });

  it('实时口述也点亮练过弱信号（无答题考点口头有流水 → practiced）', () => {
    const live: OralAttempt[] = [
      { target: 'EP-04 相对路径', correct: false, at: 1000, source: 'recall' },
    ];
    const r = buildPanorama(questions, {}, epNames, [], {}, coverage([]), epDays, live);
    const p4 = r.groups.flatMap((g) => g.points).find((p) => p.ep === 'EP-04')!;
    expect(p4.practiced).toBe(true);
    expect(p4.status).toBe('weak');        // 无答题 + 口述 weak → 负面证据优先压 weak
    expect(p4.oral).toEqual({ asked: 1, correct: 0 });
  });

  it('裸考点名解析进实时通道（与脚本侧 groupOralAttempts 同两条正路）', () => {
    const live: OralAttempt[] = [{ target: '暂存区', correct: true, at: 1000, source: 'recall' }];
    const r = buildPanorama(questions, { A: rec(), B: rec() }, epNames, [], {}, coverage([]), epDays, live);
    const p1 = r.groups.flatMap((g) => g.points).find((p) => p.ep === 'EP-01')!;
    expect(p1.oral).toEqual({ asked: 1, correct: 1 });       // 计入了 EP-01
    expect(p1.status).toBe('inProgress');                    // 1 次封顶 0.5 未达标（题全对但口述有数据）
  });
});

describe('shouldRenderGraph 连线渲染判据（v0.14，无图/超限回退清单）', () => {
  const edges = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ from: `EP-${i}`, to: `EP-${i + 1}`, prerequisite: true }));

  it('有边且不超阈值 → 渲染', () => {
    expect(shouldRenderGraph(4, edges(3))).toBe(true);
  });

  it('无图 / 空边 / null → 回退现有分组清单（回退语义，不报错）', () => {
    expect(shouldRenderGraph(4, null)).toBe(false);
    expect(shouldRenderGraph(4, undefined)).toBe(false);
    expect(shouldRenderGraph(4, [])).toBe(false);
  });

  it('超可读阈值（边数 / 节点数上限）→ 回退', () => {
    expect(shouldRenderGraph(4, edges(201))).toBe(false);
    expect(shouldRenderGraph(81, edges(3))).toBe(false);
    expect(shouldRenderGraph(80, edges(200))).toBe(true);
  });
});

describe('pointMatchesFilter / parsePanoramaFilter（筛选纯函数，#78 深链 + 票⑤压暗语义）', () => {
  // 四态齐备的夹具：EP-01 mastered / EP-02 weak / EP-03 inProgress（对一半无错）/ EP-04 untouched
  const cov = coverage([
    { ep: 'EP-01', taught: true, practiced: true, mastered: true, oral: null },
    { ep: 'EP-02', taught: true, practiced: true, mastered: false, oral: null },
    { ep: 'EP-03', taught: true, practiced: true, mastered: false, oral: null },
    { ep: 'EP-04', taught: false, practiced: false, mastered: false, oral: null },
  ]);
  const answers = {
    A: rec(), B: rec(),                                       // EP-01 全对 → mastered
    C: rec({ correct: false, streak: 0, wrongCount: 1 }),     // EP-02 答错 → weak
    D: rec(),                                                 // EP-03 对一半 → inProgress
  };
  const points = buildPanorama(questions, answers, epNames, [], {}, cov, epDays)
    .groups.flatMap((g) => g.points);
  const epsOf = (ps: PanoramaPoint[]) => ps.map((p) => p.ep);

  it('「全部」全命中', () => {
    expect(points.filter((p) => pointMatchesFilter(p, 'all')).map((p) => p.ep)).toEqual(['EP-01', 'EP-02', 'EP-03', 'EP-04']);
  });

  it('「只看薄弱」仅命中 status === weak（与旧档位判据同口径，命中外的节点由页面压暗）', () => {
    expect(epsOf(points.filter((p) => pointMatchesFilter(p, 'weak')))).toEqual(['EP-02']);
  });

  it('「只看未掌握」= 非 mastered 全集（弱 + 进行中 + 未开始）', () => {
    expect(epsOf(points.filter((p) => pointMatchesFilter(p, 'unmastered')))).toEqual(['EP-02', 'EP-03', 'EP-04']);
  });

  it('parsePanoramaFilter：合法枚举放行，非法/缺失回退「全部」（?filter= 深链容错）', () => {
    expect(parsePanoramaFilter('weak')).toBe('weak');
    expect(parsePanoramaFilter('unmastered')).toBe('unmastered');
    expect(parsePanoramaFilter('all')).toBe('all');
    expect(parsePanoramaFilter('xxx')).toBe('all');
    expect(parsePanoramaFilter('')).toBe('all');
    expect(parsePanoramaFilter(null)).toBe('all');
    expect(parsePanoramaFilter(undefined)).toBe('all');
  });
});

describe('countStatuses / groupByTopic（票⑤构成条 + 大类糖果路径派生）', () => {
  const cov = coverage([
    { ep: 'EP-01', taught: true, practiced: true, mastered: true, oral: null },
    { ep: 'EP-02', taught: true, practiced: true, mastered: false, oral: null },
    { ep: 'EP-03', taught: true, practiced: true, mastered: false, oral: null },
    { ep: 'EP-04', taught: false, practiced: false, mastered: false, oral: null },
  ]);
  const answers = {
    A: rec(), B: rec(),
    C: rec({ correct: false, streak: 0, wrongCount: 1 }),
    D: rec(),
  };
  const points = buildPanorama(questions, answers, epNames, [], {}, cov, epDays)
    .groups.flatMap((g) => g.points);
  // 带大类题库：EP-01/02 → git，EP-03/04 → linux（EP-10 证组内数字序 EP-2 < EP-10）
  const topicQs: Question[] = [
    { id: 'A', examPoint: 'EP-01', topic: 'git' },
    { id: 'B', examPoint: 'EP-01', topic: 'git' },
    { id: 'C', examPoint: 'EP-02', topic: 'git' },
    { id: 'D', examPoint: 'EP-03', topic: 'linux' },
    { id: 'E', examPoint: 'EP-03', topic: 'linux' },
    { id: 'F', examPoint: 'EP-04', topic: 'linux' },
    { id: 'G1', examPoint: 'EP-10', topic: 'git' },
    { id: 'G2', examPoint: 'EP-05', topic: 'linux' },
  ] as unknown as Question[];

  it('countStatuses 四态计数与 status 派生同口径（构成条数字源）', () => {
    expect(countStatuses(points)).toEqual({ mastered: 1, inProgress: 1, weak: 1, untouched: 1 });
    expect(countStatuses([])).toEqual({ mastered: 0, inProgress: 0, weak: 0, untouched: 0 });
  });

  it('groupByTopic：大类顺序 = topicOrder 序 + 未列出字母序兜底；组内 EP 数字序', () => {
    const all = buildPanorama(topicQs, answers, { ...epNames, 'EP-05': 'x', 'EP-10': 'y' }, [], {}, cov, epDays)
      .groups.flatMap((g) => g.points);
    const sections = groupByTopic(topicQs, all, ['linux', 'git']);
    expect(sections.map((s) => s.topic)).toEqual(['linux', 'git']);  // topicOrder 序优先
    expect(sections.find((s) => s.topic === 'git')!.points.map((p) => p.ep))
      .toEqual(['EP-01', 'EP-02', 'EP-10']);                          // 数字序 EP-2 < EP-10
    const noOrder = groupByTopic(topicQs, all, []);
    expect(noOrder.map((s) => s.topic)).toEqual(['git', 'linux']);   // 无配置 → 字母序
  });

  it('groupByTopic：每节带四态计数；题库未标 topic 的考点归 "" 桶不丢点', () => {
    const bareQs: Question[] = qs([['EP-01', ['A']], ['EP-02', ['C']]]);
    const barePts = buildPanorama(bareQs, {}, epNames, [], {}, null, {}).groups.flatMap((g) => g.points);
    const sections = groupByTopic(bareQs, barePts, []);
    expect(sections).toHaveLength(1);
    expect(sections[0].topic).toBe('');
    expect(sections[0].points.map((p) => p.ep)).toEqual(['EP-01', 'EP-02']);
    expect(sections[0].counts).toEqual({ mastered: 0, inProgress: 0, weak: 0, untouched: 2 });
  });
});
