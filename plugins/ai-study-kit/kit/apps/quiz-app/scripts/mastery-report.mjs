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
 * 口头四态（v0.14）：--json 的 oral 字段输出每个口头目标（题库考点 ∪ 流水裸知识点）的
 * 四态与「问 N 对 M」统计——近期加权正确率（近 5 次权重 0.5/0.7/0.85/0.95/1.0）+
 * 置信度封顶（1 次封 0.5、2 次封 0.8），零 LLM；无流水目标 = 未开始。
 * 既有考点四态判据（v1.1 题+闪卡双通道）一字不动。
 *
 * 进度来源：--progress 指定的文件，默认 apps/quiz-app/progress.json（本地文件口径；
 * 要看线上进度先 `curl -sf $SERVER/api/progress -o /tmp/p.json` 再传进来，与 skill state.md 同模式）。
 * 文件不存在 = 空进度（全部 untouched），不是故障。
 *
 * --panorama（v0.13）：考点全景图——每考点三信号（讲过=契约二学习记录 ∪ 课已学完 /
 * 练过=有答题或口头问答 / 掌握=四态判据不变），按排布表 day 分组 + 汇总行。
 * 学习记录来自 study/records/*.md（契约二，parseSessionRecord 解析）；口头信号 v0.14 起
 * 以口头答题流水 study/records/oral-attempts.json 为唯一真源（旧记录手写计数节照读合并）。
 * records 与流水都是学习者私有不上站，本命令在本地读它们派生信号。
 * 消费方：skill「报进度」全景卡、web 覆盖快照（同判据）。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';
import { epNameMap, epDayMap, masteryByExamPoint, rankWeakness } from './lib/mastery.mjs';
import { buildPanorama } from './lib/panorama.mjs';
import { readSessionRecords, lessonsReadState } from './lib/coverage.mjs';
import { readOralAttempts, groupOralAttempts, oralMastery, rankOralWeakness, oralAttemptsPath, graphNodeIndex } from './lib/oral.mjs';
import { loadGraphMap, loadKnowledgeGraph, buildProjection, projectionPathFor, buildPrereqSignals, orderEpsByPrereqs } from './lib/graph-bridge.mjs';

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
// 投影桥（v0.14，ADR-0005）：knowflow 图位置以参数/环境变量传入（同进度文件模式）；
// --write-projection 现算后产出只读投影文件（默认落 graph.json 同目录 mastery-projection.json）。
const GRAPH_PATH = take('--graph') || process.env.KNOWFLOW_GRAPH_JSON || null;
const WRITE_PROJECTION = args.includes('--write-projection');

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

// 口头答题流水（v0.14，可选）：口头计数的唯一真源（旧记录手写计数节的合并展示走 --panorama）。
// 本报告给每个口头目标（题库考点 ∪ 流水里出现过的裸知识点）判口头四态——
// 近期加权正确率 + 置信度封顶，范式照搬 DeepTutor compute_mastery，确定性零 LLM；
// 既有考点四态判据（v1.1）一字不动，两通道合流规则见 lib/oral.mjs mergeMastery。
const oralAttempts = readOralAttempts(THEME_DIR);

// ── 考点全景（--panorama，v0.13）：三信号 + day 分组，与掌握报告同数据源另派生一路 ──
if (AS_PANORAMA) {
  // 契约二学习记录 + 课已学完：与 sync-examples 的覆盖快照共用同一组装载器
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
      epNames, epDays: epDayMap(missionText), records, oralAttempts,
      coursesRead: { lessonsTotal, lessonsDone },
    }),
  };

  if (AS_JSON) {
    console.log(JSON.stringify(panorama, null, 2));
  } else {
    const s = panorama.summary;
    const flag = (b) => (b ? '✓' : '·');
    console.log(`🗺️ 考点全景 · ${THEME}`);
    console.log(`   进度源：${panorama.progressSource} · 记录 ${records.length} 份 · 口头流水 ${oralAttempts.length} 条 · 课已学完 ${lessonsDone}/${lessonsTotal}${panorama.courseTaughtAll ? '（课程通道：全部考点记讲过）' : ''}`);
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

// 投影桥（v0.14，ADR-0005）：knowflow 图 + 考点节点映射 → 只读投影（节点四态供图着色）。
// 图与映射缺任一即静默降级为纯考点口径（graph.loaded = false），绝不报错——
// 没装 knowflow 的用户看不到任何变化。映射文件学习者私有（不上站不提交，ADR-0002）。
const graphMap = loadGraphMap(THEME_DIR);
const graph = loadKnowledgeGraph(GRAPH_PATH);
const graphNodes = graphNodeIndex(graph);

// 口头四态（v0.14）：排布表全部考点（无流水 = 未开始）∪ 流水里的裸知识点（无题新知识）。
// EP 目标的 status 是纯口头通道判据；与题库四态的合流（负面证据优先）在消费方做（mergeMastery）。
// 解析链带图节点直引（graphNodes）——图节点路径/label 引用的问答归节点桶，不冒充裸名。
const oralGroups = groupOralAttempts(oralAttempts, { epNames, graphMap, graphNodes: graphNodes ?? undefined });
const oralTargets = [
  ...Object.entries(epNames).map(([ep, name]) => {
    const m = oralMastery(oralGroups.byEp.get(ep) ?? []);
    return { target: ep, kind: 'ep', name, ep, node: null, ...m };
  }),
  ...[...oralGroups.byName.keys()].map((name) => {
    const m = oralMastery(oralGroups.byName.get(name));
    return { target: name, kind: 'name', name, ep: null, node: null, ...m };
  }),
];
const oralWeak = rankOralWeakness(oralTargets);

// 投影构建（graphMap / graph / graphNodes 已在上面装载）
let graphSignal = { loaded: false, path: GRAPH_PATH || '(未传 --graph / KNOWFLOW_GRAPH_JSON)', note: '无图数据，功能静默降级为纯考点口径' };
let projectionResult = null;
if (graph) {
  const pkgVer = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8')).version;
  const projection = buildProjection({
    graph, graphMap, points, oralAttempts, epNames,
    generatedAt: new Date().toISOString(),
    source: `ai-study-kit mastery v${pkgVer}`,
  });
  graphSignal = {
    loaded: true,
    path: GRAPH_PATH,
    nodeCount: graph.nodes.length,
    edgeCount: graph.edges.length,
    mappedCount: graphMap ? graph.nodes.filter((n) => graphMap.byNode.has(n.id)).length : 0,
    hasGraphMap: !!graphMap,
    nodes: projection.nodes,   // 节点四态 + 口头统计（agent 探测消费）
  };
  // 前置关系信号（v0.14）：弱项的前置链 + 尊重前置顺序的推荐序
  // （推荐理由从「刷 EP-12」具体到「前置概念 X 还弱，先补它」；无图/无映射 = 无此字段，静默降级）
  const prereq = buildPrereqSignals({ graph, graphMap, points });
  if (prereq) {
    graphSignal.prereqEdges = prereq.prereqEdges;
    graphSignal.relatedEdges = prereq.relatedEdges;
    graphSignal.weakPrereqs = Object.fromEntries(
      weak.filter((p) => prereq.chainByEp.has(p.ep)).map((p) => [p.ep, prereq.chainByEp.get(p.ep)])
    );
    graphSignal.weakOrdered = orderEpsByPrereqs(weak.map((p) => p.ep), prereq.prereqByEp);
  }
  if (WRITE_PROJECTION) {
    const outPath = projectionPathFor(GRAPH_PATH);
    writeFileSync(outPath, JSON.stringify(projection, null, 2) + '\n');
    projectionResult = { written: true, path: outPath, generatedAt: projection.generatedAt, source: projection.source };
  }
}

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
  oral: {
    source: existsSync(oralAttemptsPath(THEME_DIR)) ? oralAttemptsPath(THEME_DIR) : '(无流水，口头目标全部未开始)',
    askedTotal: oralAttempts.length,
    targets: oralTargets,
    weakRanked: oralWeak.map((t) => t.target),
  },
  graph: { ...graphSignal, projection: projectionResult },
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
  if (oralTargets.length) {
    console.log('');
    console.log(`  🗣️ 口头抽背（流水 ${oralAttempts.length} 条 · 口径：近 5 次加权 + 置信度封顶）`);
    for (const t of oralTargets) {
      const score = t.score === null ? '' : ` · 加权 ${t.score}`;
      console.log(`    ${mark[t.status]}  ${t.kind === 'ep' ? `${t.ep} ${t.name}` : `${t.name}（无题知识点）`}：问 ${t.asked} 对 ${t.correct}${score}`);
    }
    if (oralWeak.length) {
      console.log(`  👉 口头弱项：${oralWeak.slice(0, 3).map((t) => (t.kind === 'ep' ? `${t.ep} ${t.name}` : t.name)).join('、')}`);
    }
  }
  if (graphSignal.loaded) {
    const prereqNote = graphSignal.prereqEdges !== undefined ? ` · 前置边 ${graphSignal.prereqEdges}` : '';
    const orderNote = graphSignal.weakOrdered && graphSignal.weakOrdered.length && weak.length >= 2
      ? `\n  👉 推荐序（前置先学）：${graphSignal.weakOrdered.slice(0, 5).join(' → ')}`
      : '';
    console.log('');
    console.log(`  🕸️ 知识图：${graphSignal.nodeCount} 节点 · ${graphSignal.edgeCount} 边 · 映射 ${graphSignal.mappedCount}${prereqNote}${projectionResult ? ` · 投影已产出 ${projectionResult.path}` : '（加 --write-projection 产出投影文件）'}${orderNote}`);
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
