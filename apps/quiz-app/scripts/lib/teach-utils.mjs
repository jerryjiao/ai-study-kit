/**
 * teach-utils.mjs — teach-generate.mjs 的纯函数工具集（可单测）。
 *
 * 把不调 LLM 的逻辑拎出来：slugify、escapeHTML、wrapLessonHTML、
 * 校验 course-spec、构建 prompt 等。
 */

/** HTML 转义。 */
export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * 把中文/英文混合的标题转成文件名 slug。
 * 保留中文（文件系统支持），空格/点/·转 -，去特殊符号，限长 40。
 */
export function slugify(s) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[\s\·\.]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
    || 'lesson';
}

/**
 * 校验 course-spec 必填字段。
 * @param {object} spec
 * @returns {{ ok: true, spec: object } | { ok: false, missing: string[] }}
 */
export function validateCourseSpec(spec) {
  const required = ['theme', 'mission', 'audience', 'depth'];
  const missing = required.filter((f) => !spec[f]);
  if (missing.length > 0) return { ok: false, missing };
  const validDepths = ['beginner', 'intermediate', 'advanced'];
  if (!validDepths.includes(spec.depth)) {
    return { ok: false, missing: [`depth (must be one of: ${validDepths.join('/')})`] };
  }
  return { ok: true, spec };
}

/**
 * 把 LLM 产的 <main> 内容包成完整 HTML 文档。
 * @param {object} params
 * @param {string} params.mainContent  LLM 返回的 <main>...</main> 内容（或纯正文）
 * @param {string} params.title        课程标题（已 escape）
 * @param {number} params.lessonNum    当前课次（1-based）
 * @param {number} params.total        总课数
 * @param {string} [params.prevFile]   上一课文件名（可选）
 * @param {string} [params.nextFile]   下一课文件名（可选）
 * @param {string} [params.nextTitle]  下一课标题（可选）
 */
export function wrapLessonHTML({ mainContent, title, lessonNum, total, prevFile, nextFile, nextTitle }) {
  const prevLink = prevFile
    ? `<a href="${prevFile}">← 上一课</a>　·　`
    : '';
  const nextLink = (nextFile && nextTitle)
    ? `　·　下一课：<a href="${nextFile}">${escapeHTML(nextTitle)}</a>`
    : '';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(title)}</title>
<link rel="stylesheet" href="../assets/styles.css">
</head>
<body>
<main>
<h1>${escapeHTML(title)}</h1>
<p class="meta">${prevLink}ai-study-kit 自动生成课程${nextLink}</p>

${mainContent.trim()}

<footer>
<p>💡 本课由 ai-study-kit 的 <code>teach-generate.mjs</code> 自动生成。如有不清楚的地方，可以让 AI 助手进一步讲解。</p>
</footer>
</main>
</body>
</html>
`;
}

/**
 * 构建"生成大纲"的 LLM prompt。
 * 抽出便于单测 prompt 结构。
 */
export function buildOutlinePrompt(spec, lessonsCount) {
  const resourcesBlock = (spec.resources || [])
    .map((r, i) => `  ${i + 1}. ${r.title}${r.url ? ` (${r.url})` : ''}`)
    .join('\n') || '  (无指定资源，请基于你的通用知识拆解)';
  return {
    system: `你是一位资深学习设计师。任务：把一个学习目标拆成 ${lessonsCount} 节课的递进大纲。

⚠️ **关键约束**：必须返回正好 ${lessonsCount} 个主题。不要多也不要少。如果你觉得 ${lessonsCount} 节太少，就把每节涵盖的内容做大（一节可以讲多个相关概念），但**总数必须是 ${lessonsCount}**。

输出**严格 JSON**：{ "outline": ["课次1主题", "课次2主题", ...] }
数组长度必须等于 ${lessonsCount}。不要任何额外文字。`,
    user: `学习目标：${spec.mission}
受众：${spec.audience}
深度：${spec.depth}
可用资源：
${resourcesBlock}

请拆成正好 ${lessonsCount} 节课的大纲，每节主题用 4-12 个字描述（如"Hook 基础与 useState"）。
顺序从浅到深，前后节有逻辑衔接。

再次强调：数组长度必须是 ${lessonsCount}，不能多。`,
  };
}

/**
 * 容错处理 LLM 返回的 outline：长度不匹配时取前 N 个或补齐。
 * @param {string[]} outline  LLM 返回的大纲
 * @param {number} expected   期望长度
 * @returns {string[]}  长度 === expected 的数组
 */
export function normalizeOutline(outline, expected) {
  if (!Array.isArray(outline)) {
    throw new Error(`outline 不是数组：${typeof outline}`);
  }
  const strs = outline.map(String);
  if (strs.length === expected) return strs;
  if (strs.length > expected) {
    // LLM 多产了，取前 N 个
    return strs.slice(0, expected);
  }
  // LLM 少产了，补齐占位
  while (strs.length < expected) {
    strs.push(`第 ${strs.length + 1} 课`);
  }
  return strs;
}
