// panorama.test.ts — 考点全景 web 侧聚合单测（与 scripts/lib/panorama.test.mjs 同口径镜像，
// 双实现纪律：判据两边同步改、测试两边都有——沿 mastery 双实现先例）。
import { describe, it, expect } from 'vitest';
import { buildPanorama, UNSCHEDULED_DAY, shouldRenderGraph, filterPanoramaGroups, parsePanoramaFilter, type CoverageSnapshot } from './panorama';
import type { AnswerRecord, Question } from '../types';

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

describe('filterPanoramaGroups / parsePanoramaFilter（筛选纯函数，#78）', () => {
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
  const groups = buildPanorama(questions, answers, epNames, [], {}, cov, epDays).groups;
  const epsOf = (gs: typeof groups) => gs.flatMap((g) => g.points.map((p) => p.ep));

  it('「全部」原样返回（不复制不改写）', () => {
    expect(filterPanoramaGroups(groups, 'all')).toBe(groups);
  });

  it('「弱项」仅留 status === weak，空 day 组整组隐藏', () => {
    const weak = filterPanoramaGroups(groups, 'weak');
    expect(epsOf(weak)).toEqual(['EP-02']);      // EP-01 mastered / EP-03 inProgress / EP-04 untouched 全被滤掉
    expect(weak.map((g) => g.day)).toEqual(['D2']); // D1、D10 整组消失
  });

  it('「未掌握」= 非 mastered 全集（弱 + 进行中 + 未开始）， mastered 组隐藏', () => {
    const un = filterPanoramaGroups(groups, 'unmastered');
    expect(epsOf(un)).toEqual(['EP-02', 'EP-03', 'EP-04']);
    expect(un.map((g) => g.day)).toEqual(['D2', 'D10']);
  });

  it('筛选后组内 summary 按可见行重算（与展示自洽）', () => {
    const weak = filterPanoramaGroups(groups, 'weak');
    expect(weak[0].summary).toEqual({ total: 1, taught: 1, practiced: 1, mastered: 0 });
  });

  it('全空结果（如全部已掌握时筛弱项）→ 返回空组列表不报错', () => {
    const mastered = buildPanorama(
      questions,
      { A: rec(), B: rec(), C: rec(), D: rec(), E: rec(), F: rec() },
      epNames, [], {}, cov, epDays,
    ).groups;
    expect(filterPanoramaGroups(mastered, 'weak')).toEqual([]);
  });

  it('parsePanoramaFilter：合法枚举放行，非法/缺失回退「全部」', () => {
    expect(parsePanoramaFilter('weak')).toBe('weak');
    expect(parsePanoramaFilter('unmastered')).toBe('unmastered');
    expect(parsePanoramaFilter('all')).toBe('all');
    expect(parsePanoramaFilter('xxx')).toBe('all');
    expect(parsePanoramaFilter('')).toBe('all');
    expect(parsePanoramaFilter(null)).toBe('all');
    expect(parsePanoramaFilter(undefined)).toBe('all');
  });
});
