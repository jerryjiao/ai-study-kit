/** warmup.mjs — 断档回归「热身一题」脚本侧判据（#120 / spec #118 T1；v0.26）。
 *
 * 与 src/lib/warmup.ts 双实现同构（改判据两边一起改，两边测试都要过——plan.ts/plan.mjs
 * 双实现先例）。web 侧选站直接复用全景 nextStation（含 knowflow 拓扑）；脚本侧不引
 * 图数据，用同三级优先的排布表近似（无 knowflow 主题两侧一致；有映射主题结构轨近似，
 * 与 nextStation「无映射回退排布表」同一诚实边界，不承诺结构洞察）。
 *
 * 选站三级（nextStation 去拓扑骨架）：
 *   1. 落后日程插队（仅有目标日）：逾期单元 day 序（日历对照 cd.overdue 的日期升序）
 *      → 该 day 下第一个非掌握考点（题库序）
 *   2. 补弱：weak 考点按未毕业错题数降序、平手题库序（复习优先于结构，不受拓扑门控）
 *   3. 结构近似：题库序第一个非掌握考点
 *   全掌握 → null（回退挑题路径）。
 *
 * 挑题（与 TS 侧同构）：考点题集（examPoint 匹配 + 计划内 source）——第一道未答
 * （无记录/墓碑/随机沙盒，mastery 口径）→ 第一道未毕业错题 → 第一道；站点无计划内题
 * 或无站点 → 全库回退同三级，reason='fallback'。
 */
import { isOpenWrong } from './mastery.mjs';

/** 热身池「计划内」判据构造（与 src/lib/warmup.ts 的 isPlanned && tier 双过滤同构）：
 *  source 层 ≠ 拓展（theme-config sourceLayers，无映射 = 无层概念 = 计划内）+ tier ≠ 'ext'。
 *  @param {object|null} sourceLayers theme-config.json 的 sourceLayers（null/缺省 = 全部计划内） */
export function warmupPlannedFrom(sourceLayers) {
  return (q) => (sourceLayers?.[q.source] ?? null) !== '拓展' && q.tier !== 'ext';
}

/** 热身池「计划内」判据（默认回退）：无 theme-config 可读时的宽容降级（仅 tier 层）。
 *  入口脚本（plan-report）读到 sourceLayers 时应传 warmupPlannedFrom(sl) 全判据，
 *  保证教练侧不挑到 web 侧刻意排除的拓展题。 */
const defaultPlanned = (q) => q.tier !== 'ext';

/** 热身选站：三级骨架（纯函数）。
 *  @param {object} p
 *  @param {Array}  p.points        masteryByExamPoint 的 points（题库序；含 status/openWrongIds）
 *  @param {object} p.epDays        epDayMap 的输出（ep → D 节）；落后日程轨按 day 找考点
 *  @param {object} p.calendarDiff  deriveCalendarDiff 的输出（overdue 已按日期升序）
 *  @param {string|null} p.deadline 可解析目标日；null = 无目标日（落后日程轨不存在，零催办）
 *  @returns {{ep:string,name:string,reason:'schedule'|'weak'|'structural'}|null} */
export function warmupStation({ points, epDays, calendarDiff, deadline }) {
  const isMastered = (p) => p.status === 'mastered';
  // 1. 落后日程轨（仅有目标日，与 nextStation 的 planGap 插队同构）
  if (deadline && calendarDiff?.overdue?.length) {
    const days = [];
    for (const u of calendarDiff.overdue) {
      const d = u.day;
      if (typeof d === 'string' && d !== '' && !days.includes(d)) days.push(d);
    }
    for (const d of days) {
      const hit = points.find((p) => !isMastered(p) && epDays[p.ep] === d);
      if (hit) return { ep: hit.ep, name: hit.name, reason: 'schedule' };
    }
  }
  // 2. 补弱轨：weak 按未毕业错题数降序、平手题库序
  const weak = points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.status === 'weak')
    .sort((a, b) => b.p.openWrongIds.length - a.p.openWrongIds.length || a.i - b.i)[0];
  if (weak) return { ep: weak.p.ep, name: weak.p.name, reason: 'weak' };
  // 3. 结构近似：题库序第一个非掌握
  const next = points.find((p) => !isMastered(p));
  if (next) return { ep: next.ep, name: next.name, reason: 'structural' };
  return null;
}

function isUnanswered(q, progress) {
  const r = progress?.answers?.[q.id];
  return !r || r.deletedAt !== undefined || r.fromRandom === true;
}

/** 一道题是否当前仍是未毕业错题（wrongIds 同口径：未删 + streak 未达标）。 */
function isOpenWrongId(q, progress) {
  const r = progress?.answers?.[q.id];
  return !!r && r.deletedAt === undefined && isOpenWrong(r);
}

function pickFrom(pool, progress) {
  if (!pool.length) return null;
  return pool.find((q) => isUnanswered(q, progress)) ?? pool.find((q) => isOpenWrongId(q, progress)) ?? pool[0];
}

/** 热身挑题（纯函数，与 src/lib/warmup.ts 同构）。
 *  @param {Array}  questions 题库（examPoint 匹配用；多主题边界由调用方传对题库保证）
 *  @param {object} progress  progress.json 原文（缺字段按空处理）
 *  @param {object|null} station warmupStation 的输出（null = 全库回退）
 *  @param {Function} [isPlannedFn] 计划内判据（默认 tier 层：非 'ext' 即计划内） */
export function pickWarmupQuestion(questions, progress, station, isPlannedFn = defaultPlanned) {
  const planned = questions.filter((q) => isPlannedFn(q));
  if (!planned.length) return null;
  if (station) {
    const pool = planned.filter((q) => q.examPoint === station.ep);
    const picked = pickFrom(pool, progress);
    if (picked) return { questionId: picked.id, ep: station.ep, name: station.name, reason: station.reason };
  }
  const picked = pickFrom(planned, progress);
  if (!picked) return null;
  return { questionId: picked.id, ep: picked.examPoint ?? '', name: '', reason: 'fallback' };
}
