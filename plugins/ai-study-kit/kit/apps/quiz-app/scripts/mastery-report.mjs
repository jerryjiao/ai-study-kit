#!/usr/bin/env node
/**
 * mastery-report.mjs — 考点掌握报告（无 AI，纯确定性派生；人与 agent 共用）。
 *
 * 从主题题库 + 答题进度派生每个考点（EP-NN）的掌握度，并 join 学习者档案
 * （study/records/profile.json，grill 串讲顺产的错因记录，存在才带上）。
 *
 * 判据（v1.1，题 + 闪卡双通道）：mastered = 考点下题全答对、无未毕业错题，
 * 且映射闪卡（flashcards[].examPoint）全部毕业（SRS phase = review）；详见 lib/mastery.mjs 头注。
 *
 * 用法：
 *   node apps/quiz-app/scripts/mastery-report.mjs                    # 默认 dev-intro，人类可读
 *   node apps/quiz-app/scripts/mastery-report.mjs --theme X          # 指定主题（支持外部主题包路径）
 *   node apps/quiz-app/scripts/mastery-report.mjs --json             # 机器可读（agent 探测用）
 *   node apps/quiz-app/scripts/mastery-report.mjs --progress /tmp/p.json   # 指定进度文件
 *   node apps/quiz-app/scripts/mastery-report.mjs --panorama [--json]      # 考点全景（讲/练/掌三信号，v0.13）
 *
 * 进度来源：--progress 指定的文件，默认 apps/quiz-app/progress.json（本地文件口径；
 * 要看线上进度先 `curl -sf $SERVER/api/progress -o /tmp/p.json` 再传进来，与 skill state.md 同模式）。
 * 文件不存在 = 空进度（全部 untouched），不是故障。
 *
 * --panorama（v0.13）：考点全景图——每考点三信号（讲过=契约二学习记录 ∪ 课已学完 /
 * 练过=有答题或口头题计数 / 掌握=四态判据不变），按排布表 day 分组 + 汇总行。
 * 学习记录来自 study/records/*.md（契约二，parseSessionRecord 解析；records 学习者私有不上站，
 * 本命令在本地读它们派生信号）。消费方：skill「报进度」全景卡、web 覆盖快照（同判据）。
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { epNameMap, epDayMap, masteryByExamPoint, rankWeakness } from './lib/mastery.mjs';
import { buildPanorama } from './lib/panorama.mjs';
import { readSessionRecords, lessonsReadState } from './lib/coverage.mjs';

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
const AS_PANORAMA = args.includes('--panorama');
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
const srs = (progress && progress.srs) || {};

// 闪卡（可选）：examPoint 有映射的卡参与掌握度判据的闪卡毕业组件
const flashcardsPath = join(THEME_DIR, 'flashcards.json');
let flashcards = [];
if (existsSync(flashcardsPath)) {
  try { flashcards = JSON.parse(readFileSync(flashcardsPath, 'utf-8')); } catch { flashcards = []; }
}

// 学习者档案（可选）：按 questionIds 与考点求交，把 grill 记下的错因/建议贴到对应考点
const profilePath = join(THEME_DIR, 'study', 'records', 'profile.json');
let profile = null;
if (existsSync(profilePath)) {
  try { profile = JSON.parse(readFileSync(profilePath, 'utf-8')); } catch { profile = null; }
}

// ── 考点全景（--panorama，v0.13）：三信号 + day 分组，与掌握报告同数据源另派生一路 ──
if (AS_PANORAMA) {
  // 契约二学习记录 + 课已学完：与 sync-examples 的覆盖快照共用同一对装载器（lib/coverage.mjs）
  const records = readSessionRecords(THEME_DIR);
  const { lessonsTotal, lessonsDone } = lessonsReadState(THEME_DIR, THEME, progress);

  const missionText = existsSync(missionPath) ? readFileSync(missionPath, 'utf-8') : '';
  const panorama = {
    tool: 'mastery-panorama',
    theme: THEME,
    generatedAt: new Date().toISOString(),
    progressSource: existsSync(PROGRESS_PATH) ? PROGRESS_PATH : '(空进度，全部未开始)',
    ...buildPanorama({
      questions, answers, srs, flashcards,
      epNames, epDays: epDayMap(missionText), records,
      coursesRead: { lessonsTotal, lessonsDone },
    }),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(panorama, null, 2));
  } else {
    const s = panorama.summary;
    const flag = (b) => (b ? '✓' : '·');
    console.log(`🗺️ 考点全景 · ${THEME}`);
    console.log(`   进度源：${panorama.progressSource} · 记录 ${records.length} 份 · 课已学完 ${lessonsDone}/${lessonsTotal}${panorama.courseTaughtAll ? '（课程通道：全部考点记讲过）' : ''}`);
    console.log(`   总览：已讲 ${s.taught}/${s.examPoints} · 已练 ${s.practiced}/${s.examPoints} · 已掌握 ${s.mastered}/${s.examPoints}`);
    console.log('');
    for (const g of panorama.groups) {
      console.log(`  ${g.day}｜已讲 ${g.summary.taught}/${g.summary.total} · 已练 ${g.summary.practiced}/${g.summary.total} · 已掌握 ${g.summary.mastered}/${g.summary.total}`);
      for (const p of g.points) {
        const oral = p.oral ? ` · 口头 ${p.oral.correct}/${p.oral.asked}` : '';
        const wrong = p.openWrong ? ` · 未毕业错题 ${p.openWrong}` : '';
        console.log(`    ${flag(p.taught)}讲 ${flag(p.practiced)}练 ${flag(p.mastered)}掌  ${p.ep} ${p.name}（答 ${p.answered}/${p.total}${oral}${wrong}）`);
      }
    }
  }
  process.exit(0); // 全景模式到此为止，不输出掌握报告
}

// ── 派生 ──────────────────────────────────────────────────
const { points, untracked } = masteryByExamPoint({ questions, answers, epNames, flashcards, srs });
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
    const flash = p.flashOpenIds.length ? `，闪卡未毕业 ${p.flashOpenIds.length}（${p.flashOpenIds.join(',')}）` : '';
    console.log(`  ${mark[p.status]}  ${p.ep} ${p.name}：${p.correctNow}/${p.total} 对${wrong}${flash}`);
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
