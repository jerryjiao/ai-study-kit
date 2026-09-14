// records.mjs — 契约二学习记录（study/records/<NN>-<slug>.md）解析器（纯函数，无 IO）。
//
// 契约二正文四节（flows.md F10）：已过考点 / 错的点 / 待办 / 口头题计数（v0.13 起可选新增）。
// 兼容原则沿「只报事实、不要求补格式」：旧记录缺计数节或缺 frontmatter 照常解析，字段缺省。
// 消费方：考点全景报告（mastery-report --panorama）的「讲过 / 练过」信号 join 学习记录用。
//
// 解析结果按正文原文返回（考点名可能是 EP-NN 前缀 + 关键词），EP 与名字的 join 由调用方做。

/** 判断一行「已过考点」/「口头题计数」条目的考点前缀：`EP-03 chmod` → { ep:'EP-03', name:'chmod' }。 */
function splitEp(name) {
  const m = name.match(/^(EP-\d+)\s+(.+)$/);
  return m ? { ep: m[1], name: m[2] } : { ep: null, name };
}

/**
 * 解析一份契约二学习记录。
 * @param {string} text 记录文件全文
 * @returns {{
 *   legacy: boolean,            // 无有效 frontmatter = 旧格式（state.md 兼容规则由调用方叠加）
 *   id: number|string|null,     // frontmatter id（数字优先，原样字符串兜底）
 *   topic: string|null,         // frontmatter topic
 *   mode: string|null,          // frontmatter mode（quick/deep/...）
 *   status: string|null,        // frontmatter status（in-progress/done）
 *   passed: Array<{ep: string|null, name: string, golden: string|null}>,   // 已过考点
 *   wrongPoints: string[],      // 错的点（叙述式，逐行原文）
 *   todos: Array<{text: string, done: boolean}>,                            // 待办
 *   oral: Array<{ep: string|null, name: string, asked: number, correct: number}>, // 口头题计数（旧记录缺省 []）
 * }}
 */
export function parseSessionRecord(text) {
  const out = {
    legacy: true, id: null, topic: null, mode: null, status: null,
    passed: [], wrongPoints: [], todos: [], oral: [],
  };
  if (!text) return out;

  // frontmatter：首行必须是 ---，找到闭合 --- 才算有效；未闭合 = 残缺，按旧格式处理（不抛错）
  let body = text;
  if (text.startsWith('---')) {
    const end = text.indexOf('\n---', 3);
    if (end !== -1) {
      const fmText = text.slice(3, end);
      body = text.slice(text.indexOf('\n', end + 1) + 1);
      out.legacy = false;
      for (const line of fmText.split('\n')) {
        const m = line.match(/^([a-zA-Z-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const val = m[2].trim().replace(/^["']|["']$/g, '');
        if (m[1] === 'id') out.id = /^-?\d+$/.test(val) ? Number(val) : (val || null);
        else if (m[1] === 'topic') out.topic = val || null;
        else if (m[1] === 'mode') out.mode = val || null;
        else if (m[1] === 'status') out.status = val || null;
      }
    }
  }

  // 正文按 `## ` 节切分；未识别的节忽略
  const sections = new Map();
  let current = null;
  for (const line of body.split('\n')) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) { current = h[1].trim(); if (!sections.has(current)) sections.set(current, []); continue; }
    if (current && line.trim()) sections.get(current).push(line);
  }

  for (const line of sections.get('已过考点') ?? []) {
    // `- 暂存区 · 金句：「…」` / `- EP-01 暂存区 · 金句：…` / `- 暂存区`（金句可缺省）
    const m = line.match(/^[-*]\s*(.+)$/);
    if (!m) continue;
    const [rawName, rawGolden] = m[1].split(/·\s*金句[：:]/, 2);
    const { ep, name } = splitEp(rawName.trim());
    out.passed.push({
      ep, name,
      golden: rawGolden ? rawGolden.trim().replace(/^[「"]|["」]$/g, '') || null : null,
    });
  }

  for (const line of sections.get('错的点') ?? []) {
    const m = line.match(/^[-*]\s*(.+)$/);
    if (m) out.wrongPoints.push(m[1].trim());
  }

  for (const line of sections.get('待办') ?? []) {
    const m = line.match(/^[-*]\s*\[([ xX])\]\s*(.+)$/);
    if (m) out.todos.push({ text: m[2].trim(), done: m[1].toLowerCase() === 'x' });
  }

  for (const line of sections.get('口头题计数') ?? []) {
    // `- EP-01 状态码家族划分：问 3 对 2` / `- chmod：问3对2`（冒号中英、空格皆可）
    const m = line.match(/^[-*]\s*(.+?)[：:]\s*问\s*(\d+)\s*对\s*(\d+)\s*$/);
    if (!m) continue; // 格式跑偏的行照旧忽略（只报事实，不要求补格式）
    const { ep, name } = splitEp(m[1].trim());
    out.oral.push({ ep, name, asked: Number(m[2]), correct: Number(m[3]) });
  }

  return out;
}
