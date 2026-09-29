// panorama.ts — 考点全景图（web 侧聚合，scripts/lib/panorama.mjs 的 TS 移植）。
//
// ⚠️ 口径与 scripts/lib/panorama.mjs 必须保持同步（mastery-report / skill 探测用那边的
// 版本，web /panorama 独立页用这边）——沿 mastery.ts/mastery.mjs 双实现先例，改判据两边一起改。
//
// 三信号（v0.13）：
//   taught 讲过    来自 build 时产出的内容无关覆盖快照（src/data/coverage.json——study/records
//                  学习者私有不上站，只有 ep id/布尔/计数能出门）∪ courseTaughtAll（课全读）
//   practiced 练过 本地进度实时派生：该考点有答题记录，或快照口头计数 > 0（弱信号）
//   mastered 掌握  掌握度四态判据不变（masteryByExamPoint，题 + 闪卡双通道）
// 「讲过/口头」新鲜度 = 上次 build；答题/掌握实时。分组：theme.json examDays（排布表 day 列）。
import type { AnswerRecord, Flashcard, Question, SrsState } from '../types';
import { masteryByExamPoint, type ExamPointMastery, type MasteryStatus } from './mastery';

export interface OralCount { asked: number; correct: number }

/** 考点间连线（build 时快照 graph.edges：EP id 对 + 前置布尔——派生布尔面，无叙述）。 */
export interface PanoramaGraphEdge { from: string; to: string; prerequisite: boolean }

/** 可读阈值：超限（或无数据）→ 全景回退现有分组清单，绝不硬渲染连线。 */
export const GRAPH_MAX_EDGES = 200;
export const GRAPH_MAX_POINTS = 80;

/** 覆盖快照单点（sync-examples 产 src/data/coverage.json；内容无关——无个人叙述）。 */
export interface CoveragePoint {
  ep: string;
  taught: boolean;
  practiced: boolean;
  mastered: boolean;
  oral: OralCount | null;
}

export interface CoverageSnapshot {
  theme: string;
  generatedAt: string;
  courseTaughtAll: boolean;
  points: CoveragePoint[];
  graph?: { edges: PanoramaGraphEdge[] } | null;
}

/** 连线渲染判据（纯函数）：有边且不超阈值才画；无图/超限回退清单（v0.14 回退语义）。 */
export function shouldRenderGraph(
  pointCount: number,
  edges: PanoramaGraphEdge[] | null | undefined,
): boolean {
  return !!edges && edges.length > 0
    && edges.length <= GRAPH_MAX_EDGES
    && pointCount <= GRAPH_MAX_POINTS;
}

export interface PanoramaPoint {
  ep: string;
  name: string;
  taught: boolean;
  practiced: boolean;
  mastered: boolean;
  status: MasteryStatus;
  answered: number;
  total: number;
  openWrong: number;
  oral: OralCount | null;
}

export interface PanoramaGroup {
  day: string;
  points: PanoramaPoint[];
  summary: { total: number; taught: number; practiced: number; mastered: number };
}

export const UNSCHEDULED_DAY = '未排程';

/**
 * 全景聚合（与 scripts/lib/panorama.mjs buildPanorama 同口径；records/coursesRead 输入
 * 在 web 侧替换为 build 时快照——判据等价：taught = 快照 taught ∪ courseTaughtAll）。
 */
export function buildPanorama(
  questions: Question[],
  answers: Record<string, AnswerRecord>,
  epNames: Record<string, string> = {},
  flashcards: Flashcard[] = [],
  srs: Record<string, SrsState> = {},
  coverage: CoverageSnapshot | null = null,
  epDays: Record<string, string> = {},
): { summary: { examPoints: number; taught: number; practiced: number; mastered: number }; courseTaughtAll: boolean; groups: PanoramaGroup[] } {
  const { points } = masteryByExamPoint(questions, answers, epNames, flashcards, srs);

  const covByEp = new Map<string, CoveragePoint>();
  for (const p of coverage?.points ?? []) covByEp.set(p.ep, p);
  const courseTaughtAll = coverage?.courseTaughtAll === true;

  const dayOrder: string[] = [];
  for (const p of points) {
    const day = epDays[p.ep];
    if (day && !dayOrder.includes(day)) dayOrder.push(day);
  }
  dayOrder.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

  const groupMap = new Map<string, PanoramaPoint[]>();
  for (const p of points) {
    const day = epDays[p.ep] || UNSCHEDULED_DAY;
    if (!groupMap.has(day)) groupMap.set(day, []);
    const cov = covByEp.get(p.ep);
    const oral = cov?.oral ?? null;
    groupMap.get(day)!.push({
      ep: p.ep,
      name: p.name,
      taught: (cov?.taught ?? false) || courseTaughtAll,
      practiced: p.answered > 0 || (oral?.asked ?? 0) > 0,
      mastered: p.status === 'mastered',
      status: p.status,
      answered: p.answered,
      total: p.total,
      openWrong: p.openWrongIds.length,
      oral,
    });
  }

  const groupKeys = [...groupMap.keys()].sort((a, b) => {
    if (a === UNSCHEDULED_DAY) return 1;
    if (b === UNSCHEDULED_DAY) return -1;
    const ia = dayOrder.indexOf(a), ib = dayOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const groups: PanoramaGroup[] = groupKeys.map((day) => {
    const pts = groupMap.get(day)!;
    return {
      day,
      points: pts,
      summary: {
        total: pts.length,
        taught: pts.filter((x) => x.taught).length,
        practiced: pts.filter((x) => x.practiced).length,
        mastered: pts.filter((x) => x.mastered).length,
      },
    };
  });

  const all = groups.flatMap((g) => g.points);
  return {
    summary: {
      examPoints: all.length,
      taught: all.filter((x) => x.taught).length,
      practiced: all.filter((x) => x.practiced).length,
      mastered: all.filter((x) => x.mastered).length,
    },
    courseTaughtAll,
    groups,
  };
}

/** 全景筛选三档（#80 chips + ?filter= 深链）：全部 / 弱项 / 未掌握。 */
export type PanoramaFilter = 'all' | 'weak' | 'unmastered';

/** URL 参数解析：合法枚举放行，非法/缺失回退「全部」（深链容错，不抛错）。 */
export function parsePanoramaFilter(raw: string | null | undefined): PanoramaFilter {
  return raw === 'weak' || raw === 'unmastered' ? raw : 'all';
}

/**
 * 单点是否命中筛选档（v0.25 票⑤：筛选从「隐藏整组」改为「非命中节点压暗」——地图语义
 * 保留空间上下文，构成条与节点路径都不再收缩）。弱项 = status === 'weak'；
 * 未掌握 = status !== 'mastered'；档位判据与旧 filterPanoramaGroups 逐点同口径。
 */
export function pointMatchesFilter(p: PanoramaPoint, filter: PanoramaFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'weak' ? p.status === 'weak' : p.status !== 'mastered';
}

// —— v0.25 票⑤（spec #110 Q3）版式派生：构成条四态计数 + 按大类（topic）分组 ——

/** 四态计数（构成条分段与图例的数字源；status 来自 masteryByExamPoint，判据同口径）。 */
export interface StatusCounts { mastered: number; inProgress: number; weak: number; untouched: number }

export function countStatuses(points: PanoramaPoint[]): StatusCounts {
  const c: StatusCounts = { mastered: 0, inProgress: 0, weak: 0, untouched: 0 };
  for (const p of points) c[p.status] += 1;
  return c;
}

/** 大类分组（每大类一张全宽卡）：topic 取该考点下任一题的 topic（考点不跨大类时唯一；
 *  跨了取首题并注释在实现里）。大类顺序与首页网格一致（topicOrder 序 + 未列出按字母序），
 *  组内考点按 EP 编号数字序（EP-2 < EP-10），无数字后缀的 id 字典序兜底。 */
export interface TopicSection {
  topic: string;              // 题库 topic id（'' = 题库未标 topic）
  points: PanoramaPoint[];
  counts: StatusCounts;
}

/** EP id 排序键：EP-NN 按数字，其余按字典序（数字段优先，非数字统一排在数字段后）。 */
function epSortKey(ep: string): [number, number | string] {
  const m = ep.match(/(\d+)$/);
  return m ? [0, Number(m[1])] : [1, ep];
}

export function groupByTopic(
  questions: Question[],
  points: PanoramaPoint[],
  order: readonly string[] = [],
): TopicSection[] {
  // EP → topic：取该考点首题的 topic（考点按 examPoint 聚合，题库惯例同考点同大类）
  const epTopic = new Map<string, string>();
  for (const q of questions) {
    if (!q.examPoint || epTopic.has(q.examPoint)) continue;
    epTopic.set(q.examPoint, q.topic || '');
  }
  const byTopic = new Map<string, PanoramaPoint[]>();
  for (const p of points) {
    const topic = epTopic.get(p.ep) ?? '';
    const list = byTopic.get(topic) ?? [];
    list.push(p);
    byTopic.set(topic, list);
  }
  const keys = [...byTopic.keys()].sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    if (ia !== -1 || ib !== -1) return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
    return a.localeCompare(b);
  });
  return keys.map((topic) => {
    const pts = byTopic.get(topic)!.sort((a, b) => {
      const ka = epSortKey(a.ep), kb = epSortKey(b.ep);
      return ka[0] !== kb[0] ? ka[0] - kb[0]
        : typeof ka[1] === 'number' && typeof kb[1] === 'number' ? ka[1] - kb[1]
        : String(ka[1]).localeCompare(String(kb[1]));
    });
    return { topic, points: pts, counts: countStatuses(pts) };
  });
}
