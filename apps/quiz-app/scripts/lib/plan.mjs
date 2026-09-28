/** 学习计划 plan.json——sync 契约层 + 派生判据层（数据契约见 src/types.ts 的 PlanFile/PlanUnit，
 *  分层决策与 day 命名空间契约见 docs/adr/0009；术语见仓库 CONTEXT.md「计划单元/覆盖/节奏」）。
 *
 *  examples/<theme>/plan.json 是**可选主题数据**（不是运行期数据，不进 progress）：
 *  - 有 → 原样拷进 src/data/plan.json（单一事实源在主题目录，sync 不改写数据字节）；
 *  - 无/损坏/畸形 → 写空计划回退（与 theme-config.json 的 {} 回退同风格）——
 *    保证 src/data/plan.ts 的 import 恒可解析，消费端拿到的永远是合法形状。
 *  外部主题包路径（EXAMPLE_THEME 外部形态）天然生效：本模块只收主题目录绝对路径
 *  （resolveThemeDir 的输出），仓库内/仓库外同一代码路径。
 *
 *  ════════════════ 派生层口径（#91，spec #89 第 2 条；判据单源，TS 移植须同步）════════════════
 *  四组信号全部**现算**（无 LLM、不写回 plan.json——派生值写回 = 双源漂移，ADR-0009 已拒）：
 *
 *  1. 覆盖 deriveCoverage：
 *     - done/total 按 status==='done' 计；排序真源是 order（升序，缺失排最后，平局按输入序）。
 *     - current（当前单元）= 第一个 in-progress；无则第一个 planned（「接下来该做的」）；
 *       只剩 done/paused → null（搁置不算「在做」）。
 *     - remaining（剩余清单）= 全部非 done 单元（含 in-progress 与 paused——搁置了也是没完成）。
 *
 *  2. 节奏·日历对照 deriveCalendarDiff（「今天该到哪 vs 实际完成到哪」）：
 *     - 只有 plannedDate 可解析（YYYY-MM-DD 且真实存在的日历日）的单元参与对照；
 *       缺失/坏日期的单元只进覆盖清单（invalidDateUnits 披露坏 id，不崩）。
 *     - shouldAt（今天该到哪）= plannedDate ≤ 今天 的最后一个（日期升序、平日期按 order）；
 *       actualAt（实际完成到哪）= done 单元按 order 的最后一个（非线性完成也如实取最远位）。
 *     - 逾期 = plannedDate < 今天 且非 done（**严格**小于：今天到期的单元当天不算拖）；
 *       paused 不豁免日程（搁置≠完成，要不要豁免是流程决策，派生层不特判）。
 *     - diffDays：有逾期 → −(今天 − 逾期单元最大 plannedDate)，负数=落后 N 天
 *       （锚「该到哪」的日程点，不是最早逾期的拖龄；逐单元拖龄在 overdue[].daysOverdue）；
 *       无逾期且存在未完成的有日程单元 → +(下一到期 plannedDate − 今天)，正数=富余 N 天；
 *       有日程单元全部完成 → state='cleared'、diffDays=null（无锚点可对照）。
 *
 *  3. 节奏·速率外推 deriveProjection：
 *     - 窗口 = 含今天往前 14 个自然日（[今天−13, 今天]）；完成事件 = done 单元的 doneDate 落窗
 *       （doneDate 缺失/坏日期的 done 单元不构成事件——完成日不可考不编）。
 *     - ratePerDay = 事件数 / 14（分母固定窗口长，不随首末事件间隔伸缩）；
 *       estimatedDays = ceil(剩余单元数 / rate)（整天向上取整）；剩余含 paused（保守）。
 *     - slackDays = deadline − 预计完成日（正=富余、负=缺口）；无 deadline → slackDays=null。
 *     - 诚实降级（available=false，绝不硬算编数）：空计划 no-units / 全部完成 complete /
 *       近 14 天零完成事件 no-recent-completions（速率无数据，除零即无穷，不外推）。
 *
 *  4. 断档天数 deriveGap：距最后一次学习接触的自然日差，三通道取最大——
 *     progress.answers[].submittedAt / progress.srs[].updatedAt / progress.coursesRead 值
 *     （课学完 key 自带 "<theme>/" 前缀天然隔离；answers/srs 靠调用方传本主题题/卡 id 集
 *     求交——多主题进度隔离的读端过滤红线，见 AGENTS.md。不传集合 = 全量口径，消费端自责）。
 *     墓碑答案也算接触（提交发生过；deletedAt 只影响统计不影响「摸过没」）。
 *     课学完撤销（墓碑）**也算接触**——断档采事件口径：来过就算来过，衡量「多久没学」；
 *     撤销只回退完成度状态（coursesRead 边界另按墓碑的当前状态口径），不抹掉接触历史
 *     （#98 裁决 2026-09-28）。无任何时间戳 → no-contact 降级（不是 0 天）。
 *
 *  时区口径：now 是 ms 时间戳，自然日按**本地时区**解释（srs.ts 的 toDateString 同先例）；
 *  测试用本地正午构造时间戳保证跨时区确定。⚠️ 前端复算（TS 移植，首页计划面板/全景页，
 *  spec #89 第 3/4 条）落地后，本文件判据与 src/lib/plan.ts 必须同步改（mastery.ts 先例）。
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** 空计划回退内容：units 必有、空数组（缺失 plan.json = 主题无计划，UI/派生按无计划面回退）。 */
export const EMPTY_PLAN = { units: [] };

/** 读主题的 plan.json，归一到「永远合法」的形状。
 *  返回 { present, plan }：present=false 时 plan 为 EMPTY_PLAN（reason 区分 missing/broken 供日志，
 *  broken 时附 error 原文）。本身不打日志——sync 面（syncPlan）与 CLI（plan-report）各自按场景报。 */
export function readPlan(exampleDir) {
  const src = join(exampleDir, 'plan.json');
  if (!existsSync(src)) return { present: false, plan: EMPTY_PLAN, reason: 'missing' };
  try {
    const parsed = JSON.parse(readFileSync(src, 'utf-8'));
    if (!Array.isArray(parsed.units)) throw new Error('units 不是数组');
    return { present: true, plan: parsed };
  } catch (e) {
    return { present: false, plan: EMPTY_PLAN, reason: 'broken', error: e.message };
  }
}

/** sync 一个主题的 plan.json → <dataDir>/plan.json（sync-examples 调用）。
 *  损坏（JSON 不可解析/units 非数组）打 warn 不抛——sync 是 build 的前置步骤，
 *  主题文件坏一个可选项不该硬崩整个 build（theme.json 损坏打 warn 回退的同款态度）。
 *  返回 { present, units } 供调用方打日志。 */
export function syncPlan(exampleDir, dataDir) {
  const { present, plan, reason, error } = readPlan(exampleDir);
  if (present) {
    copyFileSync(join(exampleDir, 'plan.json'), join(dataDir, 'plan.json'));
  } else {
    if (reason === 'broken') {
      console.warn(`[sync-examples] plan.json 损坏（${join(exampleDir, 'plan.json')}：${error}）→ 写空计划回退`);
    }
    writeFileSync(join(dataDir, 'plan.json'), JSON.stringify(EMPTY_PLAN, null, 2) + '\n');
  }
  return { present, units: plan.units.length };
}

// ════════════════ 日期工具（自然日按本地时区，判据见头注「时区口径」）════════════════

/** ms 时间戳 → 本地 YYYY-MM-DD。 */
export function toLocalDateStr(ms) {
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** 'YYYY-MM-DD' → 本地零点 Date；格式不对或日历日不存在（如 2026-02-31）→ null。 */
export function parseLocalDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return dt;
}

/** fromStr → toStr 的自然日差（toStr − fromStr；任一侧非法 → null）。 */
export function diffCalendarDays(fromStr, toStr) {
  const a = parseLocalDate(fromStr);
  const b = parseLocalDate(toStr);
  if (!a || !b) return null;
  return Math.round((b.getTime() - a.getTime()) / 86400000); // round 防 DST 的 23/25 小时日
}

/** 合法日期串 + N 天 → 合法日期串（外推预计完成日用）。 */
function addDaysStr(dateStr, n) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d.getTime());
}

// ════════════════ 派生层（纯函数，无 IO）════════════════

/** 单元视图：只保留消费端要的字段（plan.json 原始行可能带别的，不透传）。 */
const UNIT_VIEW_KEYS = ['id', 'title', 'order', 'status', 'plannedDate', 'day', 'topic', 'doneDate'];
const unitView = (u) => Object.fromEntries(
  UNIT_VIEW_KEYS.filter((k) => u && u[k] !== undefined).map((k) => [k, u[k]]),
);

const orderOf = (u) => (typeof u.order === 'number' && Number.isFinite(u.order) ? u.order : Infinity);
// units 里的非对象条目（null/数字等脏数据）跳过不崩——宽容解析，与 theme.json 同态度
const safeUnits = (units) => (Array.isArray(units) ? units.filter((u) => u && typeof u === 'object') : []);
const sortedByOrder = (units) => [...safeUnits(units)].sort((a, b) => orderOf(a) - orderOf(b));

/** 1. 覆盖：done/total、当前单元、剩余清单。口径见头注「派生层口径」第 1 条。 */
export function deriveCoverage(plan) {
  const units = sortedByOrder(plan?.units ?? []);
  const byStatus = { planned: 0, 'in-progress': 0, done: 0, paused: 0 };
  for (const u of units) if (u.status in byStatus) byStatus[u.status]++;
  const current =
    units.find((u) => u.status === 'in-progress') ??
    units.find((u) => u.status === 'planned') ??
    null;
  return {
    done: byStatus.done,
    total: units.length,
    current: current ? unitView(current) : null,
    remaining: units.filter((u) => u.status !== 'done').map(unitView),
    byStatus,
  };
}

/** 2. 节奏·日历对照：按 plannedDate「今天该到哪」vs 实际完成到哪 → 落后/富余天数。 */
export function deriveCalendarDiff(plan, now) {
  const today = toLocalDateStr(now);
  const units = sortedByOrder(plan?.units ?? []);
  const invalidDateUnits = [];
  const dated = [];
  for (const u of units) {
    if (u.plannedDate === undefined) continue;            // 缺失 = 只进清单不进对照
    if (!parseLocalDate(u.plannedDate)) { invalidDateUnits.push(u.id); continue; }
    dated.push(u);
  }
  const actualAt = units.filter((u) => u.status === 'done').pop() ?? null; // order 序最后一个 done
  const base = { today, invalidDateUnits, shouldAt: null, actualAt: actualAt ? unitView(actualAt) : null, overdue: [], diffDays: null, state: null, note: null };
  if (dated.length === 0) return { ...base, available: false, reason: 'no-dated-units', note: '计划里没有任何可解析的 plannedDate，日历对照无锚点' };

  // YYYY-MM-DD 定长，字符串序 = 日历序；平日期按 order 破平
  const byDate = (a, b) => (a.plannedDate < b.plannedDate ? -1 : a.plannedDate > b.plannedDate ? 1 : orderOf(a) - orderOf(b));
  const dueByNow = dated.filter((u) => u.plannedDate <= today).sort(byDate);
  const shouldAt = dueByNow.length ? dueByNow[dueByNow.length - 1] : null;

  const overdue = dated
    .filter((u) => u.status !== 'done' && u.plannedDate < today)   // 严格 <：今天到期不算拖
    .sort(byDate)
    .map((u) => ({ ...unitView(u), daysOverdue: diffCalendarDays(u.plannedDate, today) }));
  if (overdue.length > 0) {
    const anchor = overdue[overdue.length - 1];                    // 锚逾期单元的最大 plannedDate
    return { ...base, available: true, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, diffDays: -anchor.daysOverdue, state: 'behind' };
  }
  const upcoming = dated.filter((u) => u.status !== 'done' && u.plannedDate >= today).sort(byDate);
  if (upcoming.length > 0) {
    const next = upcoming[0];
    const d = diffCalendarDays(today, next.plannedDate);
    return { ...base, available: true, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, diffDays: d, state: d === 0 ? 'due-today' : 'slack' };
  }
  return { ...base, available: true, shouldAt: shouldAt ? unitView(shouldAt) : null, overdue, state: 'cleared', note: '有日程的单元已全部完成；剩余单元（若有）无 plannedDate，无对照锚点' };
}

/** 3. 节奏·速率外推：近 14 天完成速率 → 预计完成日 vs deadline → 富余/缺口。 */
export function deriveProjection(plan, now, WINDOW_DAYS = 14) {
  const today = toLocalDateStr(now);
  const units = safeUnits(plan?.units);
  const remaining = units.filter((u) => u.status !== 'done').length;
  let deadline = null;
  const notes = [];
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
  const events = units.filter((u) =>
    u.status === 'done' && parseLocalDate(u.doneDate) && u.doneDate >= windowStart && u.doneDate <= today,
  ).length;
  if (events === 0) {
    return { ...base, available: false, reason: 'no-recent-completions', note: `近 ${WINDOW_DAYS} 天（${windowStart}～${today}）无单元完成（doneDate 缺失、坏值或不落窗），速率无数据，不硬算`, eventsInWindow: 0, ratePerDay: null, estimatedDays: null, estimatedDoneDate: null, slackDays: null, state: null };
  }
  const ratePerDay = events / WINDOW_DAYS;
  const estimatedDays = Math.ceil(remaining / ratePerDay);
  const estimatedDoneDate = addDaysStr(today, estimatedDays);
  const slackDays = deadline ? diffCalendarDays(estimatedDoneDate, deadline) : null;
  const state = deadline ? (slackDays >= 0 ? 'slack' : 'deficit') : 'no-deadline';
  return {
    ...base, available: true, eventsInWindow: events, ratePerDay,
    estimatedDays, estimatedDoneDate, slackDays, state, note: notes.length ? notes.join('；') : null,
  };
}

/** 4. 断档天数：距最后一次学习接触的自然日差（answers/srs/课学完三通道取最大）。
 *  @param {object} progress progress.json 原文（缺字段按空处理）
 *  @param {number} now     当前 ms 时间戳
 *  @param {object} [opts]  { questionIds, cardIds, theme }——多主题隔离（不传 = 全量口径）
 */
export function deriveGap(progress, now, opts = {}) {
  const { questionIds, cardIds, theme } = opts;
  const qSet = questionIds ? new Set(questionIds) : null;
  const fSet = cardIds ? new Set(cardIds) : null;
  let best = null;
  const consider = (at, source) => {
    if (typeof at === 'number' && Number.isFinite(at) && (!best || at > best.at)) best = { at, source };
  };
  for (const [id, r] of Object.entries(progress?.answers ?? {})) {
    if (qSet && !qSet.has(id)) continue;
    consider(r?.submittedAt, 'answers');
  }
  for (const [id, s] of Object.entries(progress?.srs ?? {})) {
    if (fSet && !fSet.has(id)) continue;
    consider(s?.updatedAt, 'srs');
  }
  for (const [key, at] of Object.entries(progress?.coursesRead ?? {})) {
    if (theme && !key.startsWith(`${theme}/`)) continue;             // key 自带主题前缀
    consider(at, 'coursesRead');
  }
  if (!best) {
    return { available: false, reason: 'no-contact', daysSinceLastContact: null, lastContactAt: null, source: null };
  }
  return {
    available: true,
    daysSinceLastContact: diffCalendarDays(toLocalDateStr(best.at), toLocalDateStr(now)),
    lastContactAt: best.at,
    source: best.source,
  };
}

/** 四组信号总装（CLI 与前端 TS 移植共用入口；noop 判定在调用方——present=false 不进来）。 */
export function derivePlanReport({ plan, progress, now, questionIds, cardIds, theme }) {
  return {
    coverage: deriveCoverage(plan),
    calendarDiff: deriveCalendarDiff(plan, now),
    projection: deriveProjection(plan, now),
    gap: deriveGap(progress, now, { questionIds, cardIds, theme }),
  };
}
