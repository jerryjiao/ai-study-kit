// graph-bridge.mjs — 投影桥（ADR-0005）：考点节点映射装载 + 知识图装载 + 掌握投影产出。
//
// 两仓分工（ADR-0005）：知识（概念与连线）住外部知识库 knowflow 的图（graph.json，
// 明确面向外部消费）；学习状态住本仓信号源（progress / SRS / 口头答题流水）。
// 本模块是**唯一跨仓契约**的实现面：
//   装载 graph.json（位置以参数/环境变量传入，同进度文件模式）
//   ∪ 考点节点映射（study/records/graph-map.json，学习者个人文件，守 ADR-0002 边界）
//   ∪ 掌握度现算（题库四态 v1.1 + 口头四态，两通道合流负面证据优先）
//   → 产出只读投影文件（nodes[id, mastery, oral]，knowflow 拿去给节点着色）。
//
// 降级铁律：无图 / 无映射 / 文件坏 → 全部静默降级为纯考点口径（「文件不存在 = 空进度」
// 同模式），绝不报错——没装 knowflow 的用户看不到任何变化。
//
// 投影 schema（v1，#44 内联原型）：
//   { version: 1, generatedAt: <ISO>, source: "ai-study-kit mastery v<ver>",
//     nodes: [{ id: <knowflow 节点相对路径>, mastery: "mastered|inProgress|weak|untouched",
//               oral: { asked: N, correct: M } }] }
// 只读、可重复生成；graph.json 本体与知识页零改动；knowflow 侧四态→颜色映射自定
// （status 一词是 knowflow 的编辑审阅闸门，本仓刻意不复用该词避免语义相撞）。
//
// 口头计数的节点归属：节点直接命中的流水只进该节点（不经映射重复计入 EP）；EP 命中的
// 流水会计入**所有映射到该 EP 的节点**（同一考点的图上视图，多节点共享同一份 EP 计数是
// 有意的语义——它们本就是同一个考点）。

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { oralMastery, mergeMastery, resolveOralTarget, graphNodeIndex } from './oral.mjs';

/** 投影文件约定名（落在 knowflow 图谱产物目录旁，与 graph.json 同目录）。 */
export const PROJECTION_FILENAME = 'mastery-projection.json';

/**
 * 装载考点节点映射（study/records/graph-map.json，学习者私有不上站不提交）。
 * 格式：{ version: 1, updatedAt, mappings: [{ node, ep, label? }] }——agent 提议、
 * 学习者确认后落盘（flows.md F12）。宽容解析：坏文件/缺字段 → 空映射，不抛错。
 * @returns {{ version: number|null, byNode: Map<node,{node,ep,label}>, byLabel: Map, byEp: Map<ep,Array> } | null}
 *          null = 无映射文件（调用方走无图降级）
 */
export function loadGraphMap(themeDir) {
  const p = join(themeDir, 'study', 'records', 'graph-map.json');
  if (!existsSync(p)) return null;
  let raw = null;
  try { raw = JSON.parse(readFileSync(p, 'utf-8')); } catch { return null; }
  if (!raw || !Array.isArray(raw.mappings)) return null;
  const byNode = new Map();
  const byLabel = new Map();
  const byEp = new Map();
  for (const m of raw.mappings) {
    if (!m || typeof m.node !== 'string' || !m.node.trim()) continue;
    if (typeof m.ep !== 'string' || !/^EP-\d+$/.test(m.ep)) continue;
    const entry = { node: m.node.trim(), ep: m.ep, label: typeof m.label === 'string' ? m.label : '' };
    byNode.set(entry.node, entry);
    if (entry.label) byLabel.set(entry.label, entry);
    if (!byEp.has(entry.ep)) byEp.set(entry.ep, []);
    byEp.get(entry.ep).push(entry);
  }
  return { version: typeof raw.version === 'number' ? raw.version : null, byNode, byLabel, byEp };
}

/**
 * 装载 knowflow 知识图（graph.json）。路径缺失/文件不存在/坏 JSON → null（静默降级）。
 * 只取消费方需要的最小面：节点 id/label 与边（from/to/relation）。
 * @returns {{ nodes: Array<{id, label}>, edges: Array<{from, to, relation?}> } | null}
 */
export function loadKnowledgeGraph(graphPath) {
  if (!graphPath || !existsSync(graphPath)) return null;
  let raw = null;
  try { raw = JSON.parse(readFileSync(graphPath, 'utf-8')); } catch { return null; }
  if (!raw || !Array.isArray(raw.nodes)) return null;
  const nodes = raw.nodes
    .filter((n) => n && typeof n.id === 'string' && n.id.trim())
    .map((n) => ({ id: n.id, label: typeof n.label === 'string' ? n.label : '' }));
  const ids = new Set(nodes.map((n) => n.id));
  const edges = (Array.isArray(raw.edges) ? raw.edges : [])
    .filter((e) => e && ids.has(e.from) && ids.has(e.to))
    .map((e) => ({ from: e.from, to: e.to, ...(typeof e.relation === 'string' ? { relation: e.relation } : {}) }));
  return { nodes, edges };
}

/**
 * 构建投影（纯函数）。每个图节点一个条目：
 *   mastery = mergeMastery(映射 EP 的题库四态（v1.1，未映射视为 untouched）, 节点口头四态)
 *             ——未映射节点只有口头通道，oral status 原样生效（无题知识点的掌握判据）；
 *             映射节点口头负面（weak）拖垮题库掌握、口头正向不越权（题为准）、
 *             题没刷过时口头最多推到 inProgress（验效果靠做题）。
 *   oral    = 节点直接命中流水 + 其映射 EP 命中流水 的合并计数。
 *
 * @param {object} p
 * @param {object} p.graph          loadKnowledgeGraph 输出
 * @param {object|null} p.graphMap  loadGraphMap 输出（null = 全部节点走纯口头通道）
 * @param {Array}  p.points         masteryByExamPoint 输出的 points（题库四态 v1.1）
 * @param {Array}  [p.oralAttempts] 口头答题流水明细
 * @param {object} [p.epNames]     EP → 考点名（流水目标解析用）
 * @param {string} p.generatedAt   ISO 时间戳（调用方注入，保纯函数可测）
 * @param {string} p.source        口径标识（如 "ai-study-kit mastery v0.14"）
 * @returns {{version:1, generatedAt, source, nodes: Array}}
 */
export function buildProjection({ graph, graphMap = null, points = [], oralAttempts = [], epNames = {}, generatedAt, source }) {
  const epStatus = new Map(points.map((p) => [p.ep, p.status]));
  const graphNodes = graphNodeIndex(graph);

  // 流水按解析目标分组（与 oral.mjs 聚合同规则，每条只进一个主桶）：
  // 解析出 EP 的（含经映射反查）→ byEp；纯图节点直引（未映射无题知识点）→ byNode；
  // 完全未解析 → 丢弃（投影节点集合 = 图节点集合）。
  // 投影节点 oral = 节点直引命中 + 其映射 EP 的命中（EP 视图计数流入映射节点，单节点不重复计）。
  const byNode = new Map();
  const byEp = new Map();
  for (const a of oralAttempts) {
    const r = resolveOralTarget(a.target, { epNames, graphMap: graphMap ?? undefined, graphNodes: graphNodes ?? undefined });
    if (r.ep) {
      if (!byEp.has(r.ep)) byEp.set(r.ep, []);
      byEp.get(r.ep).push(a);
    } else if (r.node) {
      if (!byNode.has(r.node)) byNode.set(r.node, []);
      byNode.get(r.node).push(a);
    }
  }

  const nodes = graph.nodes.map((n) => {
    const direct = byNode.get(n.id) ?? [];
    const mapped = graphMap?.byNode?.get(n.id) ?? null;
    const viaEp = mapped ? (byEp.get(mapped.ep) ?? []) : [];
    const oral = oralMastery([...direct, ...viaEp]);
    // 未映射节点 = 纯口头通道（无题知识点的掌握判据，mastered 可达）；
    // 映射节点 = 题库四态 ∪ 口头四态合流（负面证据优先，见 mergeMastery）
    const mastery = mapped
      ? mergeMastery(epStatus.get(mapped.ep) ?? 'untouched', oral.status)
      : oral.status;
    return {
      id: n.id,
      mastery,
      oral: { asked: oral.asked, correct: oral.correct },
    };
  });

  return { version: 1, generatedAt, source, nodes };
}

/**
 * 投影默认落点：knowflow 图谱产物目录旁（与 graph.json 同目录的 mastery-projection.json）。
 */
export function projectionPathFor(graphPath) {
  return join(dirname(graphPath), PROJECTION_FILENAME);
}

// ── 前置关系（教练推荐用） ────────────────────────────────────────────
//
// 图边 → 学习语义的映射规则（沿 knowflow graph_relation_labeler 的 relation 词汇）：
//   前置类（prerequisite）：边 from→to 表示「from 的成立以 to 为前提」——学习顺序 to 在前。
//     词表：前置 / 依赖 / 来源 / 引用 / 依据 / 使用 / 属于 / 衍生（笔记语境「X 衍生自 Y」
//     远多于反向，按启发式归前置；方向存疑时宁可少排序也不误排序——见只报事实原则）。
//   其余 / 缺 relation 字段（labeler 未跑过）→ 关联（related），不参与排序，只作展示。

/** 前置类关系词表（子串匹配；knowflow 标签器词汇的超集收敛）。 */
export const PREREQ_RELATIONS = ['前置', '依赖', '来源', '引用', '依据', '使用', '属于', '衍生'];

/** 关系标签 → 学习语义：'prerequisite'（to 要先学）| 'related'。 */
export function classifyRelation(label) {
  if (typeof label === 'string' && PREREQ_RELATIONS.some((r) => label.includes(r))) return 'prerequisite';
  return 'related';
}

/**
 * 图信号：前置链 + 弱项推荐排序（纯函数，无图/无映射返回 null——静默降级）。
 *
 * 节点级前置：prereqByNode[from] = [to...]（classifyRelation = prerequisite 的边）。
 * EP 级投影：两端都有 EP 映射的边 → prereqByEp；单端映射 → 弱项的 EP 挂未映射前置节点。
 * mastery 标注：映射前置节点取题库四态（v1.1），未映射前置 = null（未验证）。
 * 消费方（skill 推荐/陪练开场）据此把「前置未掌握」排到被依赖项之前。
 *
 * @param {object} p
 * @param {object} p.graph     loadKnowledgeGraph 输出
 * @param {object|null} p.graphMap loadGraphMap 输出
 * @param {Array}  p.points    masteryByExamPoint 输出（题库四态 v1.1）
 * @returns {{
 *   prereqEdges: number, relatedEdges: number,
 *   prereqByEp: Map<ep, Set<prereqEp>>,                    // EP 级前置边（排序用）
 *   chainByEp: Map<ep, Array<{kind:'ep'|'node', id, name, mastery}>>,  // 弱项前置链（展示用）
 * }}
 */
export function buildPrereqSignals({ graph, graphMap, points = [] }) {
  if (!graph || !graphMap || graphMap.byNode.size === 0) return null;
  const epStatus = new Map(points.map((p) => [p.ep, p.status]));

  const prereqByNode = new Map();
  let relatedEdges = 0;
  for (const e of graph.edges) {
    if (classifyRelation(e.relation) !== 'prerequisite') { relatedEdges++; continue; }
    if (!prereqByNode.has(e.from)) prereqByNode.set(e.from, []);
    prereqByNode.get(e.from).push(e.to);
  }
  const prereqEdges = [...prereqByNode.values()].reduce((s, l) => s + l.length, 0);

  const nodeEntry = (id) => {
    const mapped = graphMap.byNode.get(id);
    if (mapped) return { kind: 'ep', id: mapped.ep, name: mapped.label || id, node: id, mastery: epStatus.get(mapped.ep) ?? 'untouched' };
    const label = graph.nodes.find((n) => n.id === id)?.label;
    return { kind: 'node', id, name: label || id, node: id, mastery: null };
  };

  const prereqByEp = new Map();
  const chainByEp = new Map();
  for (const [from, tos] of prereqByNode) {
    const fromEntry = nodeEntry(from);
    if (fromEntry.kind !== 'ep') continue;          // 前置链挂在有 EP 映射的考点上
    for (const to of tos) {
      const toEntry = nodeEntry(to);
      if (toEntry.id === fromEntry.id) continue;    // 自引用跳过
      // EP 级排序边：前置端也是考点
      if (toEntry.kind === 'ep' && toEntry.id !== fromEntry.id) {
        if (!prereqByEp.has(fromEntry.id)) prereqByEp.set(fromEntry.id, new Set());
        prereqByEp.get(fromEntry.id).add(toEntry.id);
      }
      // 展示链：同考点去重
      if (!chainByEp.has(fromEntry.id)) chainByEp.set(fromEntry.id, []);
      const chain = chainByEp.get(fromEntry.id);
      if (!chain.some((x) => x.kind === toEntry.kind && x.id === toEntry.id)) {
        chain.push({ kind: toEntry.kind, id: toEntry.id, name: toEntry.name, mastery: toEntry.mastery });
      }
    }
  }
  return { prereqEdges, relatedEdges, prereqByEp, chainByEp };
}

/**
 * 弱考点排序尊重前置顺序（稳定拓扑）：若 A 是 B 的前置（含传递）且都在清单里，A 排前。
 * 环上边忽略（宁可退回原顺序也不死循环）；无前置关系的保持原相对顺序（稳定）。
 * @param {Array} eps 弱考点 EP 清单（如 mastery-report 的 weakRanked）
 * @param {Map|null} prereqByEp buildPrereqSignals 的 prereqByEp
 * @returns {Array} 排序后的 EP 清单
 */
export function orderEpsByPrereqs(eps = [], prereqByEp = null) {
  if (!prereqByEp || prereqByEp.size === 0) return eps;
  // 传递前置（后序展开：最深的先出来）；环靠 seen 打断
  const closure = (ep) => {
    const out = [];
    const seen = new Set();
    const visit = (e) => {
      seen.add(e);                                    // 起点自身也标记——环上不自收
      for (const p of prereqByEp.get(e) ?? []) {
        if (seen.has(p)) continue;
        visit(p);
        out.push(p);
      }
    };
    visit(ep);
    return out;
  };
  const out = [];
  const placed = new Set();
  for (const ep of eps) {
    for (const pre of closure(ep)) {
      if (eps.includes(pre) && !placed.has(pre)) {   // 前置也在弱清单里 → 先排前置
        out.push(pre);
        placed.add(pre);
      }
    }
    if (!placed.has(ep)) {
      out.push(ep);
      placed.add(ep);
    }
  }
  return out;
}
