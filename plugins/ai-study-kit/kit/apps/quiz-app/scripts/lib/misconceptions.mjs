// misconceptions.mjs — 口述错因台账（study/records/misconceptions.json）解析 / 构建 / 追加 / 状态派生
// （纯函数为主，装载器除外）。#132 / spec #131；归档决策 #128（append-only 最小私有台账）。
//
// 台账文件 study/records/misconceptions.json（学习者私有，随 study/records/ 守 ADR-0002
// 边界：不上站、不提交）：追加式 JSON 数组，一条 = 一次已观察到的口述错误及其诊断——
//   {
//     "theme": "dev-intro",                       // 主题名（条目冗余，读端按主题过滤——同号 EP 不串用）
//     "target": "EP-03 chmod",                    // 目标引用原文（宽容三档同口述流水）
//     "ep": "EP-03", "node": null, "name": "chmod", "via": "ep",
//                                                  // 归属解析结果随条目落盘（复用 resolveOralTarget，不新造）
//     "observed": { "text": "把 4 说成读权限", "at": 1789000000000, "source": "recall" },
//                                                  // 必填：学习者实际说错的内容（事实）+ 真实事件时间 + 来源
//     "diagnosis": { "text": "权限位与八进制对应记反", "at": 1789000000000 },
//                                                  // 可缺省：教练推断的根因（推断）——与 observed 分立，缺一即缺不混写
//     "questionId": "GIT-005",                    // 可选：题库题溯源
//     "status": "open"                            // 落盘恒为 open；corrected/recurred 由消费端派生（见下）
//   }
//
// 纪律（契约二「口述错因台账」，单源 skills/references/contracts.md）：
//   - append-only：写前重读全文 → 追加 → 整文件写回（与口述流水同款并发纪律）；时间戳一律真实
//     事件时间，禁固定值/未来值（buildMisconceptionEntry 带 now 守卫拒未来时间戳）。
//   - 纠正/复发不改写旧条目：status 由消费端按后续口述流水派生（deriveMisconceptionStatuses）——
//     同 target 最近一次后续口述答对 = corrected；同根因再现（追加新条目、diagnosis 沿用原文）=
//     原 条目计 recurred。历史全留可追溯（与 plan.rescheduled 审计同哲学）。
//   - 裸名（via=null）永不强行归 EP：按名字聚合、消费端标「未定位」如实呈现，不猜归属。
//   - 不存聊天全文；observed 只记事实、diagnosis 只记推断——引用时如实区分，不把推断写成
//     学习者已承认的事实。
//   - 台账是证据源不是判据输入：不参与 v1.2 掌握判据，不制造题库作答成绩。
//
// 状态派生口径（确定性，零 LLM）：
//   对条目 E（身份键 = 落盘 ep ?? 落盘 node ?? 名字（name ?? target 原文）——**只认写时落盘的
//   解析结果，消费端不重新解析**：裸名（via=null）当时没归到 EP，之后排布表改了也不漂移，
//   「未定位」如实稳定；根因键 = diagnosis.text 规范化、缺省回退 observed.text 规范化）：
//     recurred   同身份 + 同根因键的更晚条目存在（同错因再现——写入口径要求复发时 diagnosis
//                一字不差沿用原文，接续由此可判定；不同措辞 = 独立新错因，各自走生命周期）
//     corrected  否则，同身份的后续口述（at > observed.at）最近一次答对
//     open       其余（无后续口述，或最近一次仍答错）——#129 复测入选资格即消费此口径
//   口述流水的身份键用同一套 resolveOralTarget 现算（与 groupOralAttempts 分桶同参同源）。
export const MISCONCEPTION_SOURCES = ['recall', 'recite', 'case'];
export const MISCONCEPTION_STATUSES = ['open', 'corrected', 'recurred'];

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveOralTarget } from './oral.mjs';

/** 文本规范化（根因键/去重键用）：trim + 折叠连续空白——不做语义近似，宁少报不虚报。 */
const norm = (s) => String(s ?? '').trim().replace(/\s+/g, ' ');

const isNonEmptyString = (v) => typeof v === 'string' && v.trim().length > 0;

/**
 * 解析口述错因台账文本（宽容解析：坏 JSON 返回空台账不抛错——「文件不存在 = 空台账」同模式）。
 * 单条残缺（缺 target / observed 不全 / observed.source 非法 / diagnosis 半缺 / status 非法）→
 * 跳过该条并计数（只报事实，不要求补格式）；ep/node/name/via 允许整体缺省（消费端 fresh 解析兜底）。
 * @param {string} text 文件全文
 * @returns {{ entries: Array<object>, skipped: number, broken: boolean }}
 *   broken = 文本非空但整体不可解析（JSON 坏 / 非数组）——读端当空台账静默降级；
 *   写端（appendMisconceptions）拒绝对 broken 文件写回（不静默重置学习者数据）。
 */
export function parseMisconceptions(text) {
  const out = { entries: [], skipped: 0, broken: false };
  if (!text) return out;
  let raw;
  try { raw = JSON.parse(text); } catch { return { ...out, broken: true }; }
  if (!Array.isArray(raw)) return { ...out, broken: true };
  for (const e of raw) {
    if (!e || typeof e !== 'object') { out.skipped++; continue; }
    if (!isNonEmptyString(e.target)) { out.skipped++; continue; }
    const o = e.observed;
    if (!o || typeof o !== 'object'
      || !isNonEmptyString(o.text)
      || typeof o.at !== 'number' || !Number.isFinite(o.at)
      || !MISCONCEPTION_SOURCES.includes(o.source)) { out.skipped++; continue; }
    let diagnosis = null;
    if (o !== null && e.diagnosis !== undefined && e.diagnosis !== null) {
      const d = e.diagnosis;
      if (!d || typeof d !== 'object'
        || !isNonEmptyString(d.text)
        || typeof d.at !== 'number' || !Number.isFinite(d.at)) { out.skipped++; continue; }
      diagnosis = { text: d.text, at: d.at };
    }
    if (e.questionId !== undefined && e.questionId !== null && !isNonEmptyString(e.questionId)) {
      out.skipped++; continue;
    }
    const status = e.status === undefined ? 'open' : e.status;
    if (!MISCONCEPTION_STATUSES.includes(status)) { out.skipped++; continue; }
    out.entries.push({
      theme: isNonEmptyString(e.theme) ? e.theme : undefined,
      target: e.target.trim(),
      ep: typeof e.ep === 'string' && e.ep ? e.ep : null,
      node: typeof e.node === 'string' && e.node ? e.node : null,
      name: isNonEmptyString(e.name) ? e.name : null,
      via: ['ep', 'node', 'name', null].includes(e.via) ? e.via : null,
      observed: { text: o.text, at: o.at, source: o.source },
      diagnosis,
      questionId: isNonEmptyString(e.questionId) ? e.questionId : null,
      status,
    });
  }
  return out;
}

/**
 * 构建一条台账条目（agent 写入口径的唯一正门；throw = 拒写，不产残条）。
 * 归属解析复用 resolveOralTarget（EP 前缀 → 图节点映射反查 → 图节点直引 → 裸名回退），
 * 解析结果（ep/node/name/via）随条目落盘；via=null 永不强行归 EP。
 * @param {object} p
 * @param {string} p.theme          主题名（条目冗余，必填）
 * @param {string} p.target         目标引用原文
 * @param {string} p.observedText   学习者实际说错的内容（事实，必填）
 * @param {number} p.observedAt     真实事件时间（毫秒；now 给定时拒未来值）
 * @param {string} p.observedSource recall | recite | case
 * @param {string} [p.diagnosisText] 教练推断的根因（可缺省；给则 diagnosisAt 必同给——缺一即缺不混写）
 * @param {number} [p.diagnosisAt]    推断落笔时间（毫秒）
 * @param {string} [p.questionId]   题库题溯源（可选）
 * @param {object} [p.resolve]     resolveOralTarget 的 { epNames, graphMap, graphNodes }
 * @param {number} [p.now]         当前真实时间（写入口径必传 Date.now()；隔离夹具可注入）
 */
export function buildMisconceptionEntry({
  theme, target, observedText, observedAt, observedSource,
  diagnosisText = null, diagnosisAt = null, questionId = null,
  resolve = {}, now = null,
}) {
  if (!isNonEmptyString(theme)) throw new Error('misconceptions: theme 必填（条目冗余主题名）');
  if (!isNonEmptyString(target)) throw new Error('misconceptions: target 必填（目标引用原文）');
  if (!isNonEmptyString(observedText)) throw new Error('misconceptions: observed.text 必填（学习者实际说错的内容）');
  if (typeof observedAt !== 'number' || !Number.isFinite(observedAt)) throw new Error('misconceptions: observed.at 必须是有限毫秒时间戳');
  if (!MISCONCEPTION_SOURCES.includes(observedSource)) throw new Error(`misconceptions: observed.source 必须是 ${MISCONCEPTION_SOURCES.join('/')}（不新增枚举）`);
  if ((diagnosisText == null) !== (diagnosisAt == null)) throw new Error('misconceptions: diagnosis 的 text/at 要么同给要么同缺（缺一即缺不混写）');
  if (diagnosisText != null && !isNonEmptyString(diagnosisText)) throw new Error('misconceptions: diagnosis.text 不能是空白');
  if (diagnosisAt != null && (typeof diagnosisAt !== 'number' || !Number.isFinite(diagnosisAt))) throw new Error('misconceptions: diagnosis.at 必须是有限毫秒时间戳');
  if (questionId != null && !isNonEmptyString(questionId)) throw new Error('misconceptions: questionId 给定时必须是非空字符串');
  if (now != null) {
    if (observedAt > now) throw new Error('misconceptions: observed.at 禁未来时间戳（真实事件时间红线）');
    if (diagnosisAt != null && diagnosisAt > now) throw new Error('misconceptions: diagnosis.at 禁未来时间戳（真实事件时间红线）');
  }
  const r = resolveOralTarget(target, resolve);
  const entry = {
    theme,
    target: String(target).trim(),
    ep: r.ep,
    node: r.node,
    name: r.name,
    via: r.via,
    observed: { text: String(observedText), at: observedAt, source: observedSource },
    diagnosis: diagnosisText != null ? { text: diagnosisText, at: diagnosisAt } : null,
    questionId: questionId ?? null,
    status: 'open', // 落盘恒 open；corrected/recurred 是消费端派生态，永不写回旧条目
  };
  return entry;
}

/** 条目去重键：主题 + 身份 + 观察时间 + 观察原文规范化——完全同一笔观察不重复计数。 */
function entryDupKey(e) {
  return [e.theme ?? '', e.ep ?? '', e.node ?? '', norm(e.name ?? ''), e.observed.at, norm(e.observed.text)].join('\u0000');
}

/**
 * 追加一条条目到台账文本（append-only 读-改-写的纯函数面：agent 落盘 = 写前重读全文 →
 * 本函数追加 → 整文件写回）。完全相同的观察（同主题 + 同身份 + 同 observed.at + 同原文）
 * 已存在 → 不追加（deduped，重复提交不凭记录次数制造新成绩）；文本非空但整体坏
 * （broken）→ throw 拒写（绝不静默重置学习者数据——先留档处置，如改名 .bak 后重开）。
 * @param {string|null} existingText 台账文件全文（null/空 = 新建）
 * @param {object} entry buildMisconceptionEntry 产物
 * @returns {{ text: string, appended: boolean, deduped: boolean, total: number }}
 */
export function appendMisconceptions(existingText, entry) {
  const parsed = parseMisconceptions(existingText ?? '');
  if (parsed.broken) throw new Error('misconceptions: 台账文件损坏，拒绝写回覆盖——先留档（如改名为 misconceptions.json.bak）再重开');
  if (parsed.entries.some((e) => entryDupKey(e) === entryDupKey(entry))) {
    return { text: existingText ?? '[]\n', appended: false, deduped: true, total: parsed.entries.length };
  }
  const entries = [...parsed.entries, entry];
  return { text: JSON.stringify(entries, null, 2) + '\n', appended: true, deduped: false, total: entries.length };
}

/**
 * 目标引用 → 身份键（口述流水侧）：EP 前缀 / 映射反查 / 裸名命中的口述与台账条目落在同一键上。
 * 与 misconceptionIdentity 同一套（ep → node → 名字）——状态派生与复测入选（lib/retest.mjs）共用，
 * 保证「同一目标」的台账条目与口述流水天然对齐。
 */
export function oralIdentityKey(target, resolveOpts = {}) {
  const r = resolveOralTarget(target, resolveOpts);
  return r.ep ? `ep:${r.ep}` : r.node ? `node:${r.node}` : `name:${norm(r.name)}`;
}

/** 条目身份键：只认写时落盘的解析结果（ep → node → 名字），消费端不重新解析——裸名稳定留「未定位」。 */
export function misconceptionIdentity(entry) {
  if (entry.ep) return `ep:${entry.ep}`;
  if (entry.node) return `node:${entry.node}`;
  return `name:${norm(entry.name ?? entry.target)}`;
}

/** 口述流水按身份键分组（状态派生与复测入选共用的同一套键）。 */
export function groupAttemptsByIdentity(attempts = [], resolveOpts = {}) {
  const map = new Map();
  for (const a of attempts) {
    const key = oralIdentityKey(a.target, resolveOpts);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(a);
  }
  return map;
}

/** 根因键：diagnosis.text 规范化（复发时写入口径要求一字不差沿用原文），缺省回退 observed.text。 */
function rootCauseKey(entry) {
  return norm(entry.diagnosis ? entry.diagnosis.text : entry.observed.text);
}

/**
 * 派生每条条目的生命周期状态（纯函数，零 LLM；不改写输入——返回浅拷贝带派生 status）。
 * 三态口径见文件头注：recurred（同身份同根因再现）> corrected（后续口述最近一次答对）> open。
 * 条目身份只认落盘归属；口述流水的身份用同一套 resolveOralTarget 现算（与
 * groupOralAttempts 分桶同参——EP 前缀/裸名命中/映射反查到同一 EP 的口述与条目自然同键）。
 * @param {Array<object>} entries parseMisconceptions 的 entries（已按主题过滤）
 * @param {Array<object>} attempts 口述流水（主题包 ∪ progress 回流并流后的唯一真源）
 * @param {object} [resolveOpts] { epNames, graphMap, graphNodes }（口述流水目标解析用，同 groupOralAttempts）
 * @returns {Array<object>} 条目浅拷贝 + 派生 status
 */
export function deriveMisconceptionStatuses(entries = [], attempts = [], resolveOpts = {}) {
  const attemptsByIdentity = groupAttemptsByIdentity(attempts, resolveOpts);
  const identities = entries.map((e) => misconceptionIdentity(e));
  return entries.map((e, i) => {
    const key = identities[i];
    const at = e.observed.at;
    const cause = rootCauseKey(e);
    const recurredSibling = entries.some((o, j) => j !== i
      && identities[j] === key
      && rootCauseKey(o) === cause
      && o.observed.at > at);
    if (recurredSibling) return { ...e, status: 'recurred' };
    const later = (attemptsByIdentity.get(key) || []).filter((a) => a.at > at);
    const latest = later.length ? later.reduce((m, a) => (a.at >= m.at ? a : m)) : null;
    if (latest && latest.correct) return { ...e, status: 'corrected' };
    return { ...e, status: 'open' };
  });
}

/**
 * 台账消费视图（mastery-report / 探测快照消费）：去重（防手编重复条目虚增计数）+
 * 按 EP / 图节点 / 未定位三桶分组 + 状态计数。条目形状瘦身（theme/target 原文保留可指认）。
 * 分桶只认落盘归属：ep 非空 → EP 桶（含 via=ep/name）；node 非空 → 节点桶；其余
 * （含 via=null 裸名与缺归属残条）→ 未定位桶，按名字聚合、不猜归属。
 * @param {Array<object>} derived deriveMisconceptionStatuses 的产物
 * @returns {{ total: number, open: number, corrected: number, recurred: number,
 *             byEp: object, byNode: object, unlocated: Array<object> }}
 */
export function misconceptionView(derived = []) {
  const seen = new Set();
  const rows = [];
  for (const e of derived) {
    const key = entryDupKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(e);
  }
  const shape = (e) => {
    const out = {
      target: e.target,
      name: e.name ?? norm(e.target),
      via: e.via ?? null,
      ep: e.ep ?? null,
      node: e.node ?? null,
      status: e.status,
      observed: { ...e.observed },
      diagnosis: e.diagnosis ? { ...e.diagnosis } : null,
    };
    if (e.questionId) out.questionId = e.questionId;
    return out;
  };
  const byEp = {};
  const byNode = {};
  const unlocated = [];
  for (const e of rows) {
    const row = shape(e);
    if (e.ep) (byEp[e.ep] ??= []).push(row);
    else if (e.node) (byNode[e.node] ??= []).push(row);
    else unlocated.push(row);
  }
  const count = (s) => rows.filter((e) => e.status === s).length;
  return { total: rows.length, open: count('open'), corrected: count('corrected'), recurred: count('recurred'), byEp, byNode, unlocated };
}

// ── 装载器（唯一 IO；坏文件 = 空台账，不拖垮消费方——读端静默降级，写端才拒覆盖） ──

/** 台账文件在主题包内的固定路径（学习者私有，随 study/records/ 不上站不提交）。 */
export function misconceptionsPath(themeDir) {
  return join(themeDir, 'study', 'records', 'misconceptions.json');
}

/**
 * 读台账并按主题过滤（读端隔离：文件住主题包已分目录，条目 theme 再冗余一道——两个
 * 主题的同号 EP（如各有 EP-03）不串用）。条目缺 theme 宽容视为当前主题（同口述回流口径）。
 * 文件不存在 / 坏 JSON / 条目残缺 → 空台账（消费端字段静默缺席，不是故障）。
 * @param {string} themeDir 主题目录（仓库内 examples/<name> 或外部主题包路径）
 * @param {string} theme 主题名（外部主题包 = 目录 basename）
 * @returns {Array<object>}
 */
export function readMisconceptions(themeDir, theme) {
  const p = misconceptionsPath(themeDir);
  if (!existsSync(p)) return [];
  try {
    const { entries } = parseMisconceptions(readFileSync(p, 'utf-8'));
    return entries.filter((e) => e.theme === undefined || e.theme === null || e.theme === theme);
  } catch {
    return [];
  }
}
