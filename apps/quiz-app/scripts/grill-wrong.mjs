#!/usr/bin/env node
/**
 * grill-wrong.mjs — 从用户答题进度生成错题精讲。
 *
 * 流程：
 *   1. 从 /api/progress 拉错题（SERVER 环境变量指定后端地址）
 *   2. joinWrongQuestions：把错题 id 关联 questions.json 拿到完整题干
 *   3. LLM 聚类：按考点把错题分簇
 *   4. 每簇 LLM 产深度精讲 HTML
 *   5. 写到 examples/<theme>/wrong-questions/cluster-NN-*.html + 更新 index.html
 *
 * 用法：
 *   node apps/quiz-app/scripts/grill-wrong.mjs                       # 默认 dev-intro
 *   node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics
 *   node apps/quiz-app/scripts/grill-wrong.mjs --theme X --max-clusters 5
 *   SERVER=http://my-server:8787 node apps/quiz-app/scripts/grill-wrong.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, chatJson, requireLlmConfig } from './lib/llm.mjs';
import {
  extractWrongAnswers, joinWrongQuestions, buildClusterPrompt,
  buildClusterGrillPrompt, wrapClusterHTML, wrapIndexHTML, clusterFileName,
} from './lib/grill-utils.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const themeIdx = args.indexOf('--theme');
const THEME = themeIdx >= 0 ? args[themeIdx + 1] : (process.env.EXAMPLE_THEME || 'dev-intro');
const maxClustersIdx = args.indexOf('--max-clusters');
const MAX_CLUSTERS = maxClustersIdx >= 0 ? parseInt(args[maxClustersIdx + 1], 10) : 5;
const SERVER = process.env.SERVER || 'http://localhost:8787';

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  requireLlmConfig();

  console.log('🔥 grill-wrong');
  console.log(`   主题：${THEME}`);
  console.log(`   后端：${SERVER}`);
  console.log(`   最多分 ${MAX_CLUSTERS} 簇`);
  console.log('');

  // 1. 拉进度
  console.log('📡 拉取答题进度...');
  const progress = await fetchProgress(SERVER);
  const wrong = extractWrongAnswers(progress);
  console.log(`   错题数：${wrong.length}`);
  if (wrong.length === 0) {
    console.log('');
    console.log('✅ 当前没有错题，无需生成精讲。');
    console.log('   多刷几道题、答错几道后再跑本脚本。');
    return;
  }

  // 2. 关联题库
  const questionsPath = join(REPO_ROOT, 'examples', THEME, 'questions.json');
  if (!existsSync(questionsPath)) {
    console.error(`❌ 找不到题库：${questionsPath}`);
    process.exit(1);
  }
  const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
  const wrongWithQ = joinWrongQuestions(wrong, questions);
  console.log(`   关联题库后有效错题：${wrongWithQ.length}（${wrong.length - wrongWithQ.length} 道题库已移除）`);
  if (wrongWithQ.length === 0) {
    console.log('   所有错题都已不在当前题库，无需精讲。');
    return;
  }
  console.log('');

  // 3. 读课程（用于精讲参照）
  const lessons = loadLessonSnippets(THEME);
  if (lessons.length) {
    console.log(`📚 加载了 ${lessons.length} 节课程作为精讲参照`);
  }

  // 4. LLM 聚类
  console.log('🤖 LLM 聚类错题...');
  const clusters = await clusterWrong(wrongWithQ, MAX_CLUSTERS);
  console.log(`   分成 ${clusters.length} 簇：`);
  clusters.forEach((c, i) => {
    console.log(`     ${i + 1}. ${c.topic}（${c.ids.length} 题）`);
  });
  console.log('');

  // 5. 准备输出目录（清掉旧 cluster-*.html，避免新旧混淆）
  const outDir = join(REPO_ROOT, 'examples', THEME, 'wrong-questions');
  mkdirSync(outDir, { recursive: true });
  for (const old of readdirSync(outDir)) {
    if (old.startsWith('cluster-') && old.endsWith('.html')) {
      unlinkSync(join(outDir, old));
    }
  }

  // 6. 逐簇生成精讲
  const indexEntries = [];
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const file = clusterFileName(i + 1, c.topic);
    console.log(`📝 [${i + 1}/${clusters.length}] 生成「${c.topic}」精讲...`);
    const mainHTML = await generateClusterContent(c, wrongWithQ, lessons);
    const html = wrapClusterHTML({
      mainContent: mainHTML,
      topic: c.topic,
      ids: c.ids,
      lessonLinks: findRelevantLessons(c.topic, lessons),
    });
    writeFileSync(join(outDir, file), html, 'utf-8');
    console.log(`   ✓ ${file}`);
    indexEntries.push({ topic: c.topic, file, count: c.ids.length });
  }

  // 7. 写 index.html
  const indexPath = join(outDir, 'index.html');
  writeFileSync(indexPath, wrapIndexHTML(indexEntries, THEME), 'utf-8');
  console.log(`   ✓ index.html`);

  console.log('');
  console.log(`✅ 共生成 ${clusters.length} 篇精讲到 examples/${THEME}/wrong-questions/`);
  console.log('');
  console.log('下一步：');
  console.log(`  pnpm dev                                        # 看效果`);
  console.log(`  node apps/quiz-app/scripts/sync-study.mjs       # 同步到 public/study/`);
}

// ═══════════════════════════════════════════════════════════
// 函数
// ═══════════════════════════════════════════════════════════

/** 从后端拉 progress。 */
async function fetchProgress(server) {
  try {
    const r = await fetch(`${server}/api/progress`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } catch (e) {
    console.error(`❌ 拉取进度失败：${e.message}`);
    console.error(`   检查后端是否启动：pnpm run server`);
    console.error(`   或改 SERVER 环境变量指向你的服务器`);
    process.exit(1);
  }
}

/** 加载课程 HTML 摘要（前 500 字符作 snippet）。 */
function loadLessonSnippets(theme) {
  const dir = join(REPO_ROOT, 'examples', theme, 'lessons');
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith('.html'))
    .map((file) => {
      const content = readFileSync(join(dir, file), 'utf-8');
      const titleMatch = content.match(/<title>([^<]+)<\/title>/);
      return {
        file,
        title: titleMatch ? titleMatch[1] : file,
        snippet: content.slice(0, 500).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(),
      };
    });
}

/** 找与簇主题相关的课程（粗暴按关键词命中）。 */
function findRelevantLessons(topic, lessons) {
  const keywords = topic.toLowerCase().split(/[\s·,，]+/).filter(Boolean);
  return lessons
    .filter((l) => {
      const blob = (l.title + ' ' + l.snippet).toLowerCase();
      return keywords.some((k) => blob.includes(k));
    })
    .slice(0, 2);  // 最多关联 2 节课
}

/** LLM 聚类。 */
async function clusterWrong(wrongWithQ, maxClusters) {
  const p = buildClusterPrompt(wrongWithQ, maxClusters);
  const parsed = await chatJson(
    [{ role: 'system', content: p.system }, { role: 'user', content: p.user }],
    { temperature: 0.3 }
  );
  if (!parsed.clusters || !Array.isArray(parsed.clusters)) {
    throw new Error(`LLM 聚类输出格式错误：期望 { clusters: [...] }，收到：${JSON.stringify(parsed).slice(0, 200)}`);
  }
  // 校验所有 id 都在错题列表里
  const validIds = new Set(wrongWithQ.map((w) => w.id));
  return parsed.clusters
    .filter((c) => c.ids && c.ids.length > 0)
    .map((c) => ({
      topic: String(c.topic || '未命名考点'),
      ids: c.ids.filter((id) => validIds.has(id)),
    }))
    .filter((c) => c.ids.length > 0);
}

/** LLM 生成单簇精讲。 */
async function generateClusterContent(cluster, wrongWithQ, lessons) {
  const p = buildClusterGrillPrompt(cluster, wrongWithQ, lessons);
  let raw = await chat(
    [{ role: 'system', content: p.system }, { role: 'user', content: p.user }],
    { temperature: 0.7 }
  );
  // 后处理：去 LLM 偶尔加的 <main>/<h1>
  raw = raw
    .replace(/^\s*<main[^>]*>\s*/i, '')
    .replace(/\s*<\/main>\s*$/i, '')
    .replace(/^\s*<h1[^>]*>.*?<\/h1>\s*/is, '');
  return raw;
}

main().catch((err) => {
  console.error(`❌ 失败：${err.message}`);
  if (err.cause) console.error(`   原因：${err.cause.message || err.cause}`);
  process.exit(1);
});
