/** 计划生成器判据层（v0.27 #121，spec #118（自适应排期器））——按实测速率从剩余单元生成排期。
 *
 *  与 plan.mjs（对账刀）的分工：那边**只读派生**四组信号，这边**生成写回** plan.json 的
 *  plannedDate——kit 里第二个被授权写主题计划文件的路径（第一个是契约三的三动作，只碰
 *  status/doneDate）。写回口与纪律单源在 skills/references/contracts.md 契约三「重排」节：
 *  学习者明确说「重排计划」才跑（plan.json 是主题数据，agent 不自作主张重排）；done 单元
 *  逐字段原样保留（完成是事实不重写），day/topic/title 不动（内容映射，排布表 day 列
 *  与 MISSION 同命名空间）；交错模式下重排剩余单元的 order（学习顺序本身是排期的产物）。
 *
 *  ════════════════ 数学口径（与复盘速率算术逐项对得上，见票 #121 验收）════════════════
 *
 *  1. 实测每单元天数 daysPerUnit（三级来源，取先命中）：
 *     - 显式传入（复盘/对账实测值，如 2.6 天/站）；
 *     - 对账刀同源：deriveProjection 近 14 天窗 ratePerDay → 1/rate（同一套完成事件数学）；
 *     - 全历史跨度：done 单元 doneDate 的 (max−min)+1 天 ÷ done 数（长断档后窗口空事件
 *       时的兜底——历史还在，不弃算）。
 *     - 三者皆无（零 done 单元）→ 明确报错不猜：没有实测速率就没有排期。
 *
 *  2. 活跃率折减 activity（0<≤1）：日历天 = 学程天 ÷ 活跃率。复盘口径「37 站 × 2.6 天/站
 *     ÷ 54% 活跃率 ≈ 178 天纯学程」——实测速率反映的是**在学期间**的节奏，断档/休息日
 *     把日历拉长，折减就是这层换算。派生：进度四通道（answers/srs/课学完/口述，主题隔离
 *     同 deriveGap）的接触日集合 ÷ [首末接触日] 跨度；不足两个接触日 → 无从折减，按 1.0
 *     （不折减）并注记来源。
 *
 *  3. 排期：第 k 个剩余单元的 plannedDate = 起点 + round(k × daysPerUnit × (1+margin) ÷
 *     activity)。margin 是余量系数（复盘对 2027-05-22 用了 20~30%——剩余站更重）；起点
 *     默认今天；deadline（plan.json 或显式覆盖）只做**可行性对照**不参与分配：预计完成日
 *     > deadline → 明确报错（附全部算术 + 考期内可容纳的最大 daysPerUnit），绝不静默压缩
 *     速率把不可行排成可行。
 *
 *  4. 交错排布 interleave：硬算/概念不再「概念前置、硬算后置」（09-15 手工重排的教训：
 *     末段计算+记忆双高峰），改为轻重交替（轻先行铺小胜，与轻启动同哲学）。轻重的机器
 *     判据 = MISSION 排布表深度列的**代理**：掌握 = 重（站深上限 ≤1 天），理解/了解 = 轻
 *     （≤半天 / ≤2~3 小时）；单元取 title 里第一个 EP-NN 查表，查不到映射归轻桶（不见为
 *     轻，不猜重）。in-progress 单元恒排最前（学到一半的最该先收）。交错只在轻桶耗尽前
 *     保证不连排两个重单元——重远多于轻时（如软件设计师剩余站）尾部自然连续，如实呈现。
 *
 *  纯函数无 IO（写文件在 CLI 层 plan-generate.mjs）；时区口径与 plan.mjs 同：自然日按
 *  本地时区，测试用本地正午构造时间戳保跨时区确定。
 */
import { deriveProjection, toLocalDateStr, parseLocalDate, diffCalendarDays } from './plan.mjs';

// ════════════════ 排布表解析 ════════════════

/** 重站深度前缀：排布表深度列「掌握」（站深上限 ≤1 天，重于理解的半天/了解的 2~3 小时）。 */
export const HEAVY_DEPTH = '掌握';

/** MISSION 考点排布表 → { 'EP-01': '掌握', ... }（深度列原文；无表/无该列 → 空对象）。
 *  与 mastery.mjs 的 epNameMap/epDayMap 同族解析，列位独立（深度是第 3 列）。 */
export function epDepthMap(missionText) {
  const map = {};
  if (!missionText) return map;
  for (const m of missionText.matchAll(/^\|\s*(EP-\d+)\s*\|[^|]*\|\s*([^|]*?)\s*\|/gm)) {
    const depth = m[2].trim();
    if (depth && !/^[—\-–~]+$/.test(depth)) map[m[1]] = depth;      // —— / - 占位 = 未标深度
  }
  return map;
}

/** 单元 → 排布表考点（title 里第一个 EP-NN；无映射 → null）。 */
export function unitEpOf(unit) {
  return (typeof unit?.title === 'string' && unit.title.match(/EP-\d+/)?.[0]) || null;
}

/** 单元轻重分类：掌握 = 重（硬算代理），其余（理解/了解/无映射）= 轻。
 *  无映射归轻不见为重——交错判据缺数据时往温和侧倒，不猜重。 */
export function isHeavyUnit(unit, depthMap) {
  const ep = unitEpOf(unit);
  return !!ep && (depthMap[ep] ?? '').startsWith(HEAVY_DEPTH);
}

// ════════════════ 交错排序（纯函数）════════════════

/** 剩余单元交错排序：in-progress 恒最前（学到一半的最该先收），其后轻/重交替**轻先行**
 *  （小胜铺开局），桶内稳定保持输入（order）序；某桶耗尽后另一桶余量照排（重远多于轻时
 *  尾部自然连续——交错是排布取向不是硬保证，见头注第 4 条）。返回新数组，不改入参。 */
export function interleaveSequence(remainingUnits, depthMap) {
  const inProgress = [];
  const light = [];
  const heavy = [];
  for (const u of remainingUnits) {
    if (u.status === 'in-progress') inProgress.push(u);
    else if (isHeavyUnit(u, depthMap)) heavy.push(u);
    else light.push(u);
  }
  const out = [...inProgress];
  // 轻先行交替：轻桶非空时下一手恒是轻——重单元永不连排（直至轻桶耗尽）
  while (light.length || heavy.length) {
    if (light.length) out.push(light.shift());
    if (heavy.length) out.push(heavy.shift());
  }
  return out;
}

// ════════════════ 实测速率派生 ════════════════

/** 实测每单元天数（三级来源取先命中；判据见头注第 1 条）。
 *  @returns {{ok:true, value:number, source:'flag'|'window'|'lifetime'}} |
 *           {{ok:false, reason:'bad-flag'|'no-pace', message:string}} */
export function deriveDaysPerUnit({ plan, now, explicit }) {
  if (explicit !== undefined) {
    const v = Number(explicit);
    if (!Number.isFinite(v) || v <= 0) {
      return { ok: false, reason: 'bad-flag', message: `--days-per-unit "${explicit}" 不是正数——实测速率请给真实测量值（如 2.6），排期器不编速率` };
    }
    return { ok: true, value: v, source: 'flag' };
  }
  // ① 对账刀同源：近 14 天窗完成事件 → 1/rate
  const proj = deriveProjection(plan, now);
  if (proj.available && proj.ratePerDay > 0) {
    return { ok: true, value: 1 / proj.ratePerDay, source: 'window' };
  }
  // ② 全历史跨度兜底：done 单元的首末 doneDate 跨度 ÷ 完成数（长断档后窗口空事件仍可算；
  //    同日多完成也成立——span 1 天 ÷ N 笔 = 1/N 天/单元）
  const doneDates = (plan?.units ?? [])
    .filter((u) => u && typeof u === 'object' && u.status === 'done')
    .map((u) => u.doneDate)
    .filter((d) => typeof d === 'string' && parseLocalDate(d))
    .sort();
  if (doneDates.length >= 2) {
    const spanDays = diffCalendarDays(doneDates[0], doneDates[doneDates.length - 1]) + 1; // 含首末两天
    return { ok: true, value: spanDays / doneDates.length, source: 'lifetime' };
  }
  return {
    ok: false,
    reason: 'no-pace',
    message: `实测速率无数据可派生：近 14 天零完成事件、done 单元不足两笔有效 doneDate（现有 ${doneDates.length} 笔）——请显式传 --days-per-unit（如复盘实测值），排期器不猜速率`,
  };
}

// ════════════════ 活跃率派生 ════════════════

/** 进度四通道（answers/srs/课学完/口述）的本主题接触日集合（本地日 YYYY-MM-DD）。
 *  主题隔离同 deriveGap：answers/srs 按题/卡 id 集求交、coursesRead 按主题前缀、口述按
 *  条目 theme（缺省宽容视为当前主题）。墓碑答案/撤销的课也算接触（来过就算来过）。 */
export function contactDates(progress, opts = {}) {
  const { questionIds, cardIds, theme } = opts;
  const qSet = questionIds ? new Set(questionIds) : null;
  const fSet = cardIds ? new Set(cardIds) : null;
  const days = new Set();
  const consider = (at) => {
    if (typeof at === 'number' && Number.isFinite(at)) days.add(toLocalDateStr(at));
  };
  for (const [id, r] of Object.entries(progress?.answers ?? {})) {
    if (qSet && !qSet.has(id)) continue;
    consider(r?.submittedAt);
  }
  for (const [id, s] of Object.entries(progress?.srs ?? {})) {
    if (fSet && !fSet.has(id)) continue;
    consider(s?.updatedAt);
  }
  for (const [key, at] of Object.entries(progress?.coursesRead ?? {})) {
    if (theme && !key.startsWith(`${theme}/`)) continue;
    consider(at);
  }
  const oralExtra = Array.isArray(opts.oralAttempts) ? opts.oralAttempts : [];
  for (const a of [...(progress?.oralAttempts ?? []), ...oralExtra]) {
    if (!a || typeof a !== 'object') continue;
    if (theme && a.theme && a.theme !== theme) continue;
    consider(a.at);
  }
  return days;
}

/** 活跃率 = 接触日数 ÷ [首末接触日] 跨度（含首末，复盘口径 14/26 ≈ 54% 同族算术）。
 *  不足两个接触日 → null（无从折减；调用方按 1.0 处理并注记，见头注第 2 条）。
 *  结果夹到 (0,1]：首末同日 → 1.0（那天确实全天在学）。 */
export function deriveActivity({ progress, now: _now, questionIds, cardIds, theme, oralAttempts }) {
  const days = [...contactDates(progress, { questionIds, cardIds, theme, oralAttempts })].sort();
  if (days.length < 2) return null;
  const span = diffCalendarDays(days[0], days[days.length - 1]) + 1;
  return Math.min(1, days.length / span);
}

// ════════════════ 排期生成 ════════════════

/** 合法日期串 + N 天 → 合法日期串（plan.mjs 的 addDaysStr 未导出，本层自带一份同款）。 */
function addDaysStr(dateStr, n) {
  const d = parseLocalDate(dateStr);
  d.setDate(d.getDate() + n);
  return toLocalDateStr(d.getTime());
}

const safeUnits = (units) => (Array.isArray(units) ? units.filter((u) => u && typeof u === 'object') : []);
const orderOf = (u) => (typeof u.order === 'number' && Number.isFinite(u.order) ? u.order : Infinity);

/**
 * 生成重排后的完整 PlanFile（含 summary；判据见头注）。
 * @param {object} p
 * @param {object} p.plan          现有 plan.json（units 必须非空且有剩余单元，调用方守门）
 * @param {number} p.now           当前 ms 时间戳（起点默认今天、速率窗口都用它）
 * @param {number} p.daysPerUnit   实测每单元天数（deriveDaysPerUnit 的输出 value）
 * @param {number} p.activity      活跃率 (0,1]
 * @param {number} [p.margin]      余量系数（默认 0；复盘对剩余站更重用了 0.2~0.3）
 * @param {string} [p.startDate]   排期起点 YYYY-MM-DD（默认今天；不得在过去）
 * @param {string|null} [p.deadline] 考期（显式覆盖；null = 沿用 plan.deadline，都没有则不对照）
 * @param {boolean} [p.interleave] 硬算/概念交错（默认 false = 沿原 order 顺序排）
 * @param {object} [p.depthMap]    epDepthMap 输出（interleave 时用）
 * @returns {{ok:true, plan:object, summary:object}} | {{ok:false, reason:string, message:string}}
 */
export function generatePlanSchedule({ plan, now, daysPerUnit, activity, margin = 0, startDate, deadline, interleave = false, depthMap = {} }) {
  // ── 入参校验（缺数据/坏数据明确报错，绝不静默兜底成能跑的形状）──
  if (!(Number.isFinite(daysPerUnit) && daysPerUnit > 0)) {
    return { ok: false, reason: 'bad-pace', message: `daysPerUnit "${daysPerUnit}" 不是正数——排期器不编速率` };
  }
  if (!(Number.isFinite(activity) && activity > 0 && activity <= 1)) {
    return { ok: false, reason: 'bad-activity', message: `activity "${activity}" 不在 (0,1]——活跃率是折减系数，0 或 >1 都不是合法折减` };
  }
  if (!(Number.isFinite(margin) && margin >= 0)) {
    return { ok: false, reason: 'bad-margin', message: `margin "${margin}" 不是 ≥0 的数——余量系数请给分数（0.25 = 加 25% 余量）` };
  }
  const today = toLocalDateStr(now);
  const start = startDate ?? today;
  if (!parseLocalDate(start)) {
    return { ok: false, reason: 'bad-start', message: `起点 "${start}" 无法解析（要 YYYY-MM-DD 且是真实日历日）` };
  }
  if (start < today) {
    return { ok: false, reason: 'past-start', message: `起点 ${start} 在今天（${today}）之前——排期从过去起步只会制造假逾期，从今天或往后起` };
  }
  let dl = deadline ?? plan.deadline ?? null;
  if (dl !== null && !parseLocalDate(dl)) {
    return { ok: false, reason: 'bad-deadline', message: `deadline "${dl}" 无法解析（要 YYYY-MM-DD 且是真实日历日）` };
  }

  const all = safeUnits(plan?.units);
  const remaining = all.filter((u) => u.status !== 'done');
  if (all.length === 0) {
    return { ok: false, reason: 'empty-plan', message: '计划无单元——生成器只重排已有计划，不发明计划（单元粒度是内容决策，见契约三）' };
  }
  if (remaining.length === 0) {
    return { ok: false, reason: 'complete', message: '计划已全部完成，无可排单元' };
  }

  // ── 顺序：交错（in-progress 最前 + 轻重交替）或原 order 序 ──
  const ordered = interleave
    ? interleaveSequence(remaining, depthMap)
    : [...remaining].sort((a, b) => orderOf(a) - orderOf(b));

  // ── 数学：第 k 单元计划完成日 = 起点 + round(k × 速率 × (1+余量) ÷ 活跃率) ──
  const perUnitCalendar = (daysPerUnit * (1 + margin)) / activity;
  const schedule = ordered.map((u, i) => ({ unit: u, plannedDate: addDaysStr(start, Math.round((i + 1) * perUnitCalendar)) }));
  const scheduledEnd = schedule[schedule.length - 1].plannedDate;

  // ── 可行性对照（deadline 不参与分配，只判可行；不可行 = 报错附全算术，不静默压缩）──
  if (dl && scheduledEnd > dl) {
    const deficit = diffCalendarDays(dl, scheduledEnd);
    const spanDays = diffCalendarDays(start, dl);
    const maxPace = (spanDays * activity) / (remaining.length * (1 + margin));
    return {
      ok: false,
      reason: 'infeasible',
      message: `按实测速率排不进考期：剩余 ${remaining.length} 单元 × ${daysPerUnit} 天/单元${margin ? ` × ${1 + margin} 余量` : ''} ÷ 活跃率 ${activity} = ${Math.round(remaining.length * perUnitCalendar)} 天（${start} + → ${scheduledEnd}）> 考期 ${dl}，缺口 ${deficit} 天；考期内可容纳的最大速率 ≈ ${maxPace.toFixed(2)} 天/单元——降余量、提活跃率，或与学习者对齐缩量`,
    };
  }

  // ── 组装写回件：done 单元逐字段原样（在前，保原相对序）；剩余单元按新顺序排列、
  //    覆盖 plannedDate（交错另重排 order——数组位置与 order 值同序，文件可读）──
  const maxDoneOrder = all
    .filter((u) => u.status === 'done')
    .reduce((m, u) => Math.max(m, Number.isFinite(u.order) ? u.order : 0), 0);
  const units = [
    ...all.filter((u) => u.status === 'done').map((u) => ({ ...u })),                  // 完成是事实：逐字段原样保留
    ...schedule.map(({ unit: u, plannedDate: d }, i) => {
      const out = { ...u, plannedDate: d };
      if (interleave) out.order = maxDoneOrder + i + 1;                               // 交错重排学习顺序（紧跟 done 段之后）
      return out;
    }),
  ];

  const heavyCount = ordered.filter((u) => isHeavyUnit(u, depthMap)).length;
  return {
    ok: true,
    plan: dl ? { ...plan, deadline: dl, units } : { ...plan, units },
    summary: {
      remaining: remaining.length,
      daysPerUnit,
      activity,
      margin,
      interleave,
      heavy: heavyCount,
      light: remaining.length - heavyCount,
      perUnitCalendarDays: Math.round(perUnitCalendar * 100) / 100,
      totalCalendarDays: diffCalendarDays(start, scheduledEnd),
      start,
      scheduledEnd,
      deadline: dl,
      slackDays: dl ? diffCalendarDays(scheduledEnd, dl) : null,    // 正=富余、0=贴线、null=无考期
      formula: `${remaining.length} 单元 × ${daysPerUnit} 天/单元${margin ? ` × ${(1 + margin).toFixed(2)}` : ''} ÷ 活跃率 ${activity} → ${diffCalendarDays(start, scheduledEnd)} 天（${start} → ${scheduledEnd}）`,
    },
  };
}
