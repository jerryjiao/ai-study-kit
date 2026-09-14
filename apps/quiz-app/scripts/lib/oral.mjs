// oral.mjs — 口头答题流水（oral attempts）解析 / 合并 / 目标解析 / 掌握判据（纯函数为主，装载器除外）。
//
// 流水文件 study/records/oral-attempts.json（学习者私有，随 study/records/ 守 ADR-0002
// 边界：不上站、不提交）：追加式 JSON 数组，一条口头问答一条明细——
//   { "target": "EP-01 暂存区", "correct": true, "at": 1699999999999, "source": "recall" }
//   target  目标引用：EP-NN 前缀（题库考点）| knowflow 图节点相对路径 | 裸考点名（兜底）
//   correct 对错布尔（判对 true / 判错 false）
//   at      真实 Date.now() 时间戳（与 progress.json 同款红线：绝不允许固定值或未来时间）
//   source  来源标记：recall 抽背 | recite 复述 | case 案例评分点（coach.md §6 复述/§6.7 案例）
//
// 唯一真源（v0.14 起）：契约二「口头题计数」节停写，口头计数一律从本流水派生；
// 旧记录手写的计数解析器照读、消费端合并，历史不丢。
// 合并语义：append-only、无覆盖、消费端按 at 排序取信、完全相同的四元组去重——
// 多会话并发写前重读全文再追加写回，天然安全（与 progress.json LWW 同哲学）。
//
// 掌握判据（口头四态，范式照搬 DeepTutor compute_mastery，确定性零 LLM）：
//   近期加权正确率：最近 5 次（旧→新）权重 0.5/0.7/0.85/0.95/1.0，不足 5 次取末尾 k 个权重、
//                 按实际用到的权重和归一。
//   置信度封顶：答 1 次封 0.5、答 2 次封 0.8（防一次蒙对）。
//   四态：untouched 空流水 / weak 最近一次判错或加权分 < 0.5（负面证据优先）/
//         mastered 加权分 ≥ 0.85（封顶之下天然要求 ≥3 次）/ 其余 inProgress。
//   既有考点四态判据（mastery v1.1 题+闪卡双通道）一字不动；两通道合流走 mergeMastery：
//   负面证据优先（任一 weak 即 weak），题通道有数据以题为准（口头正向不越权——「以做题验
//   效果」），题通道 untouched 时口头最多推到 inProgress（题没刷过，口头再好不算掌握）。

export const ORAL_SOURCES = ['recall', 'recite', 'case'];

/** 近期加权权重（旧→新，最近一次 1.0）。 */
export const ORAL_WEIGHTS = [0.5, 0.7, 0.85, 0.95, 1.0];
/** 置信度封顶：按作答次数封加权分（防小样本蒙对）。 */
export const ORAL_CAPS = { 1: 0.5, 2: 0.8 };
/** 掌握线（加权分 ≥ 此值才算口头掌握；1/2 次封顶天然到不了）。 */
export const ORAL_MASTER_AT = 0.85;
/** 弱线：加权分低于此值（且有作答）= weak。 */
export const ORAL_WEAK_BELOW = 0.5;

/**
 * 解析口头答题流水文本（宽容解析：坏文件返回空数组，不抛错——「文件不存在 = 空流水」同模式）。
 * 单条缺 target / correct 非布尔 / at 非有限数 → 跳过该条（只报事实，不要求补格式）。
 * @param {string} text 文件全文
 * @returns {{ attempts: Array<{target: string, correct: boolean, at: number, source: string|null}>, skipped: number }}
 */
export function parseOralAttempts(text) {
  const out = { attempts: [], skipped: 0 };
  if (!text) return out;
  let raw;
  try { raw = JSON.parse(text); } catch { return out; }
  if (!Array.isArray(raw)) return out;
  for (const e of raw) {
    if (!e || typeof e !== 'object') { out.skipped++; continue; }
    if (typeof e.target !== 'string' || !e.target.trim()) { out.skipped++; continue; }
    if (typeof e.correct !== 'boolean') { out.skipped++; continue; }
    if (typeof e.at !== 'number' || !Number.isFinite(e.at)) { out.skipped++; continue; }
    out.attempts.push({
      target: e.target.trim(),
      correct: e.correct,
      at: e.at,
      source: ORAL_SOURCES.includes(e.source) ? e.source : null,
    });
  }
  return out;
}

/**
 * 合并两份流水：并集、完全相同四元组（target+correct+at+source）去重、按 at 升序。
 * 多会话 read-modify-write 并发追加后，消费端用它合并出唯一真源。
 */
export function mergeOralAttempts(a = [], b = []) {
  const seen = new Set();
  const merged = [];
  for (const e of [...a, ...b]) {
    const key = `${e.target}\u0000${e.correct}\u0000${e.at}\u0000${e.source ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(e);
  }
  return merged.sort((x, y) => x.at - y.at);
}

/**
 * 目标引用解析。优先级：EP 前缀 → 映射反查（graph-map 的 node 路径/label → EP）→
 * 图节点直引（graph.json 的节点路径/label，未映射的无题知识点）→ 裸考点名回退。
 * 返回 via = 命中路径（ep 前缀 | node 映射/直引 | name 裸名回退）——聚合方据此决定计数去向
 * （节点命中只进节点桶，不经映射重复计入 EP，避免多节点共享一个 EP 时计数放大）。
 * @param {string} target 原始目标引用
 * @param {object} [p]
 * @param {object} [p.epNames]   EP-NN → 考点名（epNameMap 输出），裸名匹配用它
 * @param {object} [p.graphMap]  loadGraphMap 输出（{ byNode, byLabel, byEp }），映射反查用它
 * @param {object} [p.graphNodes] { byId: Map<id,{id,label}>, byLabel: Map }（图节点直引索引）
 * @returns {{ ep: string|null, node: string|null, name: string, via: 'ep'|'node'|'name'|null, resolved: boolean }}
 */
export function resolveOralTarget(target, { epNames = {}, graphMap = null, graphNodes = null } = {}) {
  const raw = String(target ?? '').trim();
  // ① EP 前缀最优先（「EP-03 chmod 权限」→ EP-03，后缀只作人读备注）
  const epm = raw.match(/^(EP-\d+)\b/);
  if (epm) return { ep: epm[1], node: null, name: raw.slice(epm[1].length).trim() || epNames[epm[1]] || epm[1], via: 'ep', resolved: true };
  // ② 映射反查：节点相对路径精确 → 节点 label 精确
  if (graphMap) {
    const byNode = graphMap.byNode?.get(raw);
    if (byNode) return { ep: byNode.ep, node: byNode.node, name: byNode.label || raw, via: 'node', resolved: true };
    const byLabel = graphMap.byLabel?.get(raw);
    if (byLabel) return { ep: byLabel.ep, node: byLabel.node, name: raw, via: 'node', resolved: true };
  }
  // ③ 图节点直引（未映射节点的引用通道）：路径精确 → label 精确
  if (graphNodes) {
    const byId = graphNodes.byId?.get(raw);
    if (byId) return { ep: null, node: byId.id, name: byId.label || raw, via: 'node', resolved: true };
    const byLabel = graphNodes.byLabel?.get(raw);
    if (byLabel) return { ep: null, node: byLabel.id, name: raw, via: 'node', resolved: true };
  }
  // ④ 裸考点名回退：与排布表考点名精确相等
  for (const [ep, name] of Object.entries(epNames)) {
    if (name === raw) return { ep, node: null, name: raw, via: 'name', resolved: true };
  }
  return { ep: null, node: null, name: raw, via: null, resolved: false };
}

/** 图节点直引索引（graph = loadKnowledgeGraph 输出）——resolveOralTarget 的 graphNodes 参数。 */
export function graphNodeIndex(graph) {
  if (!graph) return null;
  return {
    byId: new Map(graph.nodes.map((n) => [n.id, n])),
    byLabel: new Map(graph.nodes.filter((n) => n.label).map((n) => [n.label, n])),
  };
}

/**
 * 按解析目标聚合流水计数。每条明细只进一个主桶（不重复计数）：
 * 解析出 EP 的（EP 前缀 / 裸名命中 / 经映射反查到 EP 的节点引用）→ byEp（考点视图）；
 * 纯图节点直引（未映射的无题知识点，ep 为空）→ byNode（节点视图）；
 * 完全未解析 → byName（兜底桶，消费方按名字认领）。
 * @returns {{ byEp: Map<string,{asked,correct}>, byNode: Map<string,{asked,correct}>, byName: Map<string,{asked,correct}> }}
 */
export function aggregateOral(attempts = [], opts = {}) {
  const byEp = new Map();
  const byNode = new Map();
  const byName = new Map();
  const bump = (map, key, correct) => {
    const cur = map.get(key) ?? { asked: 0, correct: 0 };
    cur.asked += 1;
    if (correct) cur.correct += 1;
    map.set(key, cur);
  };
  for (const a of attempts) {
    const r = resolveOralTarget(a.target, opts);
    if (r.ep) bump(byEp, r.ep, a.correct);
    else if (r.node) bump(byNode, r.node, a.correct);
    else bump(byName, r.name, a.correct);
  }
  return { byEp, byNode, byName };
}

/**
 * 口头四态掌握判据（纯函数）。
 * @param {Array} attempts 同一目标的流水明细（任意顺序，内部按 at 排序）
 * @returns {{ asked: number, correct: number, score: number|null, status: 'mastered'|'inProgress'|'weak'|'untouched' }}
 */
export function oralMastery(attempts = []) {
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
  const status = (!sorted[n - 1].correct || score < ORAL_WEAK_BELOW)
    ? 'weak'
    : (score >= ORAL_MASTER_AT ? 'mastered' : 'inProgress');
  return { asked: n, correct, score: Math.round(score * 1000) / 1000, status };
}

/**
 * 口头通道与题库考点四态的合流（负面证据优先）：
 *  - 任一通道 weak → weak（口头最近判错会拖垮题库已掌握的考点——负面证据优先）；
 *  - 题通道有数据（非 untouched）→ 以题为准（口头正向不越权：题全对+闪卡毕业的考点
 *    不因「口头问得少」降级，口头正向只作「练过」弱信号）；
 *  - 题通道 untouched → 口头最多推到 inProgress（题没刷过，口头再好也不算掌握——验效果靠题）。
 * @param {'mastered'|'weak'|'inProgress'|'untouched'} epStatus 题库考点四态（mastery v1.1 判据输出）
 * @param {'mastered'|'weak'|'inProgress'|'untouched'} oralStatus 口头四态（oralMastery 输出）
 */
export function mergeMastery(epStatus, oralStatus) {
  if (epStatus === 'weak' || oralStatus === 'weak') return 'weak';
  if (epStatus === 'untouched') return oralStatus === 'mastered' ? 'inProgress' : oralStatus;
  return epStatus;
}

/**
 * 按解析目标把流水明细分组（保留时序——oralMastery 需要每组完整作答序列算加权）。
 * 分桶规则与 aggregateOral 一致：解析出 EP 优先，纯节点直引次之，未解析进 byName。
 * @returns {{ byEp: Map<string,Array>, byNode: Map<string,Array>, byName: Map<string,Array> }}
 */
export function groupOralAttempts(attempts = [], opts = {}) {
  const byEp = new Map();
  const byNode = new Map();
  const byName = new Map();
  for (const a of attempts) {
    const r = resolveOralTarget(a.target, opts);
    if (r.ep) {
      if (!byEp.has(r.ep)) byEp.set(r.ep, []);
      byEp.get(r.ep).push(a);
    } else if (r.node) {
      if (!byNode.has(r.node)) byNode.set(r.node, []);
      byNode.get(r.node).push(a);
    } else {
      if (!byName.has(r.name)) byName.set(r.name, []);
      byName.get(r.name).push(a);
    }
  }
  return { byEp, byNode, byName };
}

/**
 * 口头弱项排序：weak 在前（加权分低者先，无分排最后），再 inProgress（同为加权分升序）。
 * untouched 不进榜（没有行动价值）。供 skill 探测快照「口头弱项」行与推荐点名。
 */
export function rankOralWeakness(targets = []) {
  const rank = (t) => (t.status === 'weak' ? 0 : 1);
  return targets
    .filter((t) => t.status === 'weak' || t.status === 'inProgress')
    .sort((a, b) =>
      (rank(a) - rank(b))
      || ((a.score ?? 2) - (b.score ?? 2))
      || (b.asked - a.asked));
}

// ── 装载器（唯一 IO；坏文件 = 空流水，不拖垮消费方） ──────────────────

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** 流水文件在主题包内的固定路径（学习者私有，随 study/records/ 不上站不提交）。 */
export function oralAttemptsPath(themeDir) {
  return join(themeDir, 'study', 'records', 'oral-attempts.json');
}

/** 读口头答题流水。文件不存在/坏 JSON/条目残缺 → 空流水（「文件不存在 = 空进度」同模式）。 */
export function readOralAttempts(themeDir) {
  const p = oralAttemptsPath(themeDir);
  if (!existsSync(p)) return [];
  try {
    return parseOralAttempts(readFileSync(p, 'utf-8')).attempts;
  } catch {
    return [];
  }
}
