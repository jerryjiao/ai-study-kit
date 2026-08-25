#!/usr/bin/env node
/**
 * teach-generate.mjs — 从主题规格生成多节课程 HTML。
 *
 * 输入：examples/<theme>/course-spec.json
 *   {
 *     "theme": "react-basics",
 *     "mission": "学完能独立写一个 React 组件库",
 *     "resources": [{ "title": "React 官方文档", "url": "..." }, ...],
 *     "audience": "有 JS 基础、第一次学 React 的开发者",
 *     "depth": "beginner" | "intermediate" | "advanced",
 *     "lessonsCount": 3,
 *     "outline": ["Hooks 基础", "状态管理", "组件设计"]   // 可选，不填让 LLM 自己拆
 *   }
 *
 * 输出：examples/<theme>/lessons/0001-<slug>.html, 0002-<slug>.html ...
 *
 * 用法：
 *   node apps/quiz-app/scripts/teach-generate.mjs                       # 默认 dev-intro
 *   node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics
 *   node apps/quiz-app/scripts/teach-generate.mjs --theme D:/x/theme/react-basics   # 外部主题包路径
 *   node apps/quiz-app/scripts/teach-generate.mjs --theme react-basics --lessons 5
 *   node apps/quiz-app/scripts/teach-generate.mjs --lang en            # 课程用英语产（zh/en/es/ru）
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, requireLlmConfig } from './lib/llm.mjs';
import { slugify, validateCourseSpec, wrapLessonHTML, buildOutlinePrompt, normalizeOutline } from './lib/teach-utils.mjs';
import { resolveLang, langConf } from './lib/langs.mjs';
import { resolveThemeDir } from './lib/theme-path.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const themeIdx = args.indexOf('--theme');
// --theme 支持仓库内主题名或外部主题包路径（含分隔符），见 lib/theme-path.mjs
const { dir: THEME_DIR, name: THEME } = resolveThemeDir(
  themeIdx >= 0 ? args[themeIdx + 1] : (process.env.EXAMPLE_THEME || 'dev-intro'),
  resolve(__dirname, '..', '..', '..')
);
const lessonsIdx = args.indexOf('--lessons');
const LESSONS_OVERRIDE = lessonsIdx >= 0 ? parseInt(args[lessonsIdx + 1], 10) : null;
const langIdx = args.indexOf('--lang');
// 输出语言：--lang 优先，其次 STUDY_LANG 环境变量，默认 zh。只影响生成内容，CLI 日志仍中文。
let LANG = 'zh';
try {
  LANG = resolveLang(langIdx >= 0 ? args[langIdx + 1] : undefined, process.env.STUDY_LANG);
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  // 加载并校验 course-spec（仓库内 examples/<theme>/ 或外部主题包目录）
  const specPath = join(THEME_DIR, 'course-spec.json');
  if (!existsSync(specPath)) {
    console.error(`❌ 找不到 course-spec.json：${specPath}`);
    console.error('');
    console.error('请在主题目录（examples/<theme>/ 或外部主题包）下创建 course-spec.json，schema 见 docs/ai-cli-guide.md');
    console.error('或参考 examples/dev-intro/course-spec.json');
    process.exit(1);
  }
  const spec = JSON.parse(readFileSync(specPath, 'utf-8'));
  const v = validateCourseSpec(spec);
  if (!v.ok) {
    console.error(`❌ course-spec.json 校验失败，缺字段：${v.missing.join(', ')}`);
    process.exit(1);
  }

  const lessonsCount = LESSONS_OVERRIDE || spec.lessonsCount || 3;
  console.log(`📚 teach-generate`);
  console.log(`   主题：${spec.theme || THEME}`);
  console.log(`   目标：${spec.mission}`);
  console.log(`   受众：${spec.audience}`);
  console.log(`   深度：${spec.depth}`);
  console.log(`   课程数：${lessonsCount}`);
  console.log(`   资源数：${spec.resources?.length || 0}`);
  console.log(`   语言：${langConf(LANG).native}（--lang ${LANG}）`);
  console.log('');

  // 触发配置校验（缺配置会清晰退出）
  requireLlmConfig();

  // 生成大纲（如果 spec 没给完整 outline，让 LLM 先拆）
  let outline = spec.outline;
  if (!outline || outline.length !== lessonsCount) {
    console.log('🤖 生成课程大纲...');
    outline = await generateOutline(spec, lessonsCount, LANG);
    console.log(`   大纲：${outline.join(' / ')}`);
    console.log('');
  }

  // 准备输出目录
  const lessonsDir = join(THEME_DIR, 'lessons');
  mkdirSync(lessonsDir, { recursive: true });

  // 预先算好所有文件名（用于 prev/next 链接）
  const fileMeta = outline.map((topic, i) => ({
    topic,
    num: i + 1,
    file: `${String(i + 1).padStart(4, '0')}-${slugify(topic)}.html`,
  }));

  // 逐节生成课程
  for (let i = 0; i < outline.length; i++) {
    const meta = fileMeta[i];
    const prev = i > 0 ? fileMeta[i - 1] : null;
    const next = i < outline.length - 1 ? fileMeta[i + 1] : null;
    console.log(`📝 [${meta.num}/${outline.length}] 生成「${meta.topic}」...`);

    const mainContent = await generateLessonMain({ spec, topic: meta.topic, lessonNum: meta.num, total: outline.length, outline, lang: LANG });
    const html = wrapLessonHTML({
      mainContent,
      title: `第 ${meta.num} 课 · ${meta.topic}`,
      lessonNum: meta.num,
      total: outline.length,
      prevFile: prev?.file,
      nextFile: next?.file,
      nextTitle: next?.topic,
      lang: LANG,
    });
    writeFileSync(join(lessonsDir, meta.file), html, 'utf-8');
    console.log(`   ✓ ${meta.file}`);
  }

  console.log('');
  console.log(`✅ 共生成 ${outline.length} 节课程到 examples/${THEME}/lessons/`);
  console.log('');
  console.log('下一步：');
  console.log(`  pnpm dev                                        # 看效果（自动 sync 到 public/study/）`);
  console.log(`  node apps/quiz-app/scripts/sync-study.mjs       # 手动同步`);
  console.log(`  改 examples/${THEME}/questions.json 的 topic/day 对齐课程（四对齐）`);
}

// ═══════════════════════════════════════════════════════════
// LLM 调用函数（不可单测，但依赖 chat() 的稳定性）
// ═══════════════════════════════════════════════════════════

async function generateOutline(spec, lessonsCount, lang) {
  const p = buildOutlinePrompt(spec, lessonsCount, lang);
  const r = await chat(
    [{ role: 'system', content: p.system }, { role: 'user', content: p.user }],
    { jsonMode: true, temperature: 0.7 }
  );
  let parsed;
  try {
    parsed = JSON.parse(r);
  } catch (e) {
    throw new Error(`LLM 大纲输出不是合法 JSON：${r.slice(0, 200)}`);
  }
  if (!parsed.outline || !Array.isArray(parsed.outline)) {
    throw new Error(`LLM 大纲输出格式错误：期望 { outline: [...] }，收到：${r.slice(0, 200)}`);
  }
  return normalizeOutline(parsed.outline, lessonsCount);
}

async function generateLessonMain({ spec, topic, lessonNum, total, outline, lang = 'zh' }) {
  const conf = langConf(lang);
  const resourcesBlock = (spec.resources || [])
    .map((r) => `- ${r.title}${r.url ? ` (${r.url})` : ''}`)
    .join('\n') || '(无指定资源)';
  const outlineBlock = outline.map((t, i) => `  第 ${i + 1} 课：${t}`).join('\n');

  const messages = [
    {
      role: 'system',
      content: `你是一位优秀的讲师，擅长把复杂概念讲清楚。任务：写一节 HTML 课程内容。

## 输出语言
${conf.directive}

## 输出格式
**只返回 HTML 片段，不要 <main> 标签**（我会用模板包 <main>）。
不要包含 <!DOCTYPE>/<html>/<head>/<body>/<main>——只返回正文的 <h2>/<p>/<ul>/<table>/<div> 等。
第一行直接从 <h2> 开始（不要重复 <h1>，标题由模板负责）。

## 内容要求
- 围绕"${topic}"这个主题讲透
- 至少 3 个二级标题（<h2>），从概念到实践层层递进
- 重点用 <div class="callout"> 高亮（核心结论）
- 易错点用 <div class="callout callout-warn"> 高亮
- 实用技巧用 <div class="callout callout-tip"> 高亮
- 代码或命令用 <pre><code>...</code></pre> 包裹
- 对照/比较用 <div class="compare"><div><h4>A</h4><p>...</p></div><div><h4>B</h4><p>...</p></div></div>
- 表格用标准 <table><thead><tbody>
- 末尾加 <div class="quiz-anchor">对应考点关键词列表</div> 标注本课对应的核心考点（用于四对齐校验）
- 长度：800-1500 字之间（非中文按同等信息量折算）
- 风格：口语化、有具体例子、避免空洞术语堆砌

## 风格参考
- 读者：${spec.audience}
- 深度：${spec.depth}
- 引用资源用 <a href="...">资源名</a>，但不要堆砌外链

直接开始写正文 HTML 片段（从 <h2> 开始），不要任何前后解释。`,
    },
    {
      role: 'user',
      content: `学习目标（整门课）：${spec.mission}

本课在整门课的位置：
${outlineBlock}

当前要写的是第 ${lessonNum} 课：${topic}

可用资源：
${resourcesBlock}

请写第 ${lessonNum} 课（共 ${total} 课）的 HTML 正文片段。`,
    },
  ];

  // LLM 偶尔会无视指令加 <main> 或 <h1>，做后处理剥离
  let raw = await chat(messages, { temperature: 0.7 });
  raw = raw
    .replace(/^\s*<main[^>]*>\s*/i, '')
    .replace(/\s*<\/main>\s*$/i, '')
    .replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/is, '');  // 去掉开头的 <h1>
  return raw;
}

main().catch((err) => {
  console.error(`❌ 失败：${err.message}`);
  if (err.cause) console.error(`   原因：${err.cause.message || err.cause}`);
  process.exit(1);
});
