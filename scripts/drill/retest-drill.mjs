#!/usr/bin/env node
// retest-drill.mjs — #133 隔期复测选择、出题与结果闭环 · 多会话演练（行为级验收面）。
//
// spec #131 / 决议 #130 的验收切分：确定性夹具保数据面（retest.test.mjs 三条件与跨时间边界 +
// mastery-report.test.mjs 报告端到端），一次演练保行为面——本脚本即该演练，#132 演练同模式
// （可重复跑；每次新建临时外部主题包，两会话以上 = 独立命令序列）。
//
// 演练叙事（对照票 #133 验收标准）：
//   会话 1 · 昨天（微块形态，零闪卡）：EP-01/EP-03/EP-05 三考点口述判错 → 台账各落一条
//             （EP-03 带 diagnosis；EP-05 缺省——出题回退 observed；EP-01 供排序/跳过分支）。
//   会话 2 · 今天：学习者说「考考我上次错的」→ 教练跑 mastery-report --json 读 retest 字段 →
//             pick=EP-03（四态最弱排序 + 观察最新 tiebreak），解释依据齐（observed 事实 /
//             diagnosis 推断分开可引）→ 沿 diagnosis 出变体 → 答对 → 口述流水落条 + 模拟
//             POST /api/oral-attempts 回流（progress.oralAttempts 同四元组）→ 重跑报告：
//             corrected 派生、候选退场、回流去重、题库作答面零影响。
//   会话 3 · 今天稍后：pick=EP-05（diagnosis 缺省 → 按 observed 出变体）→ 答错（同根因）→
//             当场纠偏 + 再验 1 题（预算封顶）→ 再验仍错 → 按契约二「复发写法」追加新台账
//             条目（observed 一字不差沿用）→ 重跑：旧条 recurred、新条 open、当天已答退场。
//   会话 4 · 今天：pick=EP-01 → 学习者说「先不复习了」→ 跳过：零写入（台账/流水条数不变、
//             无任何新文件）、零催办；EP-01 留待后续会话。
//   诚实降级：空台账主题 → retest 字段整体缺席（复测通道静默不出现，输出与功能前零变化）。
//
// 时间口径：会话 1 时间 = 真实墙钟的昨日整点（本地日历日夹具注入面——当天/跨日边界是本票
// 判据的一部分，注入只存在于夹具；真实消费 mastery-report 一律 Date.now()，红线同口述流水）；
// 会话 2-4 的作答时间全部真实 Date.now()。
//
// 用法：node scripts/drill/retest-drill.mjs [目录=/tmp/ask-drill-retest]
// 退出码：全绿 0；任一断言红 1。首跑实录见 scripts/drill/REPORT.md「隔期复测闭环演练留档」。
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { appendMisconceptions } from '../../apps/quiz-app/scripts/lib/misconceptions.mjs';
import { mergeOralAttempts } from '../../apps/quiz-app/scripts/lib/oral.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const REPORT_CLI = join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'mastery-report.mjs');
const DIR = resolve(process.argv[2] || join(tmpdir(), 'ask-drill-retest'));

const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => { failures.push(name); console.error(`  ❌ ${name}${detail ? `——${detail}` : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

/** 昨日/今日本地整点（夹具注入面）：以真实墙钟为基，日历日关系任何时区下恒定。 */
const localAt = (dayOffset, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

const MISSION = '# 演练主题\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 暂存区 | 掌握 | single×2 | D1 | 0 |\n| EP-03 | chmod | 掌握 | single×2 | D2 | 0 |\n'
  + '| EP-05 | 分支模型 | 掌握 | single×2 | D3 | 0 |\n';

// ── 夹具：临时外部主题包（零闪卡——flashcards 空、progress.srs 空；含路径分隔符 → 外部形态） ──
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'study', 'records'), { recursive: true });
writeFileSync(join(DIR, 'MISSION.md'), MISSION);
writeFileSync(join(DIR, 'questions.json'), JSON.stringify([
  { id: 'A1', examPoint: 'EP-01' }, { id: 'A2', examPoint: 'EP-01' },
  { id: 'C1', examPoint: 'EP-03' }, { id: 'C2', examPoint: 'EP-03' },
  { id: 'E1', examPoint: 'EP-05' }, { id: 'E2', examPoint: 'EP-05' },
]));
writeFileSync(join(DIR, 'flashcards.json'), JSON.stringify([]));
const THEME = DIR.split('/').pop();
const progressPath = join(DIR, 'progress.json');
writeFileSync(progressPath, JSON.stringify({ answers: {}, srs: {}, oralAttempts: [] }));
const oralPath = join(DIR, 'study', 'records', 'oral-attempts.json');
const misPath = join(DIR, 'study', 'records', 'misconceptions.json');
const epNames = { 'EP-01': '暂存区', 'EP-03': 'chmod', 'EP-05': '分支模型' };

const runReport = () => JSON.parse(execFileSync(
  process.execPath, [REPORT_CLI, '--theme', DIR, '--progress', progressPath, '--json'],
  { encoding: 'utf-8' },
));
/** 真实事件时间（单调去同毫秒）：两笔作答落同一毫秒会被口述流水四元组去重吞掉一笔——真实场景两答必有先后，这里保证它。 */
let lastRealAt = 0;
const realAt = () => {
  let t = Date.now();
  if (t <= lastRealAt) t = lastRealAt + 1;
  lastRealAt = t;
  return t;
};
/** 教练写一笔口述作答：包内流水追加 + 模拟 POST /api/oral-attempts 实时回流（同四元组带 theme）。 */
const answerOral = (attempt) => {
  const prev = existsSync(oralPath) ? readFileSync(oralPath, 'utf-8') : null;
  const pkg = JSON.parse(prev || '[]');
  writeFileSync(oralPath, JSON.stringify(mergeOralAttempts(pkg, [attempt]), null, 2) + '\n');
  const prog = JSON.parse(readFileSync(progressPath, 'utf-8'));
  prog.oralAttempts.push({ theme: THEME, ...attempt });
  writeFileSync(progressPath, JSON.stringify(prog));
};
const appendLedger = (entry) => {
  const prev = existsSync(misPath) ? readFileSync(misPath, 'utf-8') : null;
  const r = appendMisconceptions(prev, entry);
  writeFileSync(misPath, r.text);
  return r;
};
const ledgerCount = () => JSON.parse(readFileSync(misPath, 'utf-8')).length;
const oralCount = () => JSON.parse(readFileSync(oralPath, 'utf-8')).length;

console.log(`[drill] 主题包：${DIR}（theme=${THEME}，零闪卡）`);

// ── 会话 1 · 昨天（微块形态）：三考点判错 → 台账落条 ──
console.log('[会话 1 · 昨天 · 判错落条]');
const t1a = localAt(-1, 9);   // EP-01 最早（排序 tiebreak 殿后）
const t1b = localAt(-1, 10);  // EP-05
const t1c = localAt(-1, 11);  // EP-03 最新 → 会话 2 pick
answerOral({ target: 'EP-01 暂存区', correct: false, at: t1a, source: 'recall' });
answerOral({ target: 'EP-05 分支模型', correct: false, at: t1b, source: 'recite' });
answerOral({ target: 'EP-03 chmod', correct: false, at: t1c, source: 'recall' });
const led1 = appendLedger({
  theme: THEME, target: 'EP-01 暂存区', ep: 'EP-01', node: null, name: '暂存区', via: 'ep',
  observed: { text: '把 add 说成直接提交', at: t1a, source: 'recall' },
  diagnosis: { text: '工作区/暂存区两步模型没分清', at: t1a }, questionId: null, status: 'open',
});
const led2 = appendLedger({
  theme: THEME, target: 'EP-05 分支模型', ep: 'EP-05', node: null, name: '分支模型', via: 'ep',
  observed: { text: '把 fast-forward 说成会丢弃改动', at: t1b, source: 'recite' },
  diagnosis: null, questionId: null, status: 'open',
});
const led3 = appendLedger({
  theme: THEME, target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep',
  observed: { text: '把 4 说成读权限', at: t1c, source: 'recall' },
  diagnosis: { text: '权限位与八进制对应记反', at: t1c }, questionId: 'C1', status: 'open',
});
check(led1.appended && led2.appended && led3.appended && ledgerCount() === 3,
  '昨日三考点判错落条 3 条（EP-03 带 diagnosis、EP-05 缺省——出题回退 observed）');
check(oralCount() === 3, '口述流水 3 条（判错即流水——微块不开站也有证据通道）');

// ── 会话 2 · 今天：显式复习意图 → 复测选择 + 解释 + 出题 + 答对闭环 ──
console.log('[会话 2 · 今天 · 复测选择与答对闭环]');
const s2 = runReport();
check(!!s2.retest && s2.retest.candidates.length === 3,
  `retest 字段读出 3 候选（零闪卡：flashcards 空、srs 空——不依赖 srsDue）`);
check(s2.retest.pick.ep === 'EP-03',
  `pick=EP-03（三目标同为 weak·1 错·加权 0 → tiebreak 取观察最新的）——每会话 1 目标`);
const pick2 = s2.retest.pick;
check(pick2.misconceptions[0].observed.text === '把 4 说成读权限'
  && pick2.misconceptions[0].diagnosis.text === '权限位与八进制对应记反'
  && pick2.oral.status === 'weak' && pick2.oral.asked === 1 && pick2.oral.correct === 0,
  '解释依据齐：observed 事实与 diagnosis 推断分开可引 + 口头四态（问 1 对 0 weak）——「为何选它」有据');
// 沿 diagnosis 出变体 → 学习者答对（真实时间）→ 落流水 + 模拟回流
const t2 = realAt();
answerOral({ target: 'EP-03 chmod', correct: true, at: t2, source: 'recall' });
const s2b = runReport();
check(s2b.points.find((p) => p.ep === 'EP-03').misconceptions[0].status === 'corrected',
  '答对进口述流水（真实事件时间）→ 台账条 open → corrected（跨会话证据接续）');
check(s2b.retest.candidates.every((c) => c.ep !== 'EP-03') && s2b.retest.excluded.notOpen === 1,
  '答对即退场：EP-03 不再是候选（历史错误不会被无条件表述成当前仍错）');
check(s2b.oral.targets.find((t) => t.target === 'EP-03').asked === 2,
  '口述流水两笔（判错昨天 + 判对今天）——回流副本同四元组去重不重复计');
check(s2b.points.every((p) => p.answered === 0),
  '题库作答面零记录（口述成绩不伪造成题库作答，其他题库进度不受影响）');

// ── 会话 3 · 今天稍后：答错分支 + 当场纠偏再验 + 复发接续 ──
console.log('[会话 3 · 今天 · 答错分支与复发接续]');
const s3 = runReport();
check(s3.retest.pick.ep === 'EP-05' && s3.retest.pick.misconceptions[0].diagnosis === null,
  '下一候选 EP-05（diagnosis 缺省 → 出题回退 observed，不编造诊断）');
// 变体（按 observed 出）→ 答错（同根因）→ 当场纠偏 → 再验 1 题 → 仍错
const t3a = realAt();
answerOral({ target: 'EP-05 分支模型', correct: false, at: t3a, source: 'recite' });
const t3b = realAt();
answerOral({ target: 'EP-05 分支模型', correct: false, at: t3b, source: 'recite' }); // 再验 1 题（预算 1-2 封顶）
const led4 = appendLedger({
  theme: THEME, target: 'EP-05 分支模型', ep: 'EP-05', node: null, name: '分支模型', via: 'ep',
  observed: { text: '把 fast-forward 说成会丢弃改动', at: t3b, source: 'recite' }, // 复发写法：observed 一字不差沿用（缺省 diagnosis 的接续键）
  diagnosis: null, questionId: null, status: 'open',
});
check(led4.appended && ledgerCount() === 4, '同根因再现 → 追加新台账条目（append-only，不改写旧条）');
const s3b = runReport();
const ep05 = s3b.points.find((p) => p.ep === 'EP-05').misconceptions;
check(ep05.filter((m) => m.status === 'recurred').length === 1 && ep05.filter((m) => m.status === 'open').length === 1,
  '旧条 recurred、新条 open（复发接续可判定——消费端派生，下次会话接得上）');
check(s3b.retest.candidates.every((c) => c.ep !== 'EP-05') && s3b.retest.excluded.answeredToday === 1,
  'EP-05 当天已答（复测两题都算口述记录）→ 今天退场，明天按状态重新判入选');

// ── 会话 4 · 今天：跳过 = 本次不做，零欠账零催办 ──
console.log('[会话 4 · 今天 · 跳过零欠账]');
const s4 = runReport();
check(s4.retest.pick.ep === 'EP-01', 'pick=EP-01（仅存候选——预算内的小动作，不陈列积压）');
const filesBefore = readdirSync(join(DIR, 'study', 'records')).sort().join(',');
const ledgerBefore = ledgerCount();
const oralBefore = oralCount();
// 学习者说「先不复习了」→ 教练不执行任何写操作（无欠账文件、无待补清单——复测派生无状态，没有可累积的载体）
const s4b = runReport();
check(ledgerBefore === 4 && oralBefore === 6 && readdirSync(join(DIR, 'study', 'records')).sort().join(',') === filesBefore
  && s4b.retest.pick.ep === 'EP-01',
  '跳过后零写入（台账 4 条、流水 6 条、records 目录文件数不变）；EP-01 留待后续会话静默等待');

// ── 诚实降级：无台账主题 → retest 字段整体缺席 ──
console.log('[诚实降级]');
const emptyDir = mkdtempSync(join(tmpdir(), 'ask-retest-empty-'));
try {
  mkdirSync(join(emptyDir, 'study', 'records'), { recursive: true });
  writeFileSync(join(emptyDir, 'questions.json'), JSON.stringify([{ id: 'A1', examPoint: 'EP-01' }]));
  writeFileSync(join(emptyDir, 'flashcards.json'), JSON.stringify([]));
  writeFileSync(join(emptyDir, 'MISSION.md'), MISSION);
  writeFileSync(join(emptyDir, 'progress.json'), JSON.stringify({ answers: {}, srs: {} }));
  const emptyReport = JSON.parse(execFileSync(
    process.execPath, [REPORT_CLI, '--theme', emptyDir, '--progress', join(emptyDir, 'progress.json'), '--json'],
    { encoding: 'utf-8' },
  ));
  check(!('retest' in emptyReport) && !('misconceptions' in emptyReport),
    '无台账 → retest 与 misconceptions 字段整体缺席（复测通道静默不出现，输出与功能前零变化——不编造历史与成绩，不强制创建复测计划）');
} finally {
  rmSync(emptyDir, { recursive: true, force: true });
}
// 私有边界复认：台账与流水住 study/records/（学习者私有目录——不上站不提交，随目录继承边界）
check(misPath.endsWith(join('study', 'records', 'misconceptions.json'))
  && oralPath.endsWith(join('study', 'records', 'oral-attempts.json')),
  '复测读写的台账与流水住 study/records/（学习者私有边界随目录继承）');

console.log(failures.length ? `\n[drill] ❌ ${failures.length} 项红：${failures.join('；')}` : '\n[drill] ✅ 全绿：多会话复测闭环走通（判错落条 → 选择与解释 → 变体再验 → 答对退场/答错复发接续 → 跳过零欠账）');
process.exit(failures.length ? 1 : 0);
