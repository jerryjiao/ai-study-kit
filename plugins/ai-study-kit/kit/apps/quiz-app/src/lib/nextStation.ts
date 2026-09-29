// nextStation.ts — 下一站推荐（v0.25 票⑥，spec #110「A · 顶部推荐卡」的心脏）。
//
// 一次调用吃四态考点集 + knowflow 前置映射（可选）+ 计划缺口（仅当有目标日），吐主推荐
// （含理由类型）+ 次选。全景由此从「纯诊断」升级为「诊断 + 导引」——推荐逻辑（spec 拍板）：
//
//   优先级   落后日程（仅当有目标日，插队） > 补弱（薄弱优先） > 结构轨（拓扑序最早解锁）
//   结构轨   knowflow 前置边（prerequisite=true）上的拓扑序：前置全解锁的最早考点；
//           无映射主题回退排布表顺序（MISSION day 列，输入数组序）的「前置已解锁」近似
//           ——不承诺结构洞察（spec Further Notes 的诚实边界）
//   补弱轨   不受拓扑门控（复习优先于结构）：weak 按未毕业错题数降序、平手按排布表序，
//           理由带被拖住的直接下游（非掌握、以它为前置的考点名）
//
// ⭐ 无 deadline 零催办原则（票⑥成文进 docs/methodology）：目标日是可选参数——
//   planGap 传 null（无目标日）时落后日程轨根本不存在，输出不含任何节奏字段
//   （无 behindSchedule 理由、无 daysOverdue），推荐自然退化为「补弱 → 结构序」。
//
// 图阈值说明：GRAPH_MAX_EDGES/POINTS 是连线**渲染**的可读阈值，推荐计算不受它门控
//（拓扑计算代价与边数线性，大图只是不画线，推荐照算）。

import type { PanoramaGraphEdge, PanoramaPoint } from './panorama';

/** 计划缺口：仅当主题设了目标日（plan.json deadline 可解析）才由调用方构造，否则传 null。 */
export interface PlanGapInput {
  /** 目标日（YYYY-MM-DD；调用方守门已验证可解析）。 */
  deadline: string;
  /** 落后日程考点（EP id 序 = 最逾期单元的 day 优先，同 day 按排布表序；只放非掌握考点）。 */
  overdueEps: string[];
  /** 落后天数（日历对照锚点单元的 daysOverdue，> 0；理由文案用）。 */
  daysOverdue: number;
}

/** 理由类型：补弱 / 前置解锁 / 落后日程（落后日程仅当有目标日才可能出现）。 */
export type StationReason = 'weak' | 'unlocked' | 'behindSchedule';

export interface StationPick {
  ep: string;
  name: string;
  status: StationPickStatus;
  reason: StationReason;
  /** reason='weak'：未毕业错题数 + 被拖住的直接下游考点名（以它为前置且未掌握）。 */
  weak?: { openWrong: number; downstream: string[] };
  /** reason='behindSchedule'：落后天数（有目标日才有这个字段——无目标日输出零节奏字段）。 */
  daysOverdue?: number;
}

type StationPickStatus = PanoramaPoint['status'];

export interface NextStationResult {
  primary: StationPick | null;
  alt: StationPick | null;
  /** 结构轨向：knowflow 拓扑 / 排布表近似（无映射主题）——次选文案措辞据此分流。 */
  structural: 'knowflow' | 'schedule';
}

export interface NextStationInput {
  /** 四态考点集（buildPanorama 派生），**数组序 = 排布表顺序**（day 数字序 + 组内 EP 数字序，
   *  panorama.flattenScheduleOrder 产出）——结构轨兜底序与全部平手判据都吃这个序。 */
  points: PanoramaPoint[];
  /** knowflow 前置映射（coverage.graph.edges；null/空/全为未知端点 = 无映射，回退排布表）。 */
  edges?: PanoramaGraphEdge[] | null;
  /** 计划缺口（仅当有目标日才传；null = 无目标日，输出不含节奏字段）。 */
  planGap?: PlanGapInput | null;
}

/** 拓扑层级（最长路径）：无前置 = 0，否则 max(前置层)+1；环上及其下游解析不了 → 垫底。 */
function topoLevels(eps: readonly string[], prereqOf: Map<string, string[]>): Map<string, number> {
  const level = new Map<string, number>();
  const unresolved = new Set(eps);
  let changed = true;
  while (changed) {
    changed = false;
    for (const ep of unresolved) {
      const froms = prereqOf.get(ep) ?? [];
      if (froms.every((f) => level.has(f))) {
        level.set(ep, froms.reduce((m, f) => Math.max(m, level.get(f)! + 1), 0));
        unresolved.delete(ep);
        changed = true;
      }
    }
  }
  for (const ep of unresolved) level.set(ep, Number.MAX_SAFE_INTEGER);
  return level;
}

/** 下一站推荐（纯函数）：输入四态 + 前置映射 + 计划缺口，输出主推荐 + 次选。 */
export function nextStation(input: NextStationInput): NextStationResult {
  const { points, edges, planGap } = input;
  const byEp = new Map(points.map((p) => [p.ep, p]));
  const idx = new Map(points.map((p, i) => [p.ep, i]));

  // knowflow 前置映射：只认 prerequisite=true 的边；端点未知的边忽略（与连线渲染同容忍），去重
  const prereqOf = new Map<string, string[]>();
  let prereqCount = 0;
  for (const e of edges ?? []) {
    if (!e.prerequisite || !byEp.has(e.from) || !byEp.has(e.to)) continue;
    const list = prereqOf.get(e.to) ?? [];
    if (!list.includes(e.from)) {
      list.push(e.from);
      prereqCount++;
      prereqOf.set(e.to, list);
    }
  }
  const structural: NextStationResult['structural'] = prereqCount > 0 ? 'knowflow' : 'schedule';

  const levels = topoLevels([...byEp.keys()], prereqOf);
  const structuralOrder = [...points].sort(
    (a, b) => levels.get(a.ep)! - levels.get(b.ep)! || idx.get(a.ep)! - idx.get(b.ep)!,
  );
  const isMastered = (ep: string) => byEp.get(ep)?.status === 'mastered';

  /** 结构轨取件：拓扑序里第一个「非掌握且前置全解锁」的考点（排除 exclude）；全被堵 → null。 */
  const structuralPick = (exclude?: string): StationPick | null => {
    const p = structuralOrder.find(
      (x) => x.ep !== exclude && x.status !== 'mastered'
        && (prereqOf.get(x.ep) ?? []).every((f) => isMastered(f)),
    );
    return p ? { ep: p.ep, name: p.name, status: p.status, reason: 'unlocked' } : null;
  };

  /** 被拖住的直接下游：以 ep 为前置且未掌握的考点名（拓扑序稳定）。 */
  const downstreamOf = (ep: string): string[] =>
    structuralOrder
      .filter((x) => x.status !== 'mastered' && (prereqOf.get(x.ep) ?? []).includes(ep))
      .map((x) => x.name);

  // 补弱轨：weak 按未毕业错题数降序、平手按排布表序（复习不受拓扑门控——补弱优先于结构）
  const weakFirst = points
    .filter((p) => p.status === 'weak')
    .sort((a, b) => b.openWrong - a.openWrong || idx.get(a.ep)! - idx.get(b.ep)!)[0] ?? null;
  const weakPick: StationPick | null = weakFirst
    ? {
        ep: weakFirst.ep,
        name: weakFirst.name,
        status: weakFirst.status,
        reason: 'weak',
        weak: { openWrong: weakFirst.openWrong, downstream: downstreamOf(weakFirst.ep) },
      }
    : null;

  // 落后日程轨（插队）：仅当有目标日——planGap 为 null 时这条轨不存在（零催办原则）
  let behindPick: StationPick | null = null;
  if (planGap) {
    const ep = planGap.overdueEps.find((e) => byEp.get(e) && !isMastered(e));
    const p = ep !== undefined ? byEp.get(ep) : undefined;
    if (p) {
      behindPick = {
        ep: p.ep, name: p.name, status: p.status,
        reason: 'behindSchedule', daysOverdue: planGap.daysOverdue,
      };
    }
  }

  const primary = behindPick ?? weakPick ?? structuralPick();
  if (!primary) return { primary: null, alt: null, structural };

  // 次选 = 换一条轨道：落后日程主推 → 补弱 ?? 结构；补弱主推 → 结构；结构主推 → 结构下一个
  let alt: StationPick | null =
    primary.reason === 'behindSchedule' ? (weakPick ?? structuralPick(primary.ep))
    : primary.reason === 'weak' ? structuralPick(primary.ep)
    : structuralPick(primary.ep);
  // 换轨后仍撞同一考点（如逾期考点本身就是最弱项）→ 退到结构轨下一个
  if (alt && alt.ep === primary.ep) alt = structuralPick(primary.ep);

  return { primary, alt, structural };
}
