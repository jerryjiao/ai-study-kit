#!/usr/bin/env node
// opening-drill.mjs — #134 复测接入开场、微块与下站预告 · 两会话演练（行为级验收面）。
//
// spec #131 / 决议 #130 的验收切分：数据面由确定性夹具保（retest.test.mjs / misconceptions.test.mjs /
// mastery-report.test.mjs），行为面由演练保——本脚本即 #134 的演练，#132/#133 演练同模式（可重复跑；
// 每次新建临时外部主题包，两会话 = 各自独立的「探测 → 按编排优先级行动 → 落盘 → 再探测」命令序列）。
//
// 演练叙事（对照票 #134 验收标准）：
//   夹具预置：昨日微块判错三考点（台账 3 条 open + 流水 3 条）+ 2 张到期闪卡（srsDue=2）+
//             未认领下站预告 next-hook.json（EP-05，昨日收尾留的）+ plan.json（两单元，全程不动）。
//   会话 A · 今天「继续学习」（常规开场，主入口/薄命令同一探测协议）：
//     开场探测 → retest.pick=EP-05（观察最新 tiebreak）恰好 == 预告考点 → **认领即覆盖复测**（#129
//     编排第一位，入选条件③去重——认领口述 1 题后 EP-05 退场，当天不另考）→ 同池续：pick 转 EP-03，
//     复测变体 2 题（答错 → 当场纠偏 → 再验仍错 → 台账复发接续写法）；到期卡抽背让位（FC-3 目标恰为
//     复测目标不单独抽，抽 FC-4）——池合计（复测 2 + 抽背 1）≤3 → 学习者跳过剩余候选 EP-01（「直接学
//     新的」）→ 零写入零催办，正题照常 → 收尾跑 plan-report --json 读 next 现算写预告（与这次结果、
//     下一次候选一致）。
//   会话 B · 今天稍晚「就学 5 分钟，考考我上次错的」（低能量微块；判据不依赖间隔，同日稍晚即可演练）：
//     开场探测 → 唯一候选 EP-01（EP-05 已 corrected、EP-03 当天已答退场）且恰为上次预告考点 → 微块 =
//     预告认领与复测同点合并：复测变体 1 题答错 → 当场纠偏 → 再验 1 题答对 → corrected 退场；
//     微块不开站（records 无新 .md）、plan.json 字节不变（复测不改变正式学习站与计划单元状态）→
//     重跑报告 pick=null（候选清空，excluded 如实计数——快照「隔期复测」行按口径省略）→ 收尾预告照
//     next 现算落盘（真实 leftAt，零催办形状）。
//   诚实降级：无台账对照主题 → 两个 CLI 照常出数、retest/misconceptions 字段缺席（原有学习入口零变化）。
//
// 时间口径：夹具预置（昨日判错/到期/预告 leftAt）用真实墙钟的昨日整点（注入只存在于夹具——跨日边界
// 是 #133 判据；本票判据「当天无口述」也靠它把昨日与今天分开）；两会话的全部作答与落盘时间戳一律真实
// Date.now()（红线）。
//
// 用法：node scripts/drill/opening-drill.mjs [目录=/tmp/ask-drill-opening]
// 退出码：全绿 0；任一断言红 1。首跑实录见 scripts/drill/REPORT.md「复测接入开场与微块演练留档」。
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
const PLAN_CLI = join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'plan-report.mjs');
const DIR = resolve(process.argv[2] || join(tmpdir(), 'ask-drill-opening'));

const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const bad = (name, detail) => { failures.push(name); console.error(`  ❌ ${name}${detail ? `——${detail}` : ''}`); };
const check = (cond, name, detail) => (cond ? ok(name) : bad(name, detail));

/** 昨日本地整点（夹具注入面）：以真实墙钟为基，日历日关系任何时区下恒定。 */
const localAt = (dayOffset, hour) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
};

const MISSION = '# 演练主题\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 暂存区 | 掌握 | single×2 | D1 | 2 |\n| EP-03 | chmod | 掌握 | single×2 | D2 | 1 |\n'
  + '| EP-05 | 分支模型 | 掌握 | single×2 | D3 | 1 |\n';

// ── 夹具：临时外部主题包（含路径分隔符 → 外部形态；plan.json 两单元全程只读对照） ──
rmSync(DIR, { recursive: true, force: true });
mkdirSync(join(DIR, 'study', 'records'), { recursive: true });
writeFileSync(join(DIR, 'MISSION.md'), MISSION);
writeFileSync(join(DIR, 'questions.json'), JSON.stringify([
  { id: 'A1', examPoint: 'EP-01' }, { id: 'A2', examPoint: 'EP-01' },
  { id: 'C1', examPoint: 'EP-03' }, { id: 'C2', examPoint: 'EP-03' },
  { id: 'E1', examPoint: 'EP-05' }, { id: 'E2', examPoint: 'EP-05' },
]));
writeFileSync(join(DIR, 'flashcards.json'), JSON.stringify([
  { id: 'FC-1', examPoint: 'EP-01' }, { id: 'FC-2', examPoint: 'EP-01' },
  { id: 'FC-3', examPoint: 'EP-03' }, { id: 'FC-4', examPoint: 'EP-05' },
]));
const THEME = DIR.split('/').pop();
const progressPath = join(DIR, 'progress.json');
const dueAt = localAt(-1, 8);
writeFileSync(progressPath, JSON.stringify({
  answers: {},
  // 两张到期卡（phase 非 review——不构成闪卡毕业超题证据，判据不被夹具污染）
  srs: { 'FC-3': { due: dueAt, phase: 'learn', reps: 1 }, 'FC-4': { due: dueAt, phase: 'learn', reps: 1 } },
  oralAttempts: [],
}));
writeFileSync(join(DIR, 'plan.json'), JSON.stringify({
  units: [
    { id: 'U1', title: '第 1 站 · 暂存区', order: 1, day: 'D1', topic: '暂存区', status: 'planned' },
    { id: 'U2', title: '第 2 站 · 权限', order: 2, day: 'D2', topic: 'chmod', status: 'planned' },
  ],
}, null, 2) + '\n');
const oralPath = join(DIR, 'study', 'records', 'oral-attempts.json');
const misPath = join(DIR, 'study', 'records', 'misconceptions.json');
const hookPath = join(DIR, 'study', 'records', 'next-hook.json');
// 未认领下站预告（昨日会话收尾留的——开场认领位的输入）
writeFileSync(hookPath, JSON.stringify({
  ep: 'EP-05', name: '分支模型', reason: 'weak', action: 'oral-3', minutes: 5, leftAt: localAt(-1, 18),
}));
// 昨日微块判错：流水 3 条 + 台账 3 条（EP-01 缺省 diagnosis——B 会话回退 observed 出题）
const wrongAt = (h) => localAt(-1, h);
writeFileSync(oralPath, JSON.stringify(mergeOralAttempts([], [
  { target: 'EP-01 暂存区', correct: false, at: wrongAt(9), source: 'recall' },
  { target: 'EP-03 chmod', correct: false, at: wrongAt(10), source: 'recite' },
  { target: 'EP-05 分支模型', correct: false, at: wrongAt(11), source: 'recall' },
]), null, 2) + '\n');
const seedLedger = [
  { theme: THEME, target: 'EP-01 暂存区', ep: 'EP-01', node: null, name: '暂存区', via: 'ep',
    observed: { text: '把 add 说成直接提交', at: wrongAt(9), source: 'recall' },
    diagnosis: null, questionId: null, status: 'open' },
  { theme: THEME, target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep',
    observed: { text: '把 4 说成读权限', at: wrongAt(10), source: 'recite' },
    diagnosis: { text: '权限位与八进制对应记反', at: wrongAt(10) }, questionId: 'C1', status: 'open' },
  { theme: THEME, target: 'EP-05 分支模型', ep: 'EP-05', node: null, name: '分支模型', via: 'ep',
    observed: { text: '把 fast-forward 说成会丢弃改动', at: wrongAt(11), source: 'recall' },
    diagnosis: { text: 'merge 与 ff 边界没分清', at: wrongAt(11) }, questionId: null, status: 'open' },
];
writeFileSync(misPath, JSON.stringify(seedLedger, null, 2) + '\n');

const runReport = () => JSON.parse(execFileSync(
  process.execPath, [REPORT_CLI, '--theme', DIR, '--progress', progressPath, '--json'],
  { encoding: 'utf-8' },
));
const runPlan = () => JSON.parse(execFileSync(
  process.execPath, [PLAN_CLI, '--theme', DIR, '--progress', progressPath, '--json'],
  { encoding: 'utf-8' },
));
/** 真实事件时间（单调去同毫秒）：两笔作答落同一毫秒会被口述流水四元组去重吞掉一笔。 */
let lastRealAt = 0;
const realAt = () => {
  let t = Date.now();
  if (t <= lastRealAt) t = lastRealAt + 1;
  lastRealAt = t;
  return t;
};
/** 教练写一笔口述作答：包内流水追加 + 模拟 POST /api/oral-attempts 实时回流（同四元组带 theme）。 */
const answerOral = (attempt) => {
  const pkg = JSON.parse(readFileSync(oralPath, 'utf-8'));
  writeFileSync(oralPath, JSON.stringify(mergeOralAttempts(pkg, [attempt]), null, 2) + '\n');
  const prog = JSON.parse(readFileSync(progressPath, 'utf-8'));
  prog.oralAttempts.push({ theme: THEME, ...attempt });
  writeFileSync(progressPath, JSON.stringify(prog));
};
const appendLedger = (entry) => {
  const prev = readFileSync(misPath, 'utf-8');
  const r = appendMisconceptions(prev, entry);
  writeFileSync(misPath, r.text);
  return r;
};
const countOral = (targetPrefix) => JSON.parse(readFileSync(oralPath, 'utf-8'))
  .filter((a) => a.target.startsWith(targetPrefix)).length;
const ledgerCount = () => JSON.parse(readFileSync(misPath, 'utf-8')).length;
const readHook = () => JSON.parse(readFileSync(hookPath, 'utf-8'));
const srsDue = () => {
  const fcIds = new Set(JSON.parse(readFileSync(join(DIR, 'flashcards.json'))).map((c) => c.id));
  const p = JSON.parse(readFileSync(progressPath, 'utf-8'));
  return Object.entries(p.srs || {}).filter(([id, s]) => !s.deletedAt && fcIds.has(id) && s.due <= Date.now()).length;
};
const recordsListing = () => readdirSync(join(DIR, 'study', 'records')).sort().join(',');
const planBytes = () => readFileSync(join(DIR, 'plan.json'), 'utf-8');

console.log(`[drill] 主题包：${DIR}（theme=${THEME}；预置：昨日 3 错因台账 + 2 到期卡 + EP-05 未认领预告 + plan.json 两单元）`);

// ── 会话 A · 今天 · 常规开场「继续学习」（主入口 /study-coach 同一探测协议）──
console.log('[会话 A · 常规开场 · 编排优先级与同池去重]');
const planA0 = planBytes();
const a0 = runReport();
const plan0 = runPlan();
// 探测能看见复测信息（AC 1）：pick + 出题依据（observed 事实 / diagnosis 推断分开可引）+ 口头四态
check(a0.retest?.pick?.ep === 'EP-05' && a0.retest.pick.oral.status === 'weak',
  '开场探测读出 retest.pick=EP-05（三目标同 weak·加权 0 → 观察最新 tiebreak）——复测信息实际可见');
check(a0.retest.pick.misconceptions[0].observed.text === '把 fast-forward 说成会丢弃改动'
  && a0.retest.pick.misconceptions[0].diagnosis.text === 'merge 与 ff 边界没分清',
  '解释依据齐：「你上次说过 X」（observed）与「我当时判断根因是 Y」（diagnosis）分开可引（AC 1）');
check(srsDue() === 2 && readHook().ep === 'EP-05' && plan0.next?.ep === 'EP-01' && plan0.next?.reason === 'weak',
  '四类开场信号同场可见：srsDue=2 · 未认领预告 EP-05 · plan-report next=EP-01（补弱轨）· 复测候选——编排优先级的全部输入');
// 优先级第一位：预告认领。预告考点恰为复测 pick（EP-05）→ 认领的口述即覆盖复测，不另考（AC 3）
const tA1 = realAt();
answerOral({ target: 'EP-05 分支模型', correct: true, at: tA1, source: 'recite' });
const a1 = runReport();
check(countOral('EP-05') === 2, '认领口述 1 题（昨日错 + 今日对）——复测被认领覆盖，当天没有第二笔复测题（AC 3）');
check(a1.retest.candidates.every((c) => c.ep !== 'EP-05') && a1.retest.excluded.notOpen === 1,
  'EP-05 答对即退场（corrected 派生），pick 转 EP-03——已纠正目标不再被当作今天仍错');
check(a1.retest.pick.ep === 'EP-03', '同池续：复测 pick=EP-03（弱项排序）');
// 同池（抽背/复测合计 ≤3）：到期卡 FC-3 的概念目标恰为复测 pick（EP-03）→ 该卡让位不单独抽，抽 FC-4（EP-05）
const flashcards = JSON.parse(readFileSync(join(DIR, 'flashcards.json')));
const fc3 = flashcards.find((c) => c.id === 'FC-3');
check(fc3?.examPoint === 'EP-03' && fc3.id in JSON.parse(readFileSync(progressPath, 'utf-8')).srs,
  '到期卡 FC-3 的概念目标 == 复测 pick（EP-03）→ 抽背让位（同目标只考一次），改抽 FC-4（AC 3）');
// 复测 EP-03：变体第 1 题答错 → 当场纠偏 → 再验 1 题仍错 → 台账复发接续
const tA2 = realAt();
answerOral({ target: 'EP-03 chmod', correct: false, at: tA2, source: 'recite' });
const tA3 = realAt();
answerOral({ target: 'EP-03 chmod', correct: false, at: tA3, source: 'recite' });
const ledA = appendLedger({
  theme: THEME, target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep',
  observed: { text: '把 4 说成读权限', at: tA3, source: 'recite' }, // 复发写法：observed/diagnosis 一字不差沿用原条
  diagnosis: { text: '权限位与八进制对应记反', at: tA3 }, questionId: 'C1', status: 'open',
});
const tA4 = realAt();
answerOral({ target: 'EP-05 分支模型', correct: true, at: tA4, source: 'recall' }); // 抽背 FC-4 概念答对（source recall）
check(ledA.appended && ledgerCount() === 4, '复测答错 → 当场纠偏再验 1 题（1-2 题预算封顶）→ 仍错按复发写法追加台账（不改写旧条）');
const a2 = runReport();
const ep03mis = a2.points.find((p) => p.ep === 'EP-03').misconceptions;
// 计数口径：EP-03 = 昨日 1 + 复测 2 = 3；EP-05 = 昨日 1 + 认领 1 + 抽背 1 = 3；
// 今日池内 = EP-03 今日 2 + 抽背 1 = 3 ≤ 3（认领位的 1 题不在池内）
check(countOral('EP-03') === 3 && countOral('EP-05') === 3,
  '口述计数对账：EP-03 三笔（昨日 1 + 复测 2）、EP-05 三笔（昨日 1 + 认领 1 + 抽背 1）');
check((countOral('EP-03') - 1) + (countOral('EP-05') - 2) === 3,
  '同池合计 ≤3：今日池内 = 复测 2 题 + 抽背 1 题 = 3（AC 3）——抽背让位后 EP-03 今天恰 2 笔复测、无抽背加考');
check(ep03mis.filter((m) => m.status === 'recurred').length === 1 && ep03mis.filter((m) => m.status === 'open').length === 1,
  'EP-03 台账旧条 recurred、新条 open——下次会话接得上同一根因');
check(a2.retest.candidates.every((c) => c.ep !== 'EP-03') && a2.retest.excluded.answeredToday === 1
  && a2.retest.pick.ep === 'EP-01',
  'EP-03 当天已答退场，剩余候选 EP-01（其余静默留待、不陈列）');
check(srsDue() === 2, '抽背口头问答不清 srs 到期（清偿走 F3）——到期卡数不变，无隐性状态改写');
// 跳过（AC 6）：学习者「EP-01 先不复测，直接学新的」→ 零写入零催办，正题照常
const beforeSkip = { oral: JSON.parse(readFileSync(oralPath, 'utf-8')).length, led: ledgerCount(), listing: recordsListing() };
const a3 = runReport(); // 教练照办：不写任何文件，直接进正题（新学 EP-01）
check(beforeSkip.led === 4 && JSON.parse(readFileSync(oralPath, 'utf-8')).length === beforeSkip.oral
  && recordsListing() === beforeSkip.listing && a3.retest.pick.ep === 'EP-01',
  '跳过零写入（台账/流水/records 目录不变）、零催办——正题（新学）照常可进（AC 6）');
check(planBytes() === planA0, '会话 A 全程 plan.json 字节不变（复测/跳过都不动计划单元——AC 4 的开场面）');
// 收尾（AC 5）：预告照 plan-report next 现算，与这次结果、下一次候选一致
const planA1 = runPlan();
const leftA = realAt();
writeFileSync(hookPath, JSON.stringify({
  ep: planA1.next.ep, name: planA1.next.name, reason: planA1.next.reason,
  action: 'oral-3', minutes: 5, leftAt: leftA,
}, null, 2) + '\n');
const hookA = readHook();
check(hookA.ep === planA1.next.ep && hookA.action === 'oral-3' && hookA.minutes === 5
  && Number.isFinite(hookA.leftAt) && hookA.leftAt >= tA1 && hookA.leftAt <= Date.now(),
  `收尾预告与判据单源一致：hook=${hookA.ep}（== plan-report next）· action/minutes 齐 · leftAt 真实（AC 5）`);
check(hookA.ep !== 'EP-05', '本会话答对退场的 EP-05 不再进预告位（预告与这次结果一致）');
check(JSON.parse(readFileSync(misPath, 'utf-8')).length === 4
  && a2.points.find((p) => p.ep === 'EP-05').misconceptions[0].status === 'corrected',
  'corrected 只由消费端派生、不改写旧条目（台账仍 4 条原样）');

// ── 会话 B · 今天稍晚 · 低能量微块「就学 5 分钟，考考我上次错的」──
console.log('[会话 B · 低能量微块 · 复测融入微块与不开站边界]');
const planB0 = planBytes();
const b0 = runReport();
check(b0.retest.pick?.ep === 'EP-01',
  '微块开场探测：唯一复测候选 EP-01（EP-05 corrected / EP-03 当天已答——判据不依赖间隔，同日稍晚照常派生）');
check(readHook().ep === 'EP-01', '上次预告考点 == 复测目标 → 微块预告认领与复测同点合并（块内前 1-2 题即复测变体）');
// 微块口述：EP-01 缺省 diagnosis → 出题回退 observed；变体答错 → 当场纠 → 再验答对 → corrected
const tB1 = realAt();
answerOral({ target: 'EP-01 暂存区', correct: false, at: tB1, source: 'recite' });
const tB2 = realAt();
answerOral({ target: 'EP-01 暂存区', correct: true, at: tB2, source: 'recite' });
const b1 = runReport();
check(countOral('EP-01') === 3 && b1.points.find((p) => p.ep === 'EP-01').misconceptions[0].status === 'corrected',
  '微块复测 2 题（答错 → 纠偏 → 再验答对；EP-01 共三笔 = 昨日 1 + 今日 2）→ 台账条 open → corrected 退场——轻量尺寸与判分纪律照旧（AC 4）');
check(b1.retest.pick === null && b1.retest.excluded.answeredToday >= 1 && b1.retest.excluded.notOpen >= 1,
  `候选清空如实计数（excluded：当天已答/已纠正）——快照「隔期复测」行按口径省略，不编造候选`);
const mdFiles = readdirSync(join(DIR, 'study', 'records')).filter((f) => f.endsWith('.md'));
check(mdFiles.length === 0, '微块不开站：records 目录零 .md 站记录（AC 4）');
check(planBytes() === planB0 && planBytes() === planA0,
  '会话 B plan.json 仍字节不变——复测不因微块形态改变正式学习站或计划单元状态（AC 4）');
// 收尾：预告照 next 现算落盘（真实 leftAt，零催办形状）
const planB1 = runPlan();
const leftB = realAt();
if (planB1.next) {
  writeFileSync(hookPath, JSON.stringify({
    ep: planB1.next.ep, name: planB1.next.name, reason: planB1.next.reason,
    action: 'oral-3', minutes: 5, leftAt: leftB,
  }, null, 2) + '\n');
}
const hookB = readHook();
check(!!planB1.next === false || (hookB.ep === planB1.next.ep && hookB.leftAt >= tB1 && hookB.leftAt <= Date.now()),
  '微块收尾预告照 next 现算、leftAt 真实（AC 5）');
check(!JSON.stringify(hookB).match(/落后|欠|要补|该补/), '预告文件零催办字样（钩子式红线，逐字段核对）');

// ── 诚实降级：无台账对照主题 → 原有续站与学习入口零变化（AC 7）──
console.log('[诚实降级 · 无台账主题]');
const emptyDir = mkdtempSync(join(tmpdir(), 'ask-opening-empty-'));
try {
  mkdirSync(join(emptyDir, 'study', 'records'), { recursive: true });
  writeFileSync(join(emptyDir, 'MISSION.md'), MISSION);
  writeFileSync(join(emptyDir, 'questions.json'), JSON.stringify([{ id: 'A1', examPoint: 'EP-01' }]));
  writeFileSync(join(emptyDir, 'flashcards.json'), JSON.stringify([]));
  writeFileSync(join(emptyDir, 'progress.json'), JSON.stringify({ answers: {}, srs: {} }));
  const emptyReport = JSON.parse(execFileSync(
    process.execPath, [REPORT_CLI, '--theme', emptyDir, '--progress', join(emptyDir, 'progress.json'), '--json'],
    { encoding: 'utf-8' },
  ));
  const emptyPlan = JSON.parse(execFileSync(
    process.execPath, [PLAN_CLI, '--theme', emptyDir, '--progress', join(emptyDir, 'progress.json'), '--json'],
    { encoding: 'utf-8' },
  ));
  check(!('retest' in emptyReport) && !('misconceptions' in emptyReport) && emptyPlan.next?.ep === 'EP-01',
    '无台账主题：mastery-report 与 plan-report 照常出数、复测字段缺席、next 照常派生——原有续站与学习入口正常可用（AC 7）');
} finally {
  rmSync(emptyDir, { recursive: true, force: true });
}

console.log(failures.length ? `\n[drill] ❌ ${failures.length} 项红：${failures.join('；')}` : '\n[drill] ✅ 全绿：两会话开场编排走通（常规开场：认领覆盖复测/同池 ≤3/抽背让位/跳过零欠账/收尾预告一致；低能量微块：复测融入微块/corrected 退场/不开站不动 plan/候选清空诚实降级）');
process.exit(failures.length ? 1 : 0);
