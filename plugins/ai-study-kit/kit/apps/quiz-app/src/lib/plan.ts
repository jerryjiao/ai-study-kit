// plan.ts — 学习计划判据（web UI 用，scripts/lib/plan.mjs 派生层的 TS 移植）。
//
// ⚠️ 判据与 scripts/lib/plan.mjs 必须保持同步（plan-report.mjs / skill 探测用那边的
// 版本，首页计划面板用这边）——沿 mastery.ts/mastery.mjs 双实现先例，改判据两边一起改，
// 测试两边都有（scripts/lib/plan.test.mjs + 本目录 plan.test.ts）。
//
// 只移植派生层（纯函数，无 IO）：readPlan/syncPlan（文件系统契约）留在脚本侧——
// web 消费的数据入口是构建期 sync 产物 src/data/plan.ts（无/损坏计划回退 {units:[]}，
// import 恒可解析）。五组信号现算、不写回（派生值写回 = 双源漂移，ADR-0009 已拒）：
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
//   4. 断档天数 deriveGap       距最后一次学习接触的自然日差，answers/srs/课学完/口述四通道
//                              取最大（口述通道 v0.26 #123 微块起——微块完成当天即触达，
//                              gap=0「今天已学过」）；调用方传本主题题/卡 id 集求交做
//                              多主题隔离（读端过滤红线，见 AGENTS.md）。无接触 → 降级不是 0 天。
//   5. 断档回归·后移建议 deriveShiftAdvice（#120，spec #118 T1）：断档 ≥ REGRESSION_GAP_DAYS
//                              进入回归场景后现算「计划建议后移 X 天」（速率外推所需天数 −
//                              日程对照日剩余天数）；v0.27 #125 起升级为**可执行重排**——
//                              执行面是脚本侧计划生成器 plan-generate（--reason gap /
//                              --auto，教练场景确认后写回 = 可否决；web 侧无写回入口）。
//   6. 重排视图 deriveRescheduleView（#125，债务红字退场的宣告面）：最新一条重排审计
//                              （plan.rescheduled，生成器写回的审计事实）新鲜（≤ 7 天）→
//                              「已重排：下一站 X，日期 Y」——behind 红字退场后由它接管
//                              节奏行的宣告；判据与 scripts/lib/plan.mjs 双实现同步。
//
// 时区口径：now 是 ms 时间戳，自然日按**本地时区**解释（srs.ts 的 toDateString 同先例）。
import type { OralAttempt, PlanFile, PlanReschedule, PlanUnit, PlanUnitStatus, Progress } from '../types';

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
  source: 'answers' | 'srs' | 'coursesRead' | 'oral' | null;
}

/** 距最后一次学习接触的自然日差（answers/srs/课学完/口述四通道取最大；口述通道
 *  v0.26 #123——微块口述题走 #122 实时回流进 progress.oralAttempts，完成当天 gap=0，
 *  「今天已触达」不漏认轻启动）。gap.daysSinceLastContact === 0 即「今天触达过」——
 *  首页今日徽标与回归卡判据都吃它。
 *  @param opts.questionIds/cardIds/theme  多主题隔离（不传 = 全量口径，消费端自责）；
 *  @param opts.oralAttempts              口述附加流水（脚本侧主题包 study/records/
 *         oral-attempts.json 并流后传入——progress.oralAttempts 只是回流副本，API 离线
 *         时包侧才是完整真源；web 侧传 progress.oralAttempts 即可由内部 theme 过滤）。 */
export function deriveGap(
  progress: Progress | null | undefined,
  now: number,
  opts: { questionIds?: string[]; cardIds?: string[]; theme?: string; oralAttempts?: OralAttempt[] } = {},
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
  // 课学完撤销（墓碑）也算接触——断档采事件口径（#98 裁决；与 scripts/lib/plan.mjs 头注同步）
  for (const [key, at] of Object.entries(progress?.coursesRead ?? {})) {
    if (theme && !key.startsWith(`${theme}/`)) continue;             // key 自带主题前缀
    consider(at, 'coursesRead');
  }
  // 口述通道（v0.26 #123 微块）：progress.oralAttempts 回流副本 + opts.oralAttempts 附加
  // （脚本侧主题包流水并流）。条目 theme 缺省宽容视为当前主题（与 oralAttemptsForTheme
  // 同款——手写/旧数据兼容，不见为失）；坏条目跳过不崩（consider 自带数型校验）。
  const oralExtra = Array.isArray(opts.oralAttempts) ? opts.oralAttempts : [];
  for (const a of [...(progress?.oralAttempts ?? []), ...oralExtra]) {
    if (!a || typeof a !== 'object') continue;
    if (theme && a.theme && a.theme !== theme) continue;
    consider(a.at, 'oral');
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

// ── 5. 断档回归·计划后移建议（#120 / spec #118 T1）────────

/** 断档回归阈值（自然日）：距上次学习接触 ≥ 3 天才算「断档后回来」。
 *  1-2 天是健康间隔节奏（如周末歇两天周一回），不出回归引导；3 天起才给
 *  「先热身再续站」动作（dogfood 复盘案例为断档 5 天，spec #118）。 */
export const REGRESSION_GAP_DAYS = 3;

export interface PlanShiftAdvice {
  available: boolean;
  /** 不可算的原因（available=false 时给；UI 据此静默降级——回归建议绝不编数字）。 */
  reason: 'no-contact' | 'below-threshold' | 'no-rate' | 'no-target' | 'on-track' | null;
  /** 触发时的断档天数（no-contact → null）。 */
  gapDays: number | null;
  windowDays: number;
  ratePerDay: number | null;
  /** 实测每单元天数（1/rate，依据句用「X 天/站」比「0.4 站/天」贴学习者语言）。 */
  daysPerUnit: number | null;
  remaining: number | null;
  estimatedDays: number | null;
  /** 建议后移的自然日数（available=true 时恒 > 0）。 */
  shiftDays: number | null;
  /** 对照的目标日：deadline 优先，无 deadline = 剩余有日程单元的最大 plannedDate。 */
  deadline: string | null;
  /** 无 deadline 时的日程尽头（剩余非 done 单元的最大可解析 plannedDate；有 deadline → null）。 */
  scheduledEnd: string | null;
}

/** 断档回归后的「计划建议后移 X 天」现算（#120；v0.27 #125 起建议即可执行——执行面是
 *  脚本侧计划生成器 plan-generate（#121 引入，--reason gap / --auto 与自动重排同一入口），
 *  判据单源 scripts/lib/plan-generate.mjs）。
 *  口径：按近 WINDOW 天（默认 14）实测速率完成剩余单元需 estimatedDays 天，与日程
 *  对照日（deadline ?? 剩余日程尽头）之差 > 0 才建议后移。断档天数本身不另加——
 *  窗口含断档期，速率已被如实拉低（「按你的实测速率」的合理解读）。
 *  诚实降级与 deriveProjection 同哲学：速率无数据（断档 ≥ 窗口长时常见）/ 无对照日
 *  / 已在轨 → available=false + reason，绝不硬算。 */
export function deriveShiftAdvice(
  plan: PlanFile | null | undefined,
  now: number,
  gap: PlanGap,
  projection?: PlanProjection,
): PlanShiftAdvice {
  const proj = projection ?? deriveProjection(plan, now);
  const base = {
    gapDays: gap.daysSinceLastContact,
    windowDays: proj.windowDays,
    ratePerDay: null as number | null,
    daysPerUnit: null as number | null,
    remaining: null as number | null,
    estimatedDays: null as number | null,
    shiftDays: null as number | null,
    deadline: proj.deadline,
    scheduledEnd: null as string | null,
  };
  if (!gap.available) {
    return { ...base, available: false, reason: 'no-contact' };
  }
  const gapDays = gap.daysSinceLastContact ?? 0;
  if (gapDays < REGRESSION_GAP_DAYS) {
    return { ...base, available: false, reason: 'below-threshold' };
  }
  if (!proj.available) {
    // no-units 到不了消费端（无计划主题不算后移）；no-recent-completions 常见于长断档
    return { ...base, available: false, reason: 'no-rate' };
  }
  // 对照日：deadline 优先；无 deadline → 剩余（非 done）有日程单元的最大 plannedDate
  let target = proj.deadline;
  if (!target) {
    const today = toLocalDateStr(now);
    for (const u of safeUnits(plan?.units)) {
      if (statusOf(u) === 'done') continue;
      const d = u.plannedDate;
      if (typeof d === 'string' && parseLocalDate(d) && (!target || d > target)) target = d;
    }
    if (target) base.scheduledEnd = target;
    else return { ...base, available: false, reason: 'no-target' };
  }
  const today = toLocalDateStr(now);
  const spanDays = diffCalendarDays(today, target);
  const shiftDays = (proj.estimatedDays ?? 0) - (spanDays ?? 0);
  if (shiftDays <= 0) {
    return { ...base, available: false, reason: 'on-track' };
  }
  return {
    ...base,
    available: true,
    reason: null,
    ratePerDay: proj.ratePerDay,
    daysPerUnit: proj.ratePerDay && proj.ratePerDay > 0 ? 1 / proj.ratePerDay : null,
    remaining: proj.remaining,
    estimatedDays: proj.estimatedDays,
    shiftDays,
  };
}

// ── 6. 重排视图（#125，债务红字退场的宣告面）──────────────

/** 重排宣告的新鲜窗口（自然日）：最新审计距今 ≤ 7 天才出「已重排：下一站 X，日期 Y」。
 *  更早的审计留在 plan.json 里（可追溯），UI 静默——陈年重排不是新闻。 */
export const RESCHEDULE_FRESH_DAYS = 7;

export interface PlanRescheduleView {
  available: true;
  /** 触发原因（最新审计的 reason；坏值宽容回 manual）。 */
  reason: PlanReschedule['reason'];
  /** 最新审计的写回时刻（ms）。 */
  at: number;
  /** 重排后的下一站：剩余（非 done）单元里 plannedDate 最小者（优先今天起的第一个
   *  日程点）；无剩余有日程单元（如全完成后的残留审计）→ deriveRescheduleView 返回 null。 */
  nextUnit: { id: string; title: string; plannedDate: string };
}

/** 最新重排审计的新鲜视图（纯函数；判据与 scripts/lib/plan.mjs 双实现同步）。
 *  读的是生成器写回的**审计事实**（不是对账派生值）：新鲜（≤ RESCHEDULE_FRESH_DAYS 天）
 *  且存在下一站才出；坏审计（at 非数）按无重排，陈旧审计不出。消费端（首页 PlanPanel /
 *  全景摘要行 / plan-report）用它出「已重排：下一站 X，日期 Y」钩子行。 */
export function deriveRescheduleView(
  plan: PlanFile | null | undefined,
  now: number,
): PlanRescheduleView | null {
  const audits = (Array.isArray(plan?.rescheduled) ? (plan!.rescheduled as unknown as unknown[]) : [])
    .filter((r): r is Record<string, unknown> => !!r && typeof r === 'object');
  const last = audits[audits.length - 1];
  if (!last) return null;
  const at = last.at;
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  const ageDays = diffCalendarDays(toLocalDateStr(at), toLocalDateStr(now));
  if (ageDays === null || ageDays > RESCHEDULE_FRESH_DAYS) return null;
  const today = toLocalDateStr(now);
  const dated = sortedByOrder(plan?.units)
    .filter((u) => statusOf(u) !== 'done' && typeof u.plannedDate === 'string' && !!parseLocalDate(u.plannedDate))
    .sort((a, b) => {
      const pa = String(a.plannedDate), pb = String(b.plannedDate);
      return pa < pb ? -1 : pa > pb ? 1 : orderOf(a) - orderOf(b);
    });
  const next = dated.find((u) => String(u.plannedDate) >= today) ?? dated[0] ?? undefined;
  if (!next) return null;
  const reason = last.reason;
  return {
    available: true,
    reason: reason === 'behind' || reason === 'gap' ? reason : 'manual',
    at,
    nextUnit: { id: String(next.id), title: String(next.title), plannedDate: String(next.plannedDate) },
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

export function derivePlanReport({ plan, progress, now, questionIds, cardIds, theme, oralAttempts }: {
  plan: PlanFile;
  progress: Progress | null | undefined;
  now: number;
  questionIds?: string[];
  cardIds?: string[];
  theme?: string;
  oralAttempts?: OralAttempt[];
}): PlanReport {
  return {
    coverage: deriveCoverage(plan),
    calendarDiff: deriveCalendarDiff(plan, now),
    projection: deriveProjection(plan, now),
    gap: deriveGap(progress, now, { questionIds, cardIds, theme, oralAttempts }),
  };
}
