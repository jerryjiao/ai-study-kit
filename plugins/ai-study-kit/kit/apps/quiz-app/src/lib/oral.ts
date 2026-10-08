// oral.ts — 口头答题流水（oral attempts）合并 + 口头四态判据（web 侧，scripts/lib/oral.mjs 的 TS 移植）。
//
// ⚠️ 判据与 scripts/lib/oral.mjs 必须保持同步（mastery-report / skill 探测用那边的版本，
// web 全景页用这边）——改判据两边一起改，测试两边都有；两侧对同一夹具输出一致由
// 本目录 oral.test.ts 的跨侧断言盯着（vitest 直接 import 脚本侧 oral.mjs 对拍，
// 类型面经 scripts/lib/oral.d.mts）。
//
// 数据两份（#122 实时回流起）：
//   主题包 study/records/oral-attempts.json —— 学习者私有，教练陪练的原始落盘（不上站）；
//   progress.oralAttempts                   —— 答题站进度数据面的实时副本（教练写包同时
//   POST /api/oral-attempts，web 侧刷新即进掌握度，不再等 build 快照）。两份同源同流水，
//   合并 = 并集 + 四元组去重（mergeOralAttempts，本文件与 oral.mjs 同款）。
//
// 口头四态判据（与 oral.mjs 完全一致，确定性零 LLM）：
//   近期加权正确率：最近 5 次（旧→新）权重 0.5/0.7/0.85/0.95/1.0，不足 5 次取末尾 k 个权重、
//                 按实际用到的权重和归一。
//   置信度封顶：答 1 次封 0.5、答 2 次封 0.8（防一次蒙对）。
//   四态：untouched 空流水 / weak 最近一次判错或加权分 < 0.5（负面证据优先）/
//         mastered 加权分 ≥ 0.85 / 其余 inProgress。
import type { OralAttempt } from '../types';
import type { MasteryStatus } from './mastery';

export const ORAL_SOURCES = ['recall', 'recite', 'case'] as const;
export type OralSource = (typeof ORAL_SOURCES)[number];

/** 近期加权权重（旧→新，最近一次 1.0）。 */
export const ORAL_WEIGHTS = [0.5, 0.7, 0.85, 0.95, 1.0] as const;
/** 置信度封顶：按作答次数封加权分（防小样本蒙对）。 */
export const ORAL_CAPS: Record<number, number> = { 1: 0.5, 2: 0.8 };
/** 掌握线（加权分 ≥ 此值才算口头掌握；1/2 次封顶天然到不了）。 */
export const ORAL_MASTER_AT = 0.85;
/** 弱线：加权分低于此值（且有作答）= weak。 */
export const ORAL_WEAK_BELOW = 0.5;

/** 口头四态（与 mastery 的 MasteryStatus 同枚举，口头通道独立现算）。 */
export type OralStatus = MasteryStatus;

export interface OralMasteryResult {
  asked: number;
  correct: number;
  score: number | null;
  status: OralStatus;
}

/** 去重键：target+correct+at+source 四元组（theme 不参与——同一笔作答经包/API 两路进来仍是一笔）。 */
function oralKey(a: OralAttempt): string {
  return `${a.target}\u0000${a.correct}\u0000${a.at}\u0000${a.source ?? ''}`;
}

/**
 * 合并两份流水：并集、完全相同四元组去重、按 at 升序。
 * 教练侧同笔作答写主题包 + POST API 两路落盘、多端 progress 各持部分副本，消费端用它合并成唯一真源。
 * （scripts/lib/oral.mjs mergeOralAttempts 的同款移植，跨侧一致有夹具断言。）
 */
export function mergeOralAttempts(a: OralAttempt[] = [], b: OralAttempt[] = []): OralAttempt[] {
  const seen = new Set<string>();
  const merged: OralAttempt[] = [];
  for (const e of [...a, ...b]) {
    const key = oralKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  return merged.sort((x, y) => x.at - y.at);
}

/**
 * 口头四态掌握判据（纯函数，与 scripts/lib/oral.mjs oralMastery 同款）。
 * @param attempts 同一目标的流水明细（任意顺序，内部按 at 排序）
 */
export function oralMastery(attempts: OralAttempt[] = []): OralMasteryResult {
  const sorted = [...attempts].sort((a, b) => a.at - b.at);
  const n = sorted.length;
  const correct = sorted.filter((a) => a.correct).length;
  if (n === 0) return { asked: 0, correct: 0, score: null, status: 'untouched' };
  const k = Math.min(ORAL_WEIGHTS.length, n);
  const recent = sorted.slice(-k);
  const weights = ORAL_WEIGHTS.slice(-k);
  const wSum = weights.reduce((s, w) => s + w, 0);
  let score = recent.reduce((s, a, i) => s + weights[i] * (a.correct ? 1 : 0), 0) / wSum;
  const cap = ORAL_CAPS[n];
  if (cap !== undefined) score = Math.min(score, cap);
  // 负面证据优先：最近一次判错即 weak；其次加权分过弱线也是 weak
  const status: OralStatus = (!sorted[n - 1].correct || score < ORAL_WEAK_BELOW)
    ? 'weak'
    : (score >= ORAL_MASTER_AT ? 'mastered' : 'inProgress');
  return { asked: n, correct, score: Math.round(score * 1000) / 1000, status };
}

/**
 * 目标引用解析出考点 EP（web 侧解析链：EP 前缀 → 裸考点名，两条正路）。
 * 图节点映射反查是脚本侧（mastery-report）的增强，web 侧没有图数据不参与。
 * @returns EP-NN 或 null（未解析——裸知识点/图节点引用，不进考点桶）
 */
export function resolveOralTargetEp(target: string, epNames: Record<string, string> = {}): string | null {
  const raw = String(target ?? '').trim();
  const epm = raw.match(/^(EP-\d+)\b/);
  if (epm) return epm[1];
  for (const [ep, name] of Object.entries(epNames)) {
    if (name === raw) return ep;
  }
  return null;
}

/**
 * 按考点把流水分组（保留时序——oralMastery 需要每组完整作答序列算加权）。
 * 只收能解析出 EP 的条目（EP 前缀 / 裸考点名命中）；其余不进考点桶。
 */
export function groupOralByEp(
  attempts: OralAttempt[] = [],
  epNames: Record<string, string> = {},
): Map<string, OralAttempt[]> {
  const byEp = new Map<string, OralAttempt[]>();
  for (const a of attempts) {
    const ep = resolveOralTargetEp(a.target, epNames);
    if (!ep) continue;
    const list = byEp.get(ep);
    if (list) list.push(a);
    else byEp.set(ep, [a]);
  }
  return byEp;
}

/**
 * 多主题隔离（读端过滤，与 answers 的「先与激活主题题 id 集求交」同哲学）：
 * 只留属于当前主题的条目；缺 theme 的条目宽容视为当前主题（手写/旧数据兼容，不见为失）。
 * 调用方（Panorama 页）先过滤再喂 buildPanorama，其他主题的口述成绩不混入本主题考点。
 */
export function oralAttemptsForTheme(
  attempts: OralAttempt[] = [],
  theme: string | null | undefined,
): OralAttempt[] {
  if (!theme) return attempts;
  return attempts.filter((a) => !a.theme || a.theme === theme);
}
