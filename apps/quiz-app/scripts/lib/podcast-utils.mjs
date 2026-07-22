/**
 * podcast-utils.mjs — podcast-generate.mjs 的纯函数工具集（可单测）。
 *
 * 处理：输入源解析、对话脚本 schema 校验、逐字稿渲染、文件名生成、prompt 构建。
 */

/** HTML 转义。 */
export function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

/**
 * 解析输入文件，提取"可读文本"喂给 LLM 作为素材。
 *
 * 支持：
 *   - .html / .htm：去标签，保留文本
 *   - .md：原样返回
 *   - .json：questions.json 特判，每题格式化为"题干+选项+答案"
 *   - .txt：原样返回
 *
 * @param {string} filePath
 * @param {string} content  文件内容
 * @returns {{ sourceText: string, sourceTitle: string, sourceType: string }}
 */
export function parseInputSource(filePath, content) {
  const ext = filePath.toLowerCase().match(/\.([^.]+)$/)?.[1] || '';
  const basename = filePath.split('/').pop() || filePath;

  if (ext === 'html' || ext === 'htm') {
    const titleMatch = content.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1] : basename;
    // 去标签，保留文本，合并空白
    const text = content
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n\s*\n/g, '\n\n')
      .trim();
    return { sourceText: text, sourceTitle: title, sourceType: 'html' };
  }

  if (ext === 'json') {
    // questions.json 特判
    try {
      const data = JSON.parse(content);
      if (Array.isArray(data) && data[0]?.question) {
        const text = data.map((q, i) => {
          const opts = typeof q.options === 'object'
            ? Object.entries(q.options).map(([k, v]) => `    ${k}. ${v}`).join('\n')
            : `    ${q.options}`;
          const ans = Array.isArray(q.answer) ? q.answer.join(',') : q.answer;
          const analysis = q.analysis ? `\n    解析：${q.analysis}` : '';
          return `${i + 1}. [${q.id}] ${q.question}\n${opts}\n    答案：${ans}${analysis}`;
        }).join('\n\n');
        return {
          sourceText: text,
          sourceTitle: basename,
          sourceType: 'questions.json',
        };
      }
    } catch { /* 不是合法 JSON，按原文处理 */ }
    return { sourceText: content, sourceTitle: basename, sourceType: 'json' };
  }

  // md / txt / 其他：原样
  return { sourceText: content, sourceTitle: basename, sourceType: ext || 'text' };
}

/**
 * 校验对话脚本 schema。
 *
 * @param {any} script
 * @returns {{ ok: true, script: Array } | { ok: false, error: string }}
 */
export function validateDialogScript(script) {
  if (!Array.isArray(script)) {
    return { ok: false, error: `script 不是数组（收到 ${typeof script}）` };
  }
  if (script.length === 0) {
    return { ok: false, error: 'script 是空数组' };
  }
  for (let i = 0; i < script.length; i++) {
    const seg = script[i];
    if (!seg || typeof seg !== 'object') {
      return { ok: false, error: `script[${i}] 不是对象` };
    }
    if (!['male', 'female'].includes(seg.speaker)) {
      return { ok: false, error: `script[${i}].speaker 必须是 'male' 或 'female'（收到 ${seg.speaker}）` };
    }
    if (typeof seg.text !== 'string' || !seg.text.trim()) {
      return { ok: false, error: `script[${i}].text 必须是非空字符串` };
    }
  }
  return { ok: true, script };
}

/**
 * 把对话脚本渲染为逐字稿 Markdown。
 *
 * @param {Array<{speaker: string, text: string}>} script
 * @param {string} title
 * @returns {string}
 */
export function renderTranscript(script, title) {
  const lines = [`# ${title}`, '', ''];
  for (const seg of script) {
    const name = seg.speaker === 'female' ? '👩 女主播' : '👨 男主播';
    lines.push(`**${name}**：${seg.text}`, '');
  }
  return lines.join('\n');
}

/** 把主题/标题转成 podcast-out/ 文件名 slug。 */
export function podcastSlug(s) {
  return String(s)
    .trim()
    .toLowerCase()
    .replace(/[\s\·\.]+/g, '-')
    .replace(/[^\p{L}\p{N}-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'podcast';
}

/**
 * 构建"生成对话脚本"的 LLM prompt。
 *
 * @param {string} sourceText  学习素材文本
 * @param {string} sourceTitle  素材标题（播客标题用）
 * @param {object} [opts]
 * @param {number} [opts.targetSegments=12]   目标对话段数
 * @param {string} [opts.style='conversational']  风格：conversational / lecture / interview
 */
export function buildPodcastPrompt(sourceText, sourceTitle, opts = {}) {
  const { targetSegments = 12, style = 'conversational' } = opts;
  const styleHint = {
    conversational: '两人轻松对话，互相补充、提问、举例，像朋友聊天',
    lecture: '一位主播主讲，另一位补充提问和总结',
    interview: '一位扮演专家，另一位扮演采访者问问题',
  }[style] || '两人轻松对话';

  return {
    system: `你是一位资深的播客编剧。任务：把学习素材改编成男女双主播的对话脚本。

## 输出格式
严格 JSON，不要 markdown 代码块，不要解释：
{
  "title": "本期标题（10-20 字，吸引人）",
  "script": [
    { "speaker": "female", "text": "..." },
    { "speaker": "male", "text": "..." },
    ...
  ]
}

## 规则
- 共 ${targetSegments} 段左右（可以 ±3）
- speaker 严格交替 female / male
- 每段 30-150 字（一句话或一小段话）
- 风格：${styleHint}
- 开头要有"欢迎来到 XX 播客"之类的引入
- 中间要覆盖素材的核心知识点（用口语化方式讲，不要照念原文）
- 结尾要有总结和"下期再见"
- 不要在 text 里写"主持人："或"男："之类的角色标签——speaker 字段已经标了`,
    user: `素材标题：${sourceTitle}

素材内容：
${sourceText.slice(0, 6000)}  ${sourceText.length > 6000 ? '\n...(素材过长，已截断)' : ''}

请把这份素材改编成 ${targetSegments} 段的男女双主播对话脚本。`,
  };
}
