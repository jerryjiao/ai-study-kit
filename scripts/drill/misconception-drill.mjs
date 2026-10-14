#!/usr/bin/env node
// misconception-drill.mjs — #132 口述错因跨会话接续 · 两会话演练（行为级验收面）。
//
// spec #131 / 决议 #130 的验收切分：确定性夹具保数据面（misconceptions.test.mjs 台账纯函数 +
// mastery-report.test.mjs 报告端到端），一次演练保行为面——本脚本即该演练，F13 drill 同模式
// （可重复跑；每次新建临时外部主题包，时间戳全部真实 Date.now()，两会话 = 两次独立命令序列）。
//
// 演练叙事（对照票 #132 验收标准）：
//   会话 1 · 正式站：学习者 EP-03 chmod 口述判错（把 4 说成读权限）→ 教练当场纠偏，
//             站记录「错的点」照写（旧通道不丢），同时台账落条（observed 事实 + diagnosis
//             推断分立、questionId 溯源、source=recall）。
//   会话 1 · 微块：裸知识点「补零权限位」判错 → 台账落条（via=null 未定位；微块零站记录——
//             不被迫建正式站）。另预置一条他主题同号 EP-03 条目（读端隔离用）。
//   会话 2 · 开场读出：state.md §7 探测命令（grep -c '"status"'）照跑 + §3 mastery-report
//             --json —— 台账双源 join（profile 题 id 来源 ∪ 台账口述来源）、未定位桶、
//             他主题同号 EP-03 不串用；v1.2 判据不受台账影响。
//   会话 2 · 接续闭环：学习者答对同目标口述（真实时间）→ 口述流水落判对条 → 重跑报告 →
//             台账条 open → corrected（跨会话证据接续，不凭记录次数制造新成绩）。
//
// 用法：node scripts/drill/misconception-drill.mjs [目录=/tmp/ask-drill-misconception]
// 退出码：全绿 0；任一断言红 1。首跑实录见 scripts/drill/REPORT.md「口述错因跨会话接续演练留档」。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMisconceptionEntry, appendMisconceptions, parseMisconceptions,
} from '../../apps/quiz-app/scripts/lib/misconceptions.mjs';
import { mergeOralAttempts } from '../../apps/quiz-app/scripts/lib/oral.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const REPORT_CLI = join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'mastery-report.mjs');
const DIR = resolve(process.argv[2] || join(tmpdir(), 'ask-drill-misconception'));

const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => { failures.push(name); console.error(`  ❌ ${name}${detail ? `——${detail}` : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

const MISSION = '# 演练主题\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 暂存区 | 掌握 | single×2 | D1 | 0 |\n| EP-03 | chmod | 掌握 | single×2 | D2 | 0 |\n'
  + '| EP-05 | 分支模型 | 掌握 | single×2 | D3 | 0 |\n';

// ── 夹具：临时外部主题包（含路径分隔符 → resolveThemeDir 外部形态；主题名 = 目录 basename） ──
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'study', 'records'), { recursive: true });
writeFileSync(join(DIR, 'MISSION.md'), MISSION);
writeFileSync(join(DIR, 'questions.json'), JSON.stringify([
  { id: 'A1', examPoint: 'EP-01' }, { id: 'A2', examPoint: 'EP-01' },
  { id: 'C1', examPoint: 'EP-03' }, { id: 'C2', examPoint: 'EP-03' },
  { id: 'E1', examPoint: 'EP-05' }, { id: 'E2', examPoint: 'EP-05' },
]));
writeFileSync(join(DIR, 'flashcards.json'), JSON.stringify([]));
// profile.json：题库题 id 来源的档案错因挂 EP-03（双源 join 的另一源；#128：profile 一字不动零迁移）
writeFileSync(join(DIR, 'study', 'records', 'profile.json'), JSON.stringify({
  version: 1, theme: 'x', globalPatterns: [],
  examPoints: [{ name: 'chmod', questionIds: ['C1', 'C2'], wrongReasons: ['权限位组合不熟'], advice: '按 rwx 折算', timesGrilled: 1 }],
}));
const progressPath = join(DIR, 'progress.json');
writeFileSync(progressPath, JSON.stringify({ answers: {}, srs: {} }));
const THEME = DIR.split('/').pop();
const oralPath = join(DIR, 'study', 'records', 'oral-attempts.json');
const misPath = join(DIR, 'study', 'records', 'misconceptions.json');

const epNames = { 'EP-01': '暂存区', 'EP-03': 'chmod', 'EP-05': '分支模型' };
const runReport = () => JSON.parse(execFileSync(
  process.execPath, [REPORT_CLI, '--theme', DIR, '--progress', progressPath, '--json'],
  { encoding: 'utf-8' },
));
const appendOral = (attempt) => {
  const prev = existsSync(oralPath) ? parseOralOr(oralPath) : [];
  writeFileSync(oralPath, JSON.stringify(mergeOralAttempts(prev, [attempt]), null, 2) + '\n');
};
const parseOralOr = (p) => { try { return JSON.parse(readFileSync(p, 'utf-8')); } catch { return []; } };
const appendLedger = (entry) => {
  const prev = existsSync(misPath) ? readFileSync(misPath, 'utf-8') : null;
  const r = appendMisconceptions(prev, entry);
  writeFileSync(misPath, r.text);
  return r;
};

console.log(`[drill] 主题包：${DIR}（theme=${THEME}）`);

// ── 会话 1 · 正式站：判错 → 当场纠 → 台账落条（同时站记录「错的点」照写，旧通道不丢） ──
console.log('[会话 1 · 正式站]');
const t1 = Date.now();
appendOral({ target: 'EP-03 chmod', correct: false, at: t1, source: 'recall' });
writeFileSync(join(DIR, 'study', 'records', '01-perm.md'), [
  '---', 'id: 1', 'topic: chmod 权限', 'mode: quick', 'status: in-progress', '---', '',
  '## 已过考点', '- EP-03 chmod · 金句：「4 是读，2 是写」', '',
  '## 错的点', '- 抽背时把 4 说成读权限反了——已当场纠，变体已补答对', '',
  '## 待办', '- [x] EP-03 chmod', '',
].join('\n'));
const stationEntry = buildMisconceptionEntry({
  theme: THEME, target: 'EP-03 chmod',
  observedText: '把 4 说成读权限', observedAt: t1, observedSource: 'recall',
  diagnosisText: '权限位与八进制对应记反', diagnosisAt: t1,
  questionId: 'C1', resolve: { epNames }, now: Date.now(),
});
const r1 = appendLedger(stationEntry);
check(r1.appended, '台账落条（observed 事实 + diagnosis 推断分立，questionId=C1 溯源，via=ep）');

// ── 会话 1 · 微块：裸知识点判错 → 台账落条；微块零站记录 ──
console.log('[会话 1 · 微块]');
const t2 = Date.now();
appendOral({ target: '补零权限位', correct: false, at: t2, source: 'recite' });
const microEntry = buildMisconceptionEntry({
  theme: THEME, target: '补零权限位',
  observedText: '把 077 说成与 77 同一个权限', observedAt: t2, observedSource: 'recite',
  resolve: { epNames }, now: Date.now(),
});
const r2 = appendLedger(microEntry);
check(r2.appended && microEntry.via === null, '微块错因落条 via=null（裸名永不强归 EP，未定位如实呈现）');
const stationMds = readdirSync(join(DIR, 'study', 'records')).filter((f) => f.endsWith('.md'));
check(stationMds.length === 1 && stationMds[0] === '01-perm.md',
  `微块未被迫建正式站记录（study/records/ 仍只有站记录 1 份：${stationMds.join(',')}）`);
// 预置他主题同号条目（读端隔离用；模拟另一主题包的 EP-03 错因串门企图）
const r3 = appendLedger({ ...stationEntry, theme: 'other-theme', observed: { ...stationEntry.observed, at: t1 + 1 } });
check(r3.appended, '预置他主题同号 EP-03 条目（下步验证读端过滤）');
// 重复提交守卫：同一笔观察重放 → 不追加（不凭记录次数制造新成绩）
const r4 = appendLedger(stationEntry);
check(!r4.appended && r4.deduped, '同一笔观察重复提交去重（append 幂等，计数不虚增）');

// ── 会话 2 · 开场读出：探测 + 报告 ──
console.log('[会话 2 · 开场读出]');
// state.md §7 探测命令原样跑（只读）
const probe = execFileSync('sh', ['-c', `grep -c '"status"' "${misPath}" 2>/dev/null || echo "misconceptions=none"`], { encoding: 'utf-8' }).trim();
check(probe === '3', `§7 探测命令读出台账条数（grep -c = ${probe}）`);
const before = runReport();
const m = before.misconceptions;
check(!!m && m.total === 2, `§3 报告读出台账（total=${m?.total}——他主题同号 EP-03 被读端过滤，不串用）`);
const ep03 = before.points.find((p) => p.ep === 'EP-03');
check(ep03.misconceptions.length === 1 && ep03.misconceptions[0].observed.text === '把 4 说成读权限'
  && ep03.misconceptions[0].diagnosis.text === '权限位与八进制对应记反',
  '开场路径读出同一根因（observed「把 4 说成读权限」与 diagnosis「权限位与八进制对应记反」分开可引）');
check(ep03.misconceptions[0].status === 'open' && ep03.misconceptions[0].questionId === 'C1',
  '状态派生 open（尚无后续答对口述）、题库题溯源保留');
check(ep03.profile && ep03.profile.wrongReasons[0] === '权限位组合不熟',
  '双源 join：profile（题 id 来源）与台账（口述来源）同 EP-03 并存互不覆盖');
check(m.unlocated.length === 1 && m.unlocated[0].name === '补零权限位',
  '未定位桶：微块裸名条目按名字聚合（不归任何 EP）');
const statusesBefore = Object.fromEntries(before.points.map((p) => [p.ep, p.status]));
// v1.2 判据不受台账影响：把台账临时移走重跑，四态必须逐考点一致（口述判错压 weak 是口述通道
// 语义，与台账无关——台账是证据源不是判据输入）
rmSync(`${misPath}.bak`, { force: true });
execFileSync('mv', [misPath, `${misPath}.bak`]);
let statusesNoLedger;
try {
  statusesNoLedger = Object.fromEntries(runReport().points.map((p) => [p.ep, p.status]));
} finally {
  execFileSync('mv', [`${misPath}.bak`, misPath]);
}
check(JSON.stringify(statusesBefore) === JSON.stringify(statusesNoLedger),
  `v1.2 判据不受台账影响（有/无台账四态逐考点一致：${JSON.stringify(statusesBefore)}）`);

// ── 会话 2 · 接续纠偏闭环：答对口述 → 流水落条 → 报告派生 corrected ──
console.log('[会话 2 · 接续闭环]');
const t3 = Date.now();
appendOral({ target: 'EP-03 chmod', correct: true, at: t3, source: 'recall' });
const after = runReport();
const ep03After = after.points.find((p) => p.ep === 'EP-03');
check(ep03After.misconceptions[0].status === 'corrected',
  '新答对口述进流水（真实事件时间）→ 台账条 open → corrected（跨会话证据接续，不重复计成绩）');
check(after.oral.targets.find((t) => t.target === 'EP-03').asked === 2,
  '口述流水两笔（判错 + 判对）——错因与成绩各走各的通道，互不冒充');
// 私有边界：台账不进站点产物（sync-study LOCAL_ONLY 边界——演练目录本身在 /tmp，此断言验证
// 仓库侧同步规则不把 study/records 带上站）
const syncStudy = readFileSync(join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'sync-study.mjs'), 'utf-8');
check(syncStudy.includes("LOCAL_ONLY_DIRS = new Set(['study/records'"),
  'study/records/ 在 sync-study LOCAL_ONLY 边界内（台账不上站）');

console.log(failures.length ? `\n[drill] ❌ ${failures.length} 项红：${failures.join('；')}` : '\n[drill] ✅ 全绿：两会话错因接续闭环走通（判错落条 → 跨会话读出 → 答对派生 corrected）');
process.exit(failures.length ? 1 : 0);
