#!/usr/bin/env node
// legacy-review-drill.mjs — #135 存量主题升级 × 跨会话验收收口 · 行为级演练。
//
// spec #131 / 决议 #130 夹具④（存量降级夹具 + 断言器）的行为面落地：旧项目形态主题包
// （仅 profile + 旧口述流水 + 站记录 + 答题/闪卡/计划数据，**无台账**）在升级到含复习闭环
// （#132-#134）的能力面后逐字断言——复测通道静默零变化、老 profile 零迁移照常按题 id join、
// 台账不上站不提交、零催办文案；再走「升级后首用建立 → 后续独立会话读错因 → 少量复测 →
// 结果写回」的跨会话闭环（#135 验收 AC3/AC4）。kit 重拷升级机制本身由 F13 演练保
// （scripts/drill/make-legacy-fixture.mjs + check-upgrade.mjs，#61/#100）；本演练管数据与
// 行为兼容面——存量主题数据 + 新代码 = 升级后的真实消费形态。
//
// 时间口径（红线同前三场演练）：会话 A（升级后首个真实学习动作）用真实墙钟的昨日整点
// （夹具注入面——跨日边界是 #133 复测判据，注入只存在于夹具）；会话 B 作答与全部落盘时间
// 真实 Date.now()；存量旧数据的时间戳同为真实墙钟偏移（夹具）。
//
// 幕次（对照票 #135 验收标准）：
//   第 0 幕 · 升级后首探测（只读）：misconceptions/retest 字段双双缺席（复测通道静默零变化，
//             旧错答不被倒推成台账/复测——不从旧流水回填）；老 profile 照题 id join；旧口述
//             流水/站记录/作答/闪卡照读；只读探测零建文件（AC1/AC2/AC3）。
//   第 1 幕 · 会话 A（昨日，夹具注入）：口述判错 → 台账**首用建立**（升级不预建，第一次真实
//             判错才落盘）；profile/站记录字节不动（零迁移、不转台账）（AC3）。
//   第 2 幕 · 会话 B（今日，真实时间）：独立会话读出错因与复测候选（observed/diagnosis 分开
//             可引）→ 沿 diagnosis 出变体 → 答对写回口述流水 + 回流 → corrected 派生退场、
//             pick 空候选如实计数；作答/闪卡/计划数据分毫未失；口述不伪造成题库作答（AC1/AC4）。
//   第 3 幕 · 边界（确定且诚实）：损坏台账读端静默降级 + 写端拒覆盖不重置；同号 EP 他主题
//             不串用；三周旧错因仍只是普通候选（无到期清单不堆叠）；跳过零写入零催办；
//             台账不上站（sync-study LOCAL_ONLY）不提交（git check-ignore）（AC5/AC6）。
//
// 用法：node scripts/drill/legacy-review-drill.mjs [目录=/tmp/ask-drill-legacy-review]
// 退出码：全绿 0；任一断言红 1。首跑实录见 scripts/drill/REPORT.md「存量主题升级×跨会话验收收口」。
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMisconceptionEntry, appendMisconceptions, parseMisconceptions, misconceptionsPath,
} from '../../apps/quiz-app/scripts/lib/misconceptions.mjs';
import { mergeOralAttempts } from '../../apps/quiz-app/scripts/lib/oral.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const REPORT_CLI = join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'mastery-report.mjs');
const DIR = resolve(process.argv[2] || join(tmpdir(), 'ask-drill-legacy-review'));

const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => { failures.push(name); console.error(`  ❌ ${name}${detail ? `——${detail}` : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));
const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const MISSION = '# 存量演练主题\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 暂存区 | 掌握 | single×2 | D1 | 1 |\n| EP-03 | chmod | 掌握 | single×2 | D2 | 1 |\n'
  + '| EP-05 | 分支模型 | 掌握 | single×2 | D3 | 0 |\n';

// ── 夹具：旧项目形态外部主题包（无台账；数据形态 = 复习闭环功能落地前的存量主题） ──
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'study', 'records'), { recursive: true });
writeFileSync(join(DIR, 'MISSION.md'), MISSION);
writeFileSync(join(DIR, 'questions.json'), JSON.stringify([
  { id: 'A1', examPoint: 'EP-01' }, { id: 'A2', examPoint: 'EP-01' },
  { id: 'C1', examPoint: 'EP-03' }, { id: 'C2', examPoint: 'EP-03' },
  { id: 'E1', examPoint: 'EP-05' }, { id: 'E2', examPoint: 'EP-05' },
]));
// 闪卡不带 examPoint：存量契约缺口如实保留（F13 点名面——掌握度跑纯题维度，升级不代写）
writeFileSync(join(DIR, 'flashcards.json'), JSON.stringify([
  { id: 'FC-1', front: '暂存区是什么', back: '工作现场的快照' },
  { id: 'FC-2', front: 'chmod 644 的 6 是什么', back: 'rw-（读+写）' },
]));
// 存量答题进度：EP-01 两题已答对（真实墙钟偏移——夹具注入面）；srs 一条（闪卡数据在）
const DAY = 24 * 60 * 60 * 1000;
const yesterdayNoon = (() => { const d = new Date(); d.setHours(12, 0, 0, 0); return d.getTime() - DAY; })();
const threeWeeksAgo = Date.now() - 21 * DAY;
const progressPath = join(DIR, 'progress.json');
const progressBase = {
  answers: { A1: { correct: true, submittedAt: yesterdayNoon }, A2: { correct: true, submittedAt: yesterdayNoon } },
  srs: { 'FC-1': { phase: 'review', due: yesterdayNoon } },
};
writeFileSync(progressPath, JSON.stringify(progressBase));
// 计划数据（学习者私有根级文件——AC1「计划数据不丢」的字节保全对象；mastery-report 不读它）
const planPath = join(DIR, 'plan.json');
writeFileSync(planPath, JSON.stringify({ version: 1, units: [{ ep: 'EP-05', plannedDate: '2026-10-20', done: false }] }, null, 2));
// 老 profile：只有题 id 关联（#128 语义——grill 通道原样，升级零迁移）
writeFileSync(join(DIR, 'study', 'records', 'profile.json'), JSON.stringify({
  version: 1, theme: 'legacy', globalPatterns: [],
  examPoints: [{ name: 'chmod', questionIds: ['C1', 'C2'], wrongReasons: ['权限位组合不熟'], advice: '按 rwx 折算', timesGrilled: 2 }],
}));
// 旧口述流水（v0.26 前形态：条目无 theme 字段；时间 = 夹具注入的真实墙钟偏移）：
//   EP-05 三周前判错一次（长时间中断场景的候选）+ 昨日又判错一次；EP-01 昨日答对一次。
writeFileSync(join(DIR, 'study', 'records', 'oral-attempts.json'), JSON.stringify([
  { target: 'EP-05 分支模型', correct: false, at: threeWeeksAgo, source: 'recite' },
  { target: 'EP-05 分支模型', correct: false, at: yesterdayNoon, source: 'recall' },
  { target: 'EP-01 暂存区', correct: true, at: yesterdayNoon, source: 'recall' },
], null, 2) + '\n');
// 正式站记录（旧通道「错的点」照写照读，不转台账）
writeFileSync(join(DIR, 'study', 'records', '01-branches.md'), [
  '---', 'id: 1', 'topic: 分支模型', 'mode: coach', 'status: in-progress', '---', '',
  '## 已过考点', '- EP-05 分支模型 · 金句：「分支是指针不是副本」', '',
  '## 错的点', '- 把 fast-forward 说成必须先建分支——已当场纠', '',
  '## 待办', '- [ ] EP-05 变体再验', '',
].join('\n'));
// 升级不预建：无 misconceptions.json、无 next-hook.json（F13 第 4 步「首用时自建」惯例）
const THEME = DIR.split('/').pop();
const oralPath = join(DIR, 'study', 'records', 'oral-attempts.json');
const misPath = misconceptionsPath(DIR);
const epNames = { 'EP-01': '暂存区', 'EP-03': 'chmod', 'EP-05': '分支模型' };
const runReport = () => JSON.parse(execFileSync(
  process.execPath, [REPORT_CLI, '--theme', DIR, '--progress', progressPath, '--json'],
  { encoding: 'utf-8' },
));
const runReportText = () => execFileSync(
  process.execPath, [REPORT_CLI, '--theme', DIR, '--progress', progressPath],
  { encoding: 'utf-8' },
);
const appendOral = (attempt) => {
  const prev = existsSync(oralPath) ? parseOralOr(oralPath) : [];
  writeFileSync(oralPath, JSON.stringify(mergeOralAttempts(prev, [attempt]), null, 2) + '\n');
};
const parseOralOr = (p) => { try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return []; } };
const appendLedger = (entry, existingText) => {
  const prev = existingText !== undefined ? existingText : (existsSync(misPath) ? readFileSync(misPath, 'utf-8') : null);
  const r = appendMisconceptions(prev, entry);
  writeFileSync(misPath, r.text);
  return r;
};
const snapshotTree = () => {
  const out = {};
  const walk = (dir, base) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) walk(p, base);
      else out[p.slice(base.length + 1)] = sha256(readFileSync(p));
    }
  };
  walk(join(DIR, 'study'), join(DIR, 'study'));
  return out;
};
const recordsTreeBefore = snapshotTree();
const planSha = sha256(readFileSync(planPath));
const profileSha = sha256(readFileSync(join(DIR, 'study', 'records', 'profile.json')));
const stationSha = sha256(readFileSync(join(DIR, 'study', 'records', '01-branches.md')));
const DEBT_RE = /落后|欠账|该补|债务|催办|逾期/;

console.log(`[drill] 存量主题包（升级前形态，无台账）：${DIR}（theme=${THEME}）`);
check(!existsSync(misPath), '夹具确无台账（存量项目形态——升级不预建 misconceptions.json）');

// ── 第 0 幕 · 升级后首探测（只读）：复测通道静默零变化 + 旧数据照读 + 探测不创建 ──
console.log('[第 0 幕 · 升级后首探测（只读）]');
const p0 = runReport();
check(p0.misconceptions === undefined && p0.retest === undefined,
  '复测通道静默零变化（misconceptions/retest 字段双双缺席——无台账，输出与功能前零变化）');
check(!('misconceptions' in (p0.points.find((p) => p.ep === 'EP-05') || {})),
  '旧错答不被倒推：EP-05 有旧口述判错但无台账 → 无错因条目（不从旧流水回填）');
const ep03p0 = p0.points.find((p) => p.ep === 'EP-03');
check(ep03p0?.profile?.wrongReasons?.[0] === '权限位组合不熟' && ep03p0.questionIds.includes('C1') && ep03p0.questionIds.includes('C2'),
  '老 profile 零迁移照常按题 id join（C1/C2 → EP-03 档案错因贴回）');
const ep05oral0 = p0.oral.targets.find((t) => t.target === 'EP-05');
check(ep05oral0?.asked === 2 && ep05oral0.status === 'weak',
  '旧口述流水照读（EP-05 问 2 对 0，最近判错 → weak——负面证据优先，真实旧成绩不夸大）');
const ep01p0 = p0.points.find((p) => p.ep === 'EP-01');
check(ep01p0.correctNow === 2, '存量作答照读（EP-01 两题答对计入）');
const p0text = runReportText();
check(!DEBT_RE.test(p0text), '报告文本零催办文案（落后/欠账/该补/债务/催办/逾期 零命中）');
const recordsTreeAfterP0 = snapshotTree();
check(JSON.stringify(recordsTreeAfterP0) === JSON.stringify(recordsTreeBefore),
  `只读探测零建文件（study/ 文件集与字节不变：${Object.keys(recordsTreeAfterP0).length} 个）`);

// ── 第 1 幕 · 会话 A（昨日，夹具注入墙钟）：升级后首个真实学习动作 → 台账首用建立 ──
console.log('[第 1 幕 · 会话 A（昨日）——口述判错 → 台账首用建立]');
appendOral({ target: 'EP-05 分支模型', correct: false, at: yesterdayNoon + 60_000, source: 'recite' });
const entryA = buildMisconceptionEntry({
  theme: THEME, target: 'EP-05 分支模型',
  observedText: '把 fast-forward 说成必须先建分支', observedAt: yesterdayNoon + 60_000, observedSource: 'recite',
  diagnosisText: '把「分支图历史」与「工作流惯例」混为一谈', diagnosisAt: yesterdayNoon + 60_000,
  questionId: 'E1', resolve: { epNames }, now: yesterdayNoon + 60_000,
});
const r1 = appendLedger(entryA);
check(r1.appended && existsSync(misPath), '台账首用建立（升级后第一次真实判错才落第一笔——不是升级动作建的）');
const onDisk1 = parseMisconceptions(readFileSync(misPath, 'utf-8'));
check(onDisk1.entries.length === 1 && onDisk1.entries[0].status === 'open' && onDisk1.entries[0].via === 'ep',
  '落盘条目 status=open、via=ep（落盘恒 open，corrected 是消费端派生态）');
check(sha256(readFileSync(join(DIR, 'study', 'records', 'profile.json'))) === profileSha
  && sha256(readFileSync(join(DIR, 'study', 'records', '01-branches.md'))) === stationSha,
  '老 profile 与站记录字节不动（零迁移；站记录「错的点」与台账并存不合并）');

// ── 第 2 幕 · 会话 B（今日，真实时间）：独立会话读错因 → 复测 → 结果写回 ──
console.log('[第 2 幕 · 会话 B（今日）——读错因 → 复测 → 结果写回]');
const probe = execFileSync('sh', ['-c', `grep -c '"status"' "${misPath}" 2>/dev/null || echo "misconceptions=none"`], { encoding: 'utf-8' }).trim();
check(probe === '1', `state.md §7 探测命令读出台账条数（grep -c = ${probe}）`);
const p2 = runReport();
check(p2.misconceptions?.total === 1 && p2.misconceptions.byEp['EP-05']?.length === 1,
  '独立会话经报告读出同一根因（observed 与 diagnosis 分开可引，契约二口径）');
const pick = p2.retest?.pick;
check(pick?.ep === 'EP-05' && pick.oral.status === 'weak' && pick.oral.asked === 3,
  '复测候选派生（三条件：open + 四态 weak + 今日无口述；昨日判错夹具注入、今日真实墙钟）');
check(!!pick?.misconceptions?.[0]?.diagnosis?.text && pick.misconceptions[0].diagnosis.text === '把「分支图历史」与「工作流惯例」混为一谈',
  '出题依据齐备：沿 diagnosis「分支图历史≠工作流惯例」出同根因变体（非原题重放）');
check(p2.retest.candidates.length === 1 && !('dueAt' in (pick || {})) && !('overdue' in (pick || {})),
  '候选无到期/堆叠语义（三周前的旧错因与昨日同池，无 dueAt/overdue 字段——#129 无固定间隔）');
// 复测作答（答对）→ 写回口述流水 + 回流（同四元组写 progress.oralAttempts，与 #122 行为测试同法）
const t2 = Date.now();
appendOral({ target: 'EP-05 分支模型', correct: true, at: t2, source: 'recall' });
const progressNow = JSON.parse(readFileSync(progressPath, 'utf-8'));
progressNow.oralAttempts = mergeOralAttempts(progressNow.oralAttempts || [], [
  { target: 'EP-05 分支模型', correct: true, at: t2, source: 'recall', theme: THEME },
]);
writeFileSync(progressPath, JSON.stringify(progressNow, null, 2) + '\n');
check(progressNow.answers.A1.correct === true && progressNow.answers.A2.correct === true
  && progressNow.srs['FC-1'].phase === 'review'
  && Object.keys(progressNow.answers).length === 2,
  '回流合并后存量作答/闪卡分毫未失（answers/srs 原样，口述不伪造成题库作答——无新 answer id）');
check(progressNow.oralAttempts.length === 1 && progressNow.oralAttempts[0].theme === THEME,
  '回流副本按四元组并流去重（主题包原文 + progress 副本同一笔只计一次，带 theme 归属）');
const p2b = runReport();
const m5 = p2b.points.find((p) => p.ep === 'EP-05');
check(m5.misconceptions[0].status === 'corrected',
  '结果写回 → 消费端派生 corrected（不改写旧条目——历史全留可追溯）');
check(p2b.retest.pick === null && p2b.retest.excluded?.notOpen === 1,
  `答对即退场：pick=null + excluded 如实计数（notOpen=${p2b.retest.excluded?.notOpen}）——历史错误不被说成当前仍错`);
const m5oral = p2b.oral.targets.find((t) => t.target === 'EP-05');
check(m5oral.asked === 4 && m5oral.correct === 1,
  '口头四态按新证据更新（问 4 对 1——判分走真实口述，凭新答案留下证据）');
check(sha256(readFileSync(planPath)) === planSha, '计划数据字节未动（plan.json 全程零写入）');
check(!DEBT_RE.test(runReportText()), '复测闭环全程零催办文案');

// ── 第 3 幕 · 边界（确定且诚实） ──
console.log('[第 3 幕 · 边界场景]');
// (a) 损坏台账：读端静默降级 + 写端拒覆盖（不静默重置学习者数据）
const goodLedger = readFileSync(misPath, 'utf-8');
writeFileSync(misPath, '{"broken":');
const p3a = runReport();
check(p3a.misconceptions === undefined && p3a.retest === undefined,
  '坏台账：misconceptions/retest 字段静默缺席（读端当空台账降级，不进诊断流程）');
check(JSON.stringify(p3a.points.map((p) => p.status)) === JSON.stringify(p2b.points.map((p) => p.status)),
  '坏台账不改变任何考点四态（掌握判据与台账无关——证据源不是判据输入）');
let threw = false;
try { appendMisconceptions('{"broken":', entryA); } catch { threw = true; }
check(threw && readFileSync(misPath, 'utf-8') === '{"broken":',
  '坏台账写端拒覆盖（append 抛错、文件原样——绝不静默重置学习者数据）');
// 留档处置后重开（契约二口径：改名留档 → 重写）
writeFileSync(misPath, goodLedger);
check(parseMisconceptions(readFileSync(misPath, 'utf-8')).entries.length === 1, '留档处置后台账恢复（1 条）');
// (b) 同号 EP 不同主题：他主题条目读端过滤不串用
appendLedger({ ...entryA, theme: 'other-theme', observed: { ...entryA.observed, at: entryA.observed.at + 1 } });
const p3b = runReport();
check(p3b.misconceptions.total === 1 && p3b.misconceptions.byEp['EP-05']?.length === 1,
  '同号 EP 他主题条目不串用（条目 theme 读端过滤——他主题 EP-05 错因不来考我）');
// (c) 跳过零写入：探测后再无动作 = 学习者说「先不复测」——一切照旧
const tree3c = snapshotTree();
runReport();
check(JSON.stringify(snapshotTree()) === JSON.stringify(tree3c), '跳过零写入（探测后无动作，study/ 文件集与字节不变）');
// (d) 私有边界：不上站（sync-study LOCAL_ONLY 源规则）+ 不提交（git check-ignore）
const syncStudy = readFileSync(join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'sync-study.mjs'), 'utf-8');
check(syncStudy.includes("LOCAL_ONLY_DIRS = new Set(['study/records'"), '台账随 study/records/ 在 sync-study LOCAL_ONLY 边界内（不上站）');
let gitIgnored = false;
try { execFileSync('git', ['-C', REPO_ROOT, 'check-ignore', '-q', 'examples/dev-intro/study/records/misconceptions.json']); gitIgnored = true; } catch { /* 未被忽略 → 红 */ }
check(gitIgnored, '台账路径被 git 忽略（不提交——check-ignore 命中 examples/*/study/records/）');

console.log(failures.length ? `\n[drill] ❌ ${failures.length} 项红：${failures.join('；')}` : '\n[drill] ✅ 全绿：存量主题升级 × 跨会话验收收口走通（零变化降级 → 首用建立 → 独立会话复测写回 → 边界确定诚实）');
process.exit(failures.length ? 1 : 0);
