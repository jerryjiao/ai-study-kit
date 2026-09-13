#!/usr/bin/env node
/**
 * mastery-report.mjs — 考点掌握报告（无 AI，纯确定性派生；人与 agent 共用）。
 *
 * 从主题题库 + 答题进度派生每个考点（EP-NN）的掌握度，并 join 学习者档案
 * （study/records/profile.json，grill 串讲顺产的错因记录，存在才带上）。
 *
 * 判据（v1，题维度）：mastered = 考点下题全答对且无未毕业错题；详见 lib/mastery.mjs 头注。
 *
 * 用法：
 *   node apps/quiz-app/scripts/mastery-report.mjs                    # 默认 dev-intro，人类可读
 *   node apps/quiz-app/scripts/mastery-report.mjs --theme X          # 指定主题（支持外部主题包路径）
 *   node apps/quiz-app/scripts/mastery-report.mjs --json             # 机器可读（agent 探测用）
 *   node apps/quiz-app/scripts/mastery-report.mjs --progress /tmp/p.json   # 指定进度文件
 *
 * 进度来源：--progress 指定的文件，默认 apps/quiz-app/progress.json（本地文件口径；
 * 要看线上进度先 `curl -sf $SERVER/api/progress -o /tmp/p.json` 再传进来，与 skill state.md 同模式）。
 * 文件不存在 = 空进度（全部 untouched），不是故障。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { epNameMap, masteryByExamPoint, rankWeakness } from './lib/mastery.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const take = (flag) => {
  const i = args.indexOf(flag);
  return i >= 0 ? args[i + 1] : undefined;
};
const { dir: THEME_DIR, name: THEME } = resolveThemeDir(
  take('--theme') || process.env.EXAMPLE_THEME || 'dev-intro',
  REPO_ROOT
);
const AS_JSON = args.includes('--json');
const PROGRESS_PATH = take('--progress') || join(REPO_ROOT, 'apps', 'quiz-app', 'progress.json');

// ── 数据装载 ──────────────────────────────────────────────
const questionsPath = join(THEME_DIR, 'questions.json');
if (!existsSync(questionsPath)) {
  console.error(`❌ 找不到题库：${questionsPath}`);
  process.exit(1);
}
const questions = JSON.parse(readFileSync(questionsPath, 'utf-8'));

const missionPath = join(THEME_DIR, 'MISSION.md');
const epNames = existsSync(missionPath) ? epNameMap(readFileSync(missionPath, 'utf-8')) : {};

let progress = null;
if (existsSync(PROGRESS_PATH) && PROGRESS_PATH) {
  try { progress = JSON.parse(readFileSync(PROGRESS_PATH, 'utf-8')); } catch { progress = null; }
}
const answers = (progress && progress.answers) || {};

// 学习者档案（可选）：按 questionIds 与考点求交，把 grill 记下的错因/建议贴到对应考点
const profilePath = join(THEME_DIR, 'study', 'records', 'profile.json');
let profile = null;
if (existsSync(profilePath)) {
  try { profile = JSON.parse(readFileSync(profilePath, 'utf-8')); } catch { profile = null; }
}

// ── 派生 ──────────────────────────────────────────────────
const { points, untracked } = masteryByExamPoint({ questions, answers, epNames });
const weak = rankWeakness(points);
const byStatus = (s) => points.filter((p) => p.status === s).length;

const joinProfile = (p) => {
  if (!profile || !Array.isArray(profile.examPoints)) return undefined;
  const hit = profile.examPoints.find((e) =>
    (e.questionIds || []).some((id) => p.questionIds.includes(id))
  );
  if (!hit) return undefined;
  return { wrongReasons: hit.wrongReasons || [], advice: hit.advice || '', timesGrilled: hit.timesGrilled || 1 };
};

const report = {
  theme: THEME,
  generatedAt: new Date().toISOString(),
  progressSource: existsSync(PROGRESS_PATH) ? PROGRESS_PATH : '(空进度，全部 untouched)',
  summary: {
    totalQuestions: questions.length,
    examPoints: points.length,
    mastered: byStatus('mastered'),
    weak: byStatus('weak'),
    inProgress: byStatus('inProgress'),
    untouched: byStatus('untouched'),
    untrackedQuestions: untracked,
  },
  points: points.map((p) => ({ ...p, profile: joinProfile(p) })),
  weakRanked: weak.map((p) => p.ep),
  globalPatterns: (profile && profile.globalPatterns) || [],
};

// ── 输出 ──────────────────────────────────────────────────
if (AS_JSON) {
  console.log(JSON.stringify(report, null, 2));
} else {
  const mark = { mastered: '✅ 掌握', weak: '⚠️  弱', inProgress: '… 进行中', untouched: '· 未开始' };
  console.log(`📊 考点掌握报告 · ${THEME}`);
  console.log(`   进度源：${report.progressSource}`);
  console.log(`   总览：考点 ${points.length} 个 · 掌握 ${report.summary.mastered} · 弱 ${report.summary.weak} · 进行中 ${report.summary.inProgress} · 未开始 ${report.summary.untouched}${untracked ? `（${untracked} 题无考点标记未计入）` : ''}`);
  console.log('');
  for (const p of points) {
    const wrong = p.openWrongIds.length ? `，未毕业错题 ${p.openWrongIds.length}（${p.openWrongIds.join(',')}）` : '';
    console.log(`  ${mark[p.status]}  ${p.ep} ${p.name}：${p.correctNow}/${p.total} 对${wrong}`);
    if (p.profile && p.profile.wrongReasons.length) {
      console.log(`        档案错因：${p.profile.wrongReasons.join('；')}${p.profile.advice ? `（建议：${p.profile.advice}）` : ''}`);
    }
  }
  if (report.globalPatterns.length) {
    console.log('');
    console.log(`  🧭 全局模式：${report.globalPatterns.join('；')}`);
  }
  if (weak.length) {
    console.log('');
    console.log(`  👉 最该先补：${weak.slice(0, 3).map((p) => `${p.ep} ${p.name}`).join('、')}`);
  }
}
