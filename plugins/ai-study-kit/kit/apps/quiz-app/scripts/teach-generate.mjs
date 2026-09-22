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
 *   node apps/quiz-app/scripts/teach-generate.mjs --lang en            # 课程用英语产（zh/en/es/ru/ja）
 *   node apps/quiz-app/scripts/teach-generate.mjs --json               # 机器可读输出（agent 消费）
 *
 * 资源合并：主题目录有 RESOURCES.md 时解析其链接，与 course-spec.resources 按 URL 去重合并
 * （spec 在前）——既进 LLM 备课参考，也进每课页尾的「出处」回链块（以参考材料建概念）。
 * 参考正文抓取（v0.13）：合并后的链接逐源抓页面正文进备课上下文（内容层，不止引用层）；
 * 本地缓存按 URL 去重（apps/quiz-app/node_modules/.cache/teach-resources/），重跑不重抓；
 * 个别源失败降级回 URL 清单引用，产课不中断（lib/resource-fetch.mjs）。
 * --json 下人读日志走 stderr、stdout 只出一份结果 JSON（产物路径清单），供 agent 管道消费。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, requireLlmConfig } from './lib/llm.mjs';
import {
  slugify, validateCourseSpec, wrapLessonHTML, buildOutlinePrompt, buildLessonPrompt, normalizeOutline,
  parseResourcesMd, mergeResources,
} from './lib/teach-utils.mjs';
import { fetchResources } from './lib/resource-fetch.mjs';
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
// --json：机器可读模式——人读日志降级到 stderr，stdout 只出结果 JSON（与 mastery-report --json 同约定）
const AS_JSON = args.includes('--json');
const say = AS_JSON ? (...a) => console.error(...a) : console.log;

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
  // RESOURCES.md（teach 工作流约定的权威资源清单）存在则并入：URL 去重、spec 在前。
  // 合并结果同时喂给 LLM（备课参考）和页脚出处回链块。
  const resourcesMdPath = join(THEME_DIR, 'RESOURCES.md');
  const resources = existsSync(resourcesMdPath)
    ? mergeResources(spec.resources, parseResourcesMd(readFileSync(resourcesMdPath, 'utf-8')))
    : (spec.resources || []);

  // 参考正文抓取（v0.13）：把链接页面正文抓进备课上下文——「以参考材料建概念」落到内容层。
  // 缓存按 URL 去重（重跑不重抓）；单源失败降级为 URL 清单引用，产课不中断。
  const CACHE_DIR = join(__dirname, '..', 'node_modules', '.cache', 'teach-resources');

  say(`📚 teach-generate`);
  say(`   主题：${spec.theme || THEME}`);
  say(`   目标：${spec.mission}`);
  say(`   受众：${spec.audience}`);
  say(`   深度：${spec.depth}`);
  say(`   课程数：${lessonsCount}`);
  say(`   资源数：${resources.length}${existsSync(resourcesMdPath) ? '（含 RESOURCES.md 合并）' : ''}`);
  const { fetched, failed } = await fetchResources(resources, { cacheDir: CACHE_DIR });
  const cached = fetched.filter((r) => r.fromCache).length;
  if (fetched.length || failed.length) {
    say(`   参考正文：抓到 ${fetched.length} 篇（缓存命中 ${cached}）${failed.length ? ` · 失败 ${failed.length} 篇（降级为 URL 清单）：${failed.map((r) => r.title).join('、')}` : ''}`);
  }
  say(`   语言：${langConf(LANG).native}（--lang ${LANG}）`);
  say('');

  // 备课参考块：抓到正文的按「标题 + 正文」给；失败/未抓的留在 resourcesBlock 的 URL 清单里
  const referenceTextBlock = fetched.length
    ? fetched.map((r) => `### ${r.title}\n（来源：${r.url}）\n${r.text}`).join('\n\n')
    : '';

  // 触发配置校验（缺配置会清晰退出）
  requireLlmConfig();

  // 生成大纲（如果 spec 没给完整 outline，让 LLM 先拆）
  const specWithResources = { ...spec, resources };
  let outline = spec.outline;
  if (!outline || outline.length !== lessonsCount) {
    say('🤖 生成课程大纲...');
    outline = await generateOutline(specWithResources, lessonsCount, LANG);
    say(`   大纲：${outline.join(' / ')}`);
    say('');
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
    say(`📝 [${meta.num}/${outline.length}] 生成「${meta.topic}」...`);

    const mainContent = await generateLessonMain({ spec: specWithResources, topic: meta.topic, lessonNum: meta.num, total: outline.length, outline, lang: LANG, referenceTextBlock });
    const html = wrapLessonHTML({
      mainContent,
      title: `第 ${meta.num} 课 · ${meta.topic}`,
      lessonNum: meta.num,
      total: outline.length,
      prevFile: prev?.file,
      nextFile: next?.file,
      nextTitle: next?.topic,
      lang: LANG,
      sources: resources,
    });
    writeFileSync(join(lessonsDir, meta.file), html, 'utf-8');
    say(`   ✓ ${meta.file}`);
  }

  // 结果输出：--json 给 agent（stdout 纯 JSON），否则人类可读收尾
  const result = {
    tool: 'teach',
    theme: THEME,
    lang: LANG,
    lessonsDir,
    resources: resources.map((r) => r.title),
    resourceFetch: { fetched: fetched.length, cached, failed: failed.map((r) => r.title) },
    lessons: fileMeta.map((m) => ({ num: m.num, topic: m.topic, file: m.file })),
  };
  if (AS_JSON) {
    console.log(JSON.stringify(result, null, 2));
    return;
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

async function generateLessonMain({ spec, topic, lessonNum, total, outline, lang = 'zh', referenceTextBlock = '' }) {
  // prompt 构建在 teach-utils.buildLessonPrompt（纯函数，单测可 dry-run 断言参考正文进 prompt）
  const messages = buildLessonPrompt({ spec, topic, lessonNum, total, outline, lang, referenceTextBlock });

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
