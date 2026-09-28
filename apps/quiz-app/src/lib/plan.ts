// plan.ts — 学习计划判据（web UI 用，scripts/lib/plan.mjs 派生层的 TS 移植）。
//
// ⚠️ 判据与 scripts/lib/plan.mjs 必须保持同步（plan-report.mjs / skill 探测用那边的
// 版本，首页计划面板用这边）——沿 mastery.ts/mastery.mjs 双实现先例，改判据两边一起改，
// 测试两边都有（scripts/lib/plan.test.mjs + 本目录 plan.test.ts）。
//
// 只移植派生层（纯函数，无 IO）：readPlan/syncPlan（文件系统契约）留在脚本侧——
// web 消费的数据入口是构建期 sync 产物 src/data/plan.ts（无/损坏计划回退 {units:[]}，
// import 恒可解析）。四组信号现算、不写回（派生值写回 = 双源漂移，ADR-0009 已拒）：
//
//   1. 覆盖 deriveCoverage      done/total、当前单元（in-progress 优先，无则第一个
//                              planned；只剩 done/paused → null）、剩余清单（全部非 done，
//                              含 paused——搁置了也是没完成）。排序真源 = order。
//   2. 日历对照 deriveCalendarDiff  「今天该到哪」（plannedDate ≤ 今天 的最后一个）vs
//                              「实际到哪」（done 按 order 的最后一个）→ 落后/富余天数。
//                              plannedDate 缺失/坏日期只进清单不进对照；逾期是严格
//                              plannedDate < 今天（今天到期不算拖）；paused 不豁免日程。
//   3. 速率外推 deriveProjection  近 14 天（含今天）完成速率 → 预计完成日 vs deadline →
//                              富余/缺口。数据不足（空计划/全完成/近窗零事件）诚实降级
//                              （available=false + reason），绝不硬算编数。
//   4. 断档天数 deriveGap       距最后一次学习接触的自然日差，answers/srs/课学完三通道
//                              取最大；调用方传本主题题/卡 id 集求交做多主题隔离
//                              （读端过滤红线，见 AGENTS.md）。无接触 → 降级不是 0 天。
//
// 时区口径：now 是 ms 时间戳，自然日按**本地时区**解释（srs.ts 的 toDateString 同先例）。
import type { PlanFile, PlanUnit, PlanUnitStatus, Progress } from '../types';

// ════════════════ 日期工具（自然日按本地时区）════════════════

/** ms 时间戳 → 本地 YYYY-MM-DD。 */
export function toLocalDateStr(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' → 本地零点 Date；格式不对或日历日不存在（如 2026-02-31）→ null。 */
export function parseLocalDate(s: unknown): Date | null {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** fromStr → toStr 的自然日差（toStr − fromStr；任一侧非法 → null）。round 防 DST 的 23/25 小时日。 */
export function diffCalendarDays(fromStr: string, toStr: string): number | null {
  const a = parseLocalDate(fromStr);
  const b = parseLocalDate(toStr);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

/** 合法日期串 + N 天 → 合法日期串（外推预计完成日用）。 */
function addDaysStr(dateStr: string, n: number): string {
  const d = parseLocalDate(dateStr)!;
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d.getTime());
}

// ════════════════ 派生层（纯函数）════════════════

/** 单元视图：只保留消费端要的字段（plan.json 原始行可能带别的，不透传）。
 *  运行期宽容：sync 只保证 units 是数组、不保证条目干净（脚本侧脏数据容忍同款）。 */
export type PlanUnitView = Partial<PlanUnit> & Pick<PlanUnit, 'id' | 'title'>;

const UNIT_VIEW_KEYS = ['id', 'title', 'order', 'status', 'plannedDate', 'day', 'topic', 'doneDate'] as const;

function unitView(u: LooseUnit): PlanUnitView {
  const out: Record<string, unknown> = {};
  for (const k of UNIT_VIEW_KEYS) {
    const v = u[k];
    if (v !== undefined) out[k] = v;
  }
  return out as PlanUnitView;
}

type LooseUnit = Record<string, unknown>;

/** units 里的非对象条目（null/数字等脏数据）跳过不崩——宽容解析，与 theme.json 同态度。 */
function safeUnits(units: PlanUnit[] | undefined): LooseUnit[] {
  return (Array.isArray(units) ? (units as unknown as LooseUnit[]) : []).filter((u): u is LooseUnit => !!u && typeof u === 'object');
}

const orderOf = (u: LooseUnit): number =>
  typeof u.order === 'number' && Number.isFinite(u.order) ? u.order : Infinity;

const sortedByOrder = (units: PlanUnit[] | undefined): LooseUnit[] =>
  [...safeUnits(units)].sort((a, b) => orderOf(a) - orderOf(b));

const statusOf = (u: LooseUnit): PlanUnitStatus | undefined => u.status as PlanUnitStatus | undefined;

// ── 1. 覆盖 ───────────────────────────────────────────────

export interface PlanCoverage {
  done: number;
  total: number;
  current: PlanUnitView | null;
  remaining: PlanUnitView[];
  byStatus: Record<PlanUnitStatus, number>;
}

export function deriveCoverage(plan: PlanFile | null | undefined): PlanCoverage {
  const units = sortedByOrder(plan?.units);
  const byStatus: Record<PlanUnitStatus, number> = { planned: 0, 'in-progress': 0, done: 0, paused: 0 };
  for (const u of units) {
    const s = statusOf(u);
    if (s && s in byStatus) byStatus[s]++;
  }
  const current =
    units.find((u) => statusOf(u) === 'in-progress') ??
    units.find((u) => statusOf(u) === 'planned') ??
    null;
  return {
    done: byStatus.done,
    total: units.length,
    current: current ? unitView(current) : null,
    remaining: units.filter((u) => statusOf(u) !== 'done').map((u) => unitView(u)),
    byStatus,
  };
}

// ── 2. 节奏·日历对照 ──────────────────────────────────────

export interface PlanOverdueUnit extends PlanUnitView {
  daysOverdue: number;
}

export interface PlanCalendarDiff {
  today: string;
  invalidDateUnits: string[];
  shouldAt: PlanUnitView | null;
  actualAt: PlanUnitView | null;
  overdue: PlanOverdueUnit[];
  /** 负=落后 N 天、正=富余 N 天、0=今天到期；无锚点（cleared/不可对照）= null。 */
  diffDays: number | null;
  state: 'behind' | 'slack' | 'due-today' | 'cleared' | null;
  available: boolean;
  /** 不可对照的原因（available=false 时给，UI 据此出降级文案）。 */
  reason: 'no-dated-units' | null;
  note: string | null;
}

export function deriveCalendarDiff(plan: PlanFile | null | undefined, now: number): PlanCalendarDiff {
  const today = toLocalDateStr(now);
  const units = sortedByOrder(plan?.units);
  const invalidDateUnits: string[] = [];
  const dated: LooseUnit[] = [];
  for (const u of units) {
    if (u.plannedDate === undefined) continue;            // 缺失 = 只进清单不进对照
    if (!parseLocalDate(u.plannedDate)) {
      invalidDateUnits.push(String(u.id));
      continue;
    }
    dated.push(u);
  }
  const actualAt = units.filter((u) => statusOf(u) === 'done').pop() ?? null; // order 序最后一个 done
  const base = {
    today,
    invalidDateUnits,
    shouldAt: null as PlanUnitView | null,
    actualAt: actualAt ? unitView(actualAt) : null,
    overdue: [] as PlanOverdueUnit[],
    diffDays: null as number | null,
    state: null as PlanCalendarDiff['state'],
    available: true,
    reason: null as PlanCalendarDiff['reason'],
    note: null as string | null,
  };
  if (dated.length === 0) {
    return { ...base, available: false, reason: 'no-dated-units', note: '计划里没有任何可解析的 plannedDate，日历对照无锚点' };
  }

  // YYYY-MM-DD 定长，字符串序 = 日历序；平日期按 order 破平
  const byDate = (a: LooseUnit, b: LooseUnit) => {
    const pa = String(a.plannedDate), pb = String(b.plannedDate);
    return pa < pb ? -1 : pa > pb ? 1 : orderOf(a) - orderOf(b);
  };
  const dueByNow = dated.filter((u) => String(u.plannedDate) <= today).sort(byDate);
  const shouldAt = dueByNow.length ? dueByNow[dueByNow.length - 1] : null;

  const overdue = dated
    .filter((u) => statusOf(u) !== 'done' && String(u.plannedDate) < today)   // 严格 <：今天到期不算拖
    .sort(byDate)
    .map((u) => ({ ...unitView(u), daysOverdue: diffCalendarDays(String(u.plannedDate), today) ?? 0 }));
  if (overdue.length > 0) {
    const anchor = overdue[overdue.length - 1];                    // 锚逾期单元的最大 plannedDate
    return { ...base, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, diffDays: -anchor.daysOverdue, state: 'behind' };
  }
  const upcoming = dated.filter((u) => statusOf(u) !== 'done' && String(u.plannedDate) >= today).sort(byDate);
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const d = diffCalendarDays(today, String(next.plannedDate)) ?? 0;
    return { ...base, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, diffDays: d, state: d === 0 ? 'due-today' : 'slack' };
  }
  return { ...base, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, state: 'cleared', note: '有日程的单元已全部完成；剩余单元（若有）无 plannedDate，无对照锚点' };
}

// ── 3. 节奏·速率外推 ──────────────────────────────────────

export interface PlanProjection {
  windowDays: number;
  remaining: number;
  deadline: string | null;
  available: boolean;
  /** 不可算的原因（available=false 时给；UI 据此出降级文案）。 */
  reason: 'no-units' | 'complete' | 'no-recent-completions' | null;
  note: string | null;
  eventsInWindow: number;
  ratePerDay: number | null;
  estimatedDays: number | null;
  estimatedDoneDate: string | null;
  /** 正=比 deadline 富余 N 天、负=缺口；无 deadline → null。 */
  slackDays: number | null;
  state: 'slack' | 'deficit' | 'no-deadline' | null;
}

export function deriveProjection(
  plan: PlanFile | null | undefined,
  now: number,
  WINDOW_DAYS = 14,
): PlanProjection {
  const today = toLocalDateStr(now);
  const units = safeUnits(plan?.units);
  const remaining = units.filter((u) => statusOf(u) !== 'done').length;
  let deadline: string | null = null;
  const notes: string[] = [];
  if (plan?.deadline) {
    if (parseLocalDate(plan.deadline)) deadline = plan.deadline;
    else notes.push(`deadline "${plan.deadline}" 无法解析，按无 deadline 处理`);
  }
  const base = { windowDays: WINDOW_DAYS, remaining, deadline };

  if (units.length === 0) {
    return { ...base, available: false, reason: 'no-units', note: '计划无单元，无外推可算', eventsInWindow: 0, ratePerDay: null, estimatedDays: null, estimatedDoneDate: null, slackDays: null, state: null };
  }
  if (remaining === 0) {
    return { ...base, available: false, reason: 'complete', note: '全部单元已完成，无需外推', eventsInWindow: 0, ratePerDay: null, estimatedDays: null, estimatedDoneDate: null, slackDays: null, state: null };
  }
  const windowStart = addDaysStr(today, -(WINDOW_DAYS - 1));        // 含今天往前 14 个自然日
  const events = units.filter((u) => {
    const d = u.doneDate;
    return statusOf(u) === 'done' && typeof d === 'string' && !!parseLocalDate(d) && d >= windowStart && d <= today;
  }).length;
  if (events === 0) {
    return { ...base, available: false, reason: 'no-recent-completions', note: `近 ${WINDOW_DAYS} 天（${windowStart}～${today}）无单元完成（doneDate 缺失、坏值或不落窗），速率无数据，不硬算`, eventsInWindow: 0, ratePerDay: null, estimatedDays: null, estimatedDoneDate: null, slackDays: null, state: null };
  }
  const ratePerDay = events / WINDOW_DAYS;
  const estimatedDays = Math.ceil(remaining / ratePerDay);
  const estimatedDoneDate = addDaysStr(today, estimatedDays);
  const slackDays = deadline ? diffCalendarDays(estimatedDoneDate, deadline) : null;
  const state = deadline ? ((slackDays ?? 0) >= 0 ? 'slack' : 'deficit') : 'no-deadline';
  return {
    ...base, available: true, reason: null, eventsInWindow: events, ratePerDay,
    estimatedDays, estimatedDoneDate, slackDays, state, note: notes.length ? notes.join('；') : null,
  };
}

// ── 4. 断档天数 ───────────────────────────────────────────

export interface PlanGap {
  available: boolean;
  reason: 'no-contact' | null;
  daysSinceLastContact: number | null;
  lastContactAt: number | null;
  source: 'answers' | 'srs' | 'coursesRead' | null;
}

/** 距最后一次学习接触的自然日差（answers/srs/课学完三通道取最大）。
 *  @param opts.questionIds/cardIds/theme  多主题隔离（不传 = 全量口径，消费端自责）。 */
export function deriveGap(
  progress: Progress | null | undefined,
  now: number,
  opts: { questionIds?: string[]; cardIds?: string[]; theme?: string } = {},
): PlanGap {
  const { questionIds, cardIds, theme } = opts;
  const qSet = questionIds ? new Set(questionIds) : null;
  const fSet = cardIds ? new Set(cardIds) : null;
  type Best = { at: number; source: PlanGap['source'] };
  let best: Best | null = null;
  const consider = (at: unknown, source: Best['source']) => {
    if (typeof at === 'number' && Number.isFinite(at)) {
      const cand: Best = { at, source };
      if (!best || cand.at > best.at) best = cand;   // 运行期经闭包赋值；读端经 found 别名取宽类型
    }
  };
  for (const [id, r] of Object.entries(progress?.answers ?? {})) {
    if (qSet && !qSet.has(id)) continue;
    consider((r as unknown as Record<string, unknown> | undefined)?.submittedAt, 'answers');
  }
  for (const [id, s] of Object.entries(progress?.srs ?? {})) {
    if (fSet && !fSet.has(id)) continue;
    consider((s as unknown as Record<string, unknown> | undefined)?.updatedAt, 'srs');
  }
  for (const [key, at] of Object.entries(progress?.coursesRead ?? {})) {
    if (theme && !key.startsWith(`${theme}/`)) continue;             // key 自带主题前缀
    consider(at, 'coursesRead');
  }
  // TS 控制流不跟踪闭包内赋值，这里用显式宽类型别名读取（判据不变）
  const found = best as Best | null;
  if (!found) {
    return { available: false, reason: 'no-contact', daysSinceLastContact: null, lastContactAt: null, source: null };
  }
  return {
    available: true,
    reason: null,
    daysSinceLastContact: diffCalendarDays(toLocalDateStr(found.at), toLocalDateStr(now)),
    lastContactAt: found.at,
    source: found.source,
  };
}

// ── day 映射（全景页 day 卡状态 chip 的数据面，#93）────────

/** day → 映射到该 day 的计划单元（order 序，脏数据容忍同上）。
 *  day 命名空间与 theme.json 的 examDays 同源（ADR-0009：unit.day ≡ examDays 的 day，
 *  MISSION 排布表 day 列），**逐字匹配**不归一；无 day / 脏 day（非非空字符串）的单元
 *  不进映射——它们的呈现面是首页计划面板的剩余清单，不进全景 day 卡。 */
export function planUnitsByDay(plan: PlanFile | null | undefined): Map<string, PlanUnitView[]> {
  const byDay = new Map<string, PlanUnitView[]>();
  for (const u of sortedByOrder(plan?.units)) {
    const day = u.day;
    if (typeof day !== 'string' || day === '') continue;
    const list = byDay.get(day);
    if (list) list.push(unitView(u));
    else byDay.set(day, [unitView(u)]);
  }
  return byDay;
}

// ── 总装（首页计划面板与派生脚本共用的四组信号入口）────────

export interface PlanReport {
  coverage: PlanCoverage;
  calendarDiff: PlanCalendarDiff;
  projection: PlanProjection;
  gap: PlanGap;
}

export function derivePlanReport({ plan, progress, now, questionIds, cardIds, theme }: {
  plan: PlanFile;
  progress: Progress | null | undefined;
  now: number;
  questionIds?: string[];
  cardIds?: string[];
  theme?: string;
}): PlanReport {
  return {
    coverage: deriveCoverage(plan),
    calendarDiff: deriveCalendarDiff(plan, now),
    projection: deriveProjection(plan, now),
    gap: deriveGap(progress, now, { questionIds, cardIds, theme }),
  };
}
