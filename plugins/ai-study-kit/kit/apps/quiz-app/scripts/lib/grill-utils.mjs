/**
 * grill-utils.mjs — grill-wrong.mjs 的纯函数工具集（可单测）。
 *
 * 处理：错题筛选、聚类准备、HTML 包装、prompt 构建。
 */
import { langConf } from './langs.mjs';

/** HTML 转义（与 teach-utils 一致，但保持模块独立避免循环依赖）。 */
export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * 从 progress.answers 提取错题记录（按 streak < 阈值判定）。
 *
 * 阈值规则（与 src/lib/progress.ts 的 streakToPass 一致）：
 *   - wrongCount 未定义或 ≤ 1：threshold = 1（答对 1 次就移出）
 *   - wrongCount = 2：threshold = 2
 *   - wrongCount ≥ 3：threshold = 3
 *
 * @param {object} progress  /api/progress 返回的 progress 对象
 * @returns {Array<{ id: string, record: object }>}  错题列表
 */
export function extractWrongAnswers(progress) {
  if (!progress || !progress.answers) return [];
  return Object.entries(progress.answers)
    .filter(([, r]) => !isDeleted(r))
    .filter(([, r]) => isWrong(r))
    .map(([id, record]) => ({ id, record }));
}

/** 判断记录是否被墓碑标记删除（与 src/lib/progress.ts isAnswerDeleted 一致：
 *  任何 deletedAt 字段存在 = 已删，不比较时间戳——时间戳比较由 mergeProgress 在
 *  写入端处理，读端只需要看 deletedAt 是否存在）。
 */
function isDeleted(r) {
  return !!r && r.deletedAt !== undefined;
}

/** 判断记录是否仍是错题（streak 未达阈值）。 */
function isWrong(r) {
  if (!r || r.streak === undefined) return false;
  const threshold = streakToPass(r.wrongCount ?? 1);
  return r.streak < threshold;
}

/** 错题毕业阈值（与 src/lib/progress.ts 一致）。 */
function streakToPass(wrongCount) {
  if (wrongCount <= 1) return 1;
  if (wrongCount === 2) return 2;
  return 3;
}

/**
 * 把错题 id 列表与 questions.json 结合，返回完整错题对象（带题干/选项/正确答案）。
 *
 * @param {Array<{id, record}>} wrongList   extractWrongAnswers 的输出
 * @param {Array} questions                   questions.json 全题库
 * @returns {Array<{ id, record, question }>}  错题+对应题目（找不到题的过滤掉）
 */
export function joinWrongQuestions(wrongList, questions) {
  const qById = new Map(questions.map((q) => [q.id, q]));
  return wrongList
    .map((w) => ({ ...w, question: qById.get(w.id) }))
    .filter((w) => w.question);  // 找不到对应题目的（题库已更新）跳过
}

/**
 * 让 LLM 把错题按考点聚类。
 *
 * @param {Array} wrongWithQ  joinWrongQuestions 的输出
 * @param {number} maxClusters  最多分多少簇（默认 5）
 * @param {string} [lang='zh']  聚类 topic（考点名）的输出语言
 * @returns {Array<{ topic: string, ids: string[] }>}  聚类结果
 */
export function buildClusterPrompt(wrongWithQ, maxClusters = 5, lang = 'zh') {
  const conf = langConf(lang);
  const wrongBlock = wrongWithQ
    .map((w, i) => {
      const q = w.question;
      const opts = typeof q.options === 'object'
        ? Object.entries(q.options).map(([k, v]) => `    ${k}. ${v}`).join('\n')
        : `    ${q.options}`;
      const ans = Array.isArray(q.answer) ? q.answer.join(',') : q.answer;
      const userAns = Array.isArray(w.record.selected) ? w.record.selected.join(',') : '(未答)';
      const wrongCount = w.record.wrongCount ?? 1;
      return `  ${i + 1}. [${q.id}] (错 ${wrongCount} 次，用户选 ${userAns}，正确 ${ans})
    题干：${q.question}
    选项：
${opts}`;
    })
    .join('\n');

  return {
    system: `你是一位学习诊断专家。任务：把用户的错题按考点聚类分组。

## 输出语言
${conf.directive}（题干/选项保持原样，只翻译你的输出——clusters 的 topic 字段）

## 输出格式
严格 JSON，不要 markdown 代码块，不要任何解释：
{
  "clusters": [
    { "topic": "考点名称（4-12 字）", "ids": ["题id1", "题id2"] },
    ...
  ]
}

## 规则
- 最多 ${maxClusters} 簇（少了可以，多了不行）
- 每簇至少 1 道题（单题也可成簇，但优先合并相似考点）
- 簇的 topic 用具体考点名（如"git reset vs revert"，不是"git"）
- 所有错题 id 都要分配到某个簇，不能漏
- 同一道题不能出现在多个簇`,
    user: `用户的错题列表（共 ${wrongWithQ.length} 道）：
${wrongBlock}

请按考点聚类，输出 JSON。`,
  };
}

/**
 * 构建单簇精讲的 LLM prompt。
 *
 * @param {object} cluster  { topic, ids }
 * @param {Array} wrongWithQ  完整错题列表
 * @param {Array} lessons  课程 HTML 内容列表（提供考点参照）
 * @param {string} [lang='zh']  精讲正文的输出语言
 */
export function buildClusterGrillPrompt(cluster, wrongWithQ, lessons = [], lang = 'zh') {
  const conf = langConf(lang);
  const clusterQs = cluster.ids
    .map((id) => wrongWithQ.find((w) => w.id === id))
    .filter(Boolean);

  const wrongBlock = clusterQs
    .map((w) => {
      const q = w.question;
      const opts = typeof q.options === 'object'
        ? Object.entries(q.options).map(([k, v]) => `    ${k}. ${v}`).join('\n')
        : `    ${q.options}`;
      const ans = Array.isArray(q.answer) ? q.answer.join(',') : q.answer;
      const userAns = Array.isArray(w.record.selected) ? w.record.selected.join(',') : '(未答)';
      return `[${q.id}] 题干：${q.question}
  选项：
${opts}
  用户选：${userAns}　正确答案：${ans}
  用户已累计错 ${w.record.wrongCount ?? 1} 次`;
    })
    .join('\n\n');

  const courseContext = lessons.length
    ? `\n相关课程片段（用于参照讲法）：
${lessons.map((l) => `- ${l.file}：${l.snippet}`).join('\n')}`
    : '\n（无可用课程参照）';

  return {
    system: `你是一位学习教练。任务：把一组错题深度展开成一份精讲 HTML。

## 输出语言
${conf.directive}（题干引用保持原样）

## 输出格式
**只返回 HTML 片段**（从 <h2> 开始），不要 <main>/<h1>/<!DOCTYPE>/<html>/<head>/<body>。

## 内容要求（必含）
- **核心区别/概念表**：用 <table> 列维度对比
- **决策流程图**：用 <pre><code> 画 ASCII 决策树/流程图
- **易错警示**：用 <div class="callout callout-warn"> 列每个错根
- **变体训练**：用 <div class="callout"> 列 2-3 道变体题（同考点换个问法）
- **四对齐**：开头加 <div class="quiz-anchor"> 列本簇题 id 和对应考点
- 风格：具体、有例子、避免空洞术语。800-1500 字（非中文按同等信息量折算）。

直接从 <h2> 开始写，不要前后解释。`,
    user: `考点：${cluster.topic}
本簇错题（${clusterQs.length} 道）：
${wrongBlock}
${courseContext}

请写「${cluster.topic}」的错题精讲 HTML 片段。`,
  };
}

/**
 * 把 LLM 产的精讲片段包成完整 HTML 文档。
 * @param {object} params
 * @param {string} [params.lang='zh']  页面固定文案语言 + <html lang>
 */
export function wrapClusterHTML({ mainContent, topic, ids, lessonLinks = [], lang = 'zh' }) {
  const conf = langConf(lang);
  const idList = ids.join('、');
  const lessonBlock = lessonLinks.length
    ? `　·　${conf.ui.relatedLessons}` + lessonLinks.map((l) => `<a href="../lessons/${l.file}">${escapeHTML(l.title)}</a>`).join('、')
    : '';
  return `<!DOCTYPE html>
<html lang="${conf.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${conf.ui.wrongTitle} · ${escapeHTML(topic)}</title>
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
<main>
<h1>${conf.ui.wrongTitle} · ${escapeHTML(topic)}</h1>
<p class="meta">${conf.ui.wrongMetaIds}${escapeHTML(idList)}　·　<a href="index.html">${conf.ui.backToWrongIndex}</a>${lessonBlock}</p>

${mainContent.trim()}

<footer>
<p>${conf.ui.wrongFooter}</p>
</footer>
</main>
</body>
</html>
`;
}

/**
 * 生成错题中心 index.html。
 * @param {Array<{ topic: string, file: string, count: number }>} clusters
 * @param {string} themeName
 * @param {string} [lang='zh']  页面固定文案语言 + <html lang>
 */
export function wrapIndexHTML(clusters, themeName, lang = 'zh') {
  const conf = langConf(lang);
  const cards = clusters
    .map((c) => `      <a class="layer-card" href="${c.file}">
        <div class="row">
          <h3>→ ${escapeHTML(c.topic)}</h3>
          <span class="badge">${conf.ui.indexCount.replace('{n}', c.count)}</span>
        </div>
      </a>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="${conf.htmlLang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${conf.ui.indexTitle} · ${escapeHTML(themeName)}</title>
<link rel="stylesheet" href="../assets/styles.css">
<style>
  .layer-card {
    display: block; border: 1px solid var(--rule); border-radius: 10px;
    padding: 1rem 1.2rem; margin: .8rem 0; text-decoration: none; color: inherit;
    transition: border-color .15s, box-shadow .15s;
  }
  .layer-card:hover { border-color: var(--accent); box-shadow: 0 2px 8px rgba(67,56,202,.08); }
  .layer-card h3 { margin: 0 0 .3rem; font-size: 1.1rem; color: var(--accent); }
  .layer-card .row { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }
  .badge { display: inline-block; padding: .1em .55em; border-radius: 10px;
    font-size: .75rem; font-weight: 600; background: var(--warn-soft); color: var(--warn); }
</style>
</head>
<body>
<main>
<h1>${conf.ui.indexTitle} · ${escapeHTML(themeName)}</h1>
<p class="meta">${conf.ui.indexAuto}　·　<a href="../index.html">${conf.ui.backToCourseHome}</a></p>

<p class="lead">${conf.ui.indexLead}</p>

<h2>${conf.ui.indexH2}</h2>
${cards || `      <p>${conf.ui.indexEmpty}</p>`}

<footer>
<p>${conf.ui.indexFooter}</p>
</footer>
</main>
</body>
</html>
`;
}

/** 生成簇文件名：cluster-NN-<slug>.html。 */
export function clusterFileName(idx, topic) {
  const slug = String(topic)
    .trim()
    .toLowerCase()
    .replace(/[\s\·\.]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .slice(0, 40) || 'cluster';
  return `cluster-${String(idx).padStart(2, '0')}-${slug}.html`;
}
