#!/usr/bin/env node
/**
 * grill-wrong.mjs — 从用户答题进度生成错题精讲。
 *
 * 流程：
 *   1. 从 /api/progress 拉错题（SERVER 环境变量指定后端地址）
 *   2. joinWrongQuestions：把错题 id 关联 questions.json 拿到完整题干
 *   3. LLM 聚类：按考点把错题分簇
 *   4. 每簇 LLM 产深度精讲 HTML
 *   5. 写到 examples/<theme>/study/wrong-questions/cluster-NN-*.html + 更新 index.html
 *
 * 用法：
 *   node apps/quiz-app/scripts/grill-wrong.mjs                       # 默认 dev-intro
 *   node apps/quiz-app/scripts/grill-wrong.mjs --theme react-basics
 *   node apps/quiz-app/scripts/grill-wrong.mjs --theme X --max-clusters 5
 *   node apps/quiz-app/scripts/grill-wrong.mjs --lang en             # 精讲用英语产（zh/en/es/ru/ja）
 *   node apps/quiz-app/scripts/grill-wrong.mjs --json                # 机器可读输出（agent 消费）
 *   SERVER=http://my-server:8787 node apps/quiz-app/scripts/grill-wrong.mjs
 *
 * --json 下人读日志走 stderr、stdout 只出一份结果 JSON（簇/产物路径/档案路径）；
 * 无错题等 noop 路径也出 JSON（status: 'noop'），供 agent 管道分支判断。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, renameSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, chatJson, requireLlmConfig } from './lib/llm.mjs';
import {
  extractWrongAnswers, joinWrongQuestions, buildClusterPrompt,
  buildClusterGrillPrompt, wrapClusterHTML, wrapIndexHTML, clusterFileName,
  buildProfilePrompt, mergeProfile,
} from './lib/grill-utils.mjs';
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
  REPO_ROOT
);
const maxClustersIdx = args.indexOf('--max-clusters');
const MAX_CLUSTERS = maxClustersIdx >= 0 ? parseInt(args[maxClustersIdx + 1], 10) : 5;
const SERVER = process.env.SERVER || 'http://localhost:8787';
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
  requireLlmConfig();

  say('🔥 grill-wrong');
  say(`   主题：${THEME}`);
  say(`   后端：${SERVER}`);
  say(`   最多分 ${MAX_CLUSTERS} 簇`);
  say(`   语言：${langConf(LANG).native}（--lang ${LANG}）`);
  say('');

  // 1. 拉进度
  say('📡 拉取答题进度...');
  const progress = await fetchProgress(SERVER);
  const wrong = extractWrongAnswers(progress);
  say(`   错题数：${wrong.length}`);
  if (wrong.length === 0) {
    if (AS_JSON) console.log(JSON.stringify({ tool: 'grill', theme: THEME, status: 'noop', reason: 'no-wrong-questions' }, null, 2));
    else {
      console.log('');
      console.log('✅ 当前没有错题，无需生成精讲。');
      console.log('   多刷几道题、答错几道后再跑本脚本。');
    }
    return;
  }

  // 2. 关联题库
  const questionsPath = join(THEME_DIR, 'questions.json');
  if (!existsSync(questionsPath)) {
    console.error(`❌ 找不到题库：${questionsPath}`);
    process.exit(1);
  }
  const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));
  const wrongWithQ = joinWrongQuestions(wrong, questions);
  say(`   关联题库后有效错题：${wrongWithQ.length}（${wrong.length - wrongWithQ.length} 道题库已移除）`);
  if (wrongWithQ.length === 0) {
    if (AS_JSON) console.log(JSON.stringify({ tool: 'grill', theme: THEME, status: 'noop', reason: 'wrong-questions-not-in-bank' }, null, 2));
    else console.log('   所有错题都已不在当前题库，无需精讲。');
    return;
  }
  say('');

  // 3. 读课程（用于精讲参照）
  const lessons = loadLessonSnippets(THEME_DIR);
  if (lessons.length) {
    say(`📚 加载了 ${lessons.length} 节课程作为精讲参照`);
  }

  // 4. LLM 聚类
  say('🤖 LLM 聚类错题...');
  const clusters = await clusterWrong(wrongWithQ, MAX_CLUSTERS, LANG);
  say(`   分成 ${clusters.length} 簇：`);
  clusters.forEach((c, i) => {
    say(`     ${i + 1}. ${c.topic}（${c.ids.length} 题）`);
  });
  say('');

  // 5. 准备输出目录（备份旧 cluster-*.html 到 .archive/，避免用户手写内容被无声覆盖）
  const outDir = join(THEME_DIR, 'study', 'wrong-questions');
  mkdirSync(outDir, { recursive: true });
  const oldClusters = readdirSync(outDir).filter((f) => f.startsWith('cluster-') && f.endsWith('.html'));
  let archivedTo = null;
  if (oldClusters.length > 0) {
    const backupDir = join(outDir, '.archive', new Date().toISOString().replace(/[:.]/g, '-'));
    mkdirSync(backupDir, { recursive: true });
    for (const old of oldClusters) {
      const src = join(outDir, old);
      const dst = join(backupDir, old);
      renameSync(src, dst);
    }
    archivedTo = backupDir;
    say(`📦 备份了 ${oldClusters.length} 个旧 cluster HTML 到 study/wrong-questions/.archive/`);
  }

  // 6. 逐簇生成精讲
  const indexEntries = [];
  for (let i = 0; i < clusters.length; i++) {
    const c = clusters[i];
    const file = clusterFileName(i + 1, c.topic);
    say(`📝 [${i + 1}/${clusters.length}] 生成「${c.topic}」精讲...`);
    const mainHTML = await generateClusterContent(c, wrongWithQ, lessons, LANG);
    const html = wrapClusterHTML({
      mainContent: mainHTML,
      topic: c.topic,
      ids: c.ids,
      lessonLinks: findRelevantLessons(c.topic, lessons),
      lang: LANG,
    });
    writeFileSync(join(outDir, file), html, 'utf-8');
    say(`   ✓ ${file}`);
    indexEntries.push({ topic: c.topic, file, count: c.ids.length, ids: c.ids });
  }

  // 7. 写 index.html
  const indexPath = join(outDir, 'index.html');
  writeFileSync(indexPath, wrapIndexHTML(indexEntries.map(({ topic, file, count }) => ({ topic, file, count })), THEME, LANG), 'utf-8');
  say(`   ✓ index.html`);

  // 8. 顺产学习者档案（study/records/profile.json，机器可读错因，供 skill 探测/mastery-report 消费）。
  //    best-effort：精讲 HTML 已落盘，档案失败只告警不退出。
  const profilePath = join(THEME_DIR, 'study', 'records', 'profile.json');
  let profileWritten = false;
  try {
    await writeProfile(clusters, wrongWithQ, LANG);
    profileWritten = true;
  } catch (e) {
    console.warn(`⚠ 学习者档案生成失败（不影响已产出的精讲）：${e.message}`);
  }

  // 结果输出：--json 给 agent（stdout 纯 JSON），否则人类可读收尾
  if (AS_JSON) {
    console.log(JSON.stringify({
      tool: 'grill',
      theme: THEME,
      lang: LANG,
      status: 'ok',
      wrongCount: wrong.length,
      effectiveWrongCount: wrongWithQ.length,
      outDir,
      clusters: indexEntries,
      index: indexPath,
      profile: profileWritten ? profilePath : null,
      ...(archivedTo ? { archivedTo } : {}),
    }, null, 2));
    return;
  }
  console.log('');
  console.log(`✅ 共生成 ${clusters.length} 篇精讲到 examples/${THEME}/study/wrong-questions/`);
  console.log('');
  console.log('下一步：');
  console.log(`  pnpm dev                                        # 看效果`);
  console.log(`  node apps/quiz-app/scripts/sync-study.mjs       # 同步到 public/study/`);
  console.log(`  node apps/quiz-app/scripts/mastery-report.mjs --theme ${THEME}  # 看考点掌握报告`);
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

/** 加载课程 HTML 摘要（前 500 字符作 snippet）。theme 传 THEME_DIR（外部主题包同构）。 */
function loadLessonSnippets(theme) {
  const dir = join(theme, 'lessons');
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
async function clusterWrong(wrongWithQ, maxClusters, lang) {
  const p = buildClusterPrompt(wrongWithQ, maxClusters, lang);
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
async function generateClusterContent(cluster, wrongWithQ, lessons, lang) {
  const p = buildClusterGrillPrompt(cluster, wrongWithQ, lessons, lang);
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

/** LLM 提炼档案并合并落盘（学习者私有数据，住 study/records/，不随 sync-study 上站）。 */
async function writeProfile(clusters, wrongWithQ, lang) {
  const p = buildProfilePrompt(clusters, wrongWithQ, lang);
  const fresh = await chatJson(
    [{ role: 'system', content: p.system }, { role: 'user', content: p.user }],
    { temperature: 0.3 }
  );
  if (!Array.isArray(fresh.examPoints)) {
    throw new Error(`LLM 档案输出格式错误：期望 { examPoints: [...] }，收到：${JSON.stringify(fresh).slice(0, 200)}`);
  }

  const profilePath = join(THEME_DIR, 'study', 'records', 'profile.json');
  let existing = null;
  if (existsSync(profilePath)) {
    try { existing = JSON.parse(readFileSync(profilePath, 'utf-8')); } catch { existing = null; }
  }
  const merged = mergeProfile(existing, fresh, { theme: THEME, now: Date.now() });
  mkdirSync(dirname(profilePath), { recursive: true });
  writeFileSync(profilePath, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`👤 学习者档案已更新：study/records/profile.json（考点档案 ${merged.examPoints.length} 条 · 第 ${merged.grillRuns} 次串讲）`);
}

main().catch((err) => {
  console.error(`❌ 失败：${err.message}`);
  if (err.cause) console.error(`   原因：${err.cause.message || err.cause}`);
  process.exit(1);
});
