// plan-generate.test.mjs — 计划生成器判据层单测（node:test，随 pnpm test 的 glob 跑）。
// 判据本体在 lib/plan-generate.mjs（v0.27 #121，spec #118（自适应排期器）），本文件守四块：
//   1. 排布表深度解析 + 轻重分类（交错的判据面）；
//   2. 交错排序（in-progress 最前、轻先行交替、桶内稳定、尾部如实连续）；
//   3. 实测速率三级派生（flag > 14 天窗 > 全历史跨度 > 明确报错）+ 活跃率接触日派生；
//   4. 排期数学与票面验收逐项对上：37 单元 × 2.6 天/站 ÷ 0.54 活跃率 = 178 天 →
//      2026-10-08 起 → 2027-04-04 完成 ≤ 考期 2027-05-22 富余 48 天；×1.25 余量 →
//      2027-05-19 富余 3 天；排不进考期报错附全算术不静默压缩。
// 时区纪律与 plan.test 同款：时间戳一律本地正午构造，跨时区确定。
// CLI 装配链路（--out 预览不碰主题文件 / 缺 plan.json 报错 / 不可行 exit 1）在末段
// 跑真子进程端到端（mastery-report.test.mjs 同款手法）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  epDepthMap, unitEpOf, isHeavyUnit, interleaveSequence,
  deriveDaysPerUnit, deriveActivity, contactDates, generatePlanSchedule, HEAVY_DEPTH,
} from './plan-generate.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const CLI = path.resolve(HERE, '..', 'plan-generate.mjs');

/** 本地正午时间戳（跨时区确定的「今天」）。 */
const noon = (y, m, d) => new Date(y, m - 1, d, 12, 0, 0).getTime();

// ── 1. 排布表深度解析 + 轻重分类 ──────────────────────────

const MISSION = '# m\n\n## 考点排布表\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 补码 | 掌握 | single×10 | W1 | 5 |\n'
  + '| EP-02 | 校验码 | 理解 | single×7 | W1 | 3 |\n'
  + '| EP-03 | 流水线 | 了解 | single×8 | W1 | 4 |\n'
  + '| EP-04 | Cache | — | single×11 | W1 | 4 |\n';

test('epDepthMap：解析排布表深度列，占位（—）不计', () => {
  const map = epDepthMap(MISSION);
  assert.equal(map['EP-01'], '掌握');
  assert.equal(map['EP-02'], '理解');
  assert.equal(map['EP-03'], '了解');
  assert.equal(map['EP-04'], undefined); // — 占位 = 未标深度
  assert.deepEqual(epDepthMap(''), {});
  assert.deepEqual(epDepthMap(null), {});
});

test('unitEpOf/isHeavyUnit：title 首个 EP-NN 查表，掌握=重，无映射归轻不猜重', () => {
  const map = epDepthMap(MISSION);
  assert.equal(unitEpOf({ title: '补码统一加减法（EP-01）' }), 'EP-01');
  assert.equal(unitEpOf({ title: '无考点编号的单元' }), null);
  assert.equal(isHeavyUnit({ title: 'x（EP-01）' }, map), true);   // 掌握 = 重（硬算代理）
  assert.equal(isHeavyUnit({ title: 'x（EP-02）' }, map), false);  // 理解 = 轻
  assert.equal(isHeavyUnit({ title: 'x（EP-04）' }, map), false);  // 占位无深度 → 轻
  assert.equal(isHeavyUnit({ title: '无映射' }, map), false);      // 不见为轻
  assert.equal(HEAVY_DEPTH, '掌握');
});

// ── 2. 交错排序 ──────────────────────────────────────────

const mkUnits = (specs) => specs.map(([id, ep, status], i) => ({
  id, title: `u ${id}（${ep ?? '无考点'}）`, order: i + 1, status: status ?? 'planned',
}));

test('interleaveSequence：in-progress 最前，轻先行交替，桶内稳定', () => {
  const map = { 'EP-01': '掌握', 'EP-02': '理解' };
  const units = mkUnits([
    ['A', 'EP-01'], ['B', 'EP-02'], ['C', 'EP-01'], ['D', 'EP-02'], ['E', 'EP-01'], ['F', 'EP-02'],
  ]);
  const seq = interleaveSequence(units, map);
  assert.deepEqual(seq.map((u) => u.id), ['B', 'A', 'D', 'C', 'F', 'E']); // 轻先行 L H L H L H
  // 不改入参
  assert.deepEqual(units.map((u) => u.id), ['A', 'B', 'C', 'D', 'E', 'F']);
});

test('interleaveSequence：in-progress 恒排最前（学到一半的最先收）', () => {
  const map = { 'EP-01': '掌握', 'EP-02': '理解' };
  const units = mkUnits([
    ['A', 'EP-01'], ['B', 'EP-02', 'in-progress'], ['C', 'EP-01'], ['D', 'EP-02'],
  ]);
  const seq = interleaveSequence(units, map);
  assert.equal(seq[0].id, 'B');
  assert.deepEqual(seq.map((u) => u.id), ['B', 'D', 'A', 'C']);
});

test('interleaveSequence：重远多于轻时尾部如实连续（轻桶耗尽才连排重）', () => {
  const map = { 'EP-01': '掌握', 'EP-02': '理解' };
  const units = mkUnits([
    ['H1', 'EP-01'], ['H2', 'EP-01'], ['H3', 'EP-01'], ['L1', 'EP-02'], ['H4', 'EP-01'],
  ]);
  const seq = interleaveSequence(units, map).map((u) => u.id);
  assert.deepEqual(seq, ['L1', 'H1', 'H2', 'H3', 'H4']); // 交替到轻桶尽，重单元尾部连排
});

// ── 3. 实测速率 + 活跃率派生 ─────────────────────────────

test('deriveDaysPerUnit：显式传入优先（正数校验，坏值报错）', () => {
  assert.deepEqual(deriveDaysPerUnit({ plan: { units: [] }, now: 0, explicit: '2.6' }), { ok: true, value: 2.6, source: 'flag' });
  const bad = deriveDaysPerUnit({ plan: { units: [] }, now: 0, explicit: 'abc' });
  assert.equal(bad.ok, false);
  assert.equal(bad.reason, 'bad-flag');
});

test('deriveDaysPerUnit：近 14 天窗派生（对账刀同源 1/rate）', () => {
  const now = noon(2026, 10, 8);
  const done = (id, doneDate, order) => ({ id, title: id, order, status: 'done', doneDate });
  const plan = { units: [done('a', '2026-10-07', 1), done('b', '2026-10-07', 2), done('c', '2026-10-05', 3),
    { id: 'd', title: 'd', order: 4, status: 'planned' }, { id: 'e', title: 'e', order: 5, status: 'planned' }] };
  const r = deriveDaysPerUnit({ plan, now });
  assert.equal(r.source, 'window');
  assert.ok(Math.abs(r.value - 14 / 3) < 1e-9); // 3 事件 / 14 天 → 14/3 天/单元
});

test('deriveDaysPerUnit：长断档后窗口空事件 → 全历史跨度兜底（08-27..09-20 共 25 天 10 站 = 2.5）', () => {
  const now = noon(2026, 10, 8);
  const units = [];
  const dates = ['2026-08-27', '2026-08-31', '2026-09-01', '2026-09-03', '2026-09-04',
    '2026-09-10', '2026-09-15', '2026-09-16', '2026-09-16', '2026-09-20'];
  dates.forEach((d, i) => units.push({ id: `S-${i}`, title: `S-${i}`, order: i + 1, status: 'done', doneDate: d }));
  const r = deriveDaysPerUnit({ plan: { units }, now });
  assert.equal(r.source, 'lifetime');
  assert.equal(r.value, 2.5); // span 25 ÷ 10 笔（同日两笔都计入完成数）
});

test('deriveDaysPerUnit：零 done 历史 → 明确报错不猜', () => {
  const now = noon(2026, 10, 8);
  const r = deriveDaysPerUnit({ plan: { units: [{ id: 'a', title: 'a', order: 1, status: 'planned' }] }, now });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'no-pace');
  assert.match(r.message, /--days-per-unit/);
});

test('contactDates/deriveActivity：接触日 ÷ 首末跨度（主题隔离四通道）', () => {
  const progress = {
    answers: {
      'Q1': { submittedAt: noon(2026, 9, 1) },   // 本主题
      'Q2': { submittedAt: noon(2026, 9, 5) },   // 本主题
      'OTHER-1': { submittedAt: noon(2026, 9, 9) }, // 别主题（questionIds 不含 → 隔离）
    },
    coursesRead: { 'mytheme/lesson1.html': noon(2026, 9, 3) },
    oralAttempts: [{ theme: 'mytheme', target: 'EP-01', correct: true, at: noon(2026, 9, 10), source: 'recall' }],
  };
  const opts = { questionIds: ['Q1', 'Q2'], theme: 'mytheme' };
  const days = contactDates(progress, opts);
  assert.deepEqual([...days].sort(), ['2026-09-01', '2026-09-03', '2026-09-05', '2026-09-10']);
  const rate = deriveActivity({ progress, now: 0, ...opts });
  // 4 个接触日 ÷ 跨度 10 天（09-01..09-10 含首末）= 0.4
  assert.ok(Math.abs(rate - 0.4) < 1e-9);
  // 不足两个接触日 → null（无从折减）
  assert.equal(deriveActivity({ progress: { answers: { Q1: { submittedAt: noon(2026, 9, 1) } } }, now: 0, questionIds: ['Q1'] }), null);
  assert.equal(deriveActivity({ progress: null, now: 0 }), null);
});

// ── 4. 排期数学（票面验收逐项对上）──────────────────────

/** 47 单元软件设计师形态：10 done（08-27..09-20）+ 37 剩余（1 paused + 36 planned）；
 *  剩余 title 的考点在 EP-01（掌握=重）/EP-03（理解=轻）间交替，喂交错判据。 */
const ruankaoLikePlan = (deadline) => {
  const units = [];
  const doneDates = ['2026-08-27', '2026-08-31', '2026-09-01', '2026-09-03', '2026-09-04',
    '2026-09-10', '2026-09-15', '2026-09-16', '2026-09-16', '2026-09-20'];
  doneDates.forEach((d, i) => units.push({ id: `S-${String(i + 1).padStart(4, '0')}`, title: `第${i + 1}站（EP-0${(i % 9) + 1}）`, order: i + 1, status: 'done', doneDate: d }));
  for (let i = 11; i <= 47; i++) {
    units.push({
      id: `S-${String(i).padStart(4, '0')}`,
      title: `第${i}站（EP-${i % 2 === 0 ? '01' : '03'}）`,
      order: i,
      day: `W${(i % 6) + 1}`,
      topic: `topic-${i}`,
      status: i === 11 ? 'paused' : 'planned',
    });
  }
  return { deadline, units };
};
const NOW = noon(2026, 10, 8);

test('排期数学：37 单元 × 2.6 天/站 ÷ 0.54 活跃率 → 178 天 → 2027-04-04 ≤ 考期 2027-05-22 富余 48 天', () => {
  const r = generatePlanSchedule({
    plan: ruankaoLikePlan('2027-05-22'), now: NOW,
    daysPerUnit: 2.6, activity: 0.54,
    startDate: '2026-10-08',
  });
  assert.equal(r.ok, true);
  const s = r.summary;
  assert.equal(s.remaining, 37);
  assert.equal(s.totalCalendarDays, 178);       // 37 × 2.6 ÷ 0.54 = 178.1… → round(37×4.8148)=178
  assert.equal(s.scheduledEnd, '2027-04-04');
  assert.equal(s.slackDays, 48);
  assert.match(s.formula, /37 单元 × 2\.6 天\/单元 ÷ 活跃率 0\.54 → 178 天/);
  // 第 1 单元计划完成日 = 起点 + round(4.8148) = 2026-10-13；最后一单元 2027-04-04
  const remaining = r.plan.units.filter((u) => u.status !== 'done');
  assert.equal(remaining.length, 37);
  assert.equal(remaining[0].plannedDate, '2026-10-13');
  assert.equal(remaining[36].plannedDate, '2027-04-04');
  // plannedDate 单调不降（顺序序 = 日期序）
  for (let i = 1; i < remaining.length; i++) assert.ok(remaining[i].plannedDate >= remaining[i - 1].plannedDate);
});

test('余量：×1.25 → 2027-05-19 富余 3 天（复盘「剩余站更重加 20~30%」口径）', () => {
  const r = generatePlanSchedule({
    plan: ruankaoLikePlan('2027-05-22'), now: NOW,
    daysPerUnit: 2.6, activity: 0.54, margin: 0.25,
    startDate: '2026-10-08',
  });
  assert.equal(r.ok, true);
  assert.equal(r.summary.scheduledEnd, '2027-05-19');   // round(37×2.6×1.25÷0.54)=223 天
  assert.equal(r.summary.slackDays, 3);
});

test('done 单元逐字段原样保留（完成是事实），day/topic/title 不动', () => {
  const plan = ruankaoLikePlan('2027-05-22');
  const r = generatePlanSchedule({
    plan, now: NOW, daysPerUnit: 2.6, activity: 0.54, startDate: '2026-10-08',
  });
  const before = plan.units.filter((u) => u.status === 'done');
  const after = r.plan.units.filter((u) => u.status === 'done');
  assert.deepEqual(after, before);                        // 全字段一致
  const u = r.plan.units.find((x) => x.id === 'S-0037');
  assert.equal(u.day, 'W2');                              // 内容映射不动（day ≡ 排布表命名空间）
  assert.equal(u.topic, 'topic-37');
  assert.equal(u.title, plan.units.find((x) => x.id === 'S-0037').title);
  assert.equal(u.order, 37);                              // 非交错不重排 order
});

test('不可行：排不进考期 → 报错附全算术（37×3.9÷0.54=267 天 > 226 天预算），不静默压缩', () => {
  const r = generatePlanSchedule({
    plan: ruankaoLikePlan('2027-05-22'), now: NOW,
    daysPerUnit: 3.9, activity: 0.54,
    startDate: '2026-10-08',
  });
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'infeasible');
  assert.match(r.message, /267 天/);
  assert.match(r.message, /2027-05-22/);
  assert.match(r.message, /缺口 41 天/);                 // 267 − 226
  assert.match(r.message, /天\/单元/);                    // 给出考期内可容纳的最大速率
});

test('交错：重排 order（紧跟 done 段之后），轻重交替且在学单元最前', () => {
  const map = { 'EP-01': '掌握', 'EP-02': '掌握', 'EP-03': '理解', 'EP-04': '了解' };
  const plan = {
    deadline: '2027-05-22',
    units: [
      { id: 'D1', title: 'd（EP-03）', order: 1, status: 'done', doneDate: '2026-09-01' },
      { id: 'D2', title: 'd（EP-03）', order: 2, status: 'done', doneDate: '2026-09-02' },
      { id: 'H1', title: 'h（EP-01）', order: 3, status: 'planned' },
      { id: 'H2', title: 'h（EP-02）', order: 4, status: 'planned' },
      { id: 'L1', title: 'l（EP-03）', order: 5, status: 'planned' },
      { id: 'H3', title: 'h（EP-01）', order: 6, status: 'in-progress' },
      { id: 'L2', title: 'l（EP-04）', order: 7, status: 'paused' },
    ],
  };
  const r = generatePlanSchedule({
    plan, now: NOW, daysPerUnit: 2, activity: 1,
    startDate: '2026-10-08', interleave: true, depthMap: map,
  });
  assert.equal(r.ok, true);
  assert.equal(r.summary.heavy, 3);
  assert.equal(r.summary.light, 2);
  const remaining = r.plan.units.filter((u) => u.status !== 'done');
  // 在学最前，轻先行交替（桶内稳定）：H3(in-progress) → L1 → H1 → L2 → H2（重桶余量尾排）
  assert.deepEqual(remaining.map((u) => u.id), ['H3', 'L1', 'H1', 'L2', 'H2']);
  // order 重排为 done 段之后 3..7（交错的学习顺序），done 两单元 order 原样 1..2
  assert.deepEqual(remaining.map((u) => u.order), [3, 4, 5, 6, 7]);
  assert.deepEqual(r.plan.units.filter((u) => u.status === 'done').map((u) => u.order), [1, 2]);
  // 日期随新顺序单调
  for (let i = 1; i < remaining.length; i++) assert.ok(remaining[i].plannedDate >= remaining[i - 1].plannedDate);
  assert.equal(remaining[0].plannedDate, '2026-10-10');  // round(1×2)=2 天后
});

test('诚实降级与入参守门：空计划/全完成/坏速率/坏活跃率/坏余量/过去起点/坏考期', () => {
  const base = { plan: ruankaoLikePlan('2027-05-22'), now: NOW, daysPerUnit: 2.6, activity: 0.54, startDate: '2026-10-08' };
  assert.equal(generatePlanSchedule({ ...base, plan: { units: [] } }).reason, 'empty-plan');
  assert.equal(generatePlanSchedule({ ...base, plan: { units: [{ id: 'a', title: 'a', order: 1, status: 'done', doneDate: '2026-09-01' }] } }).reason, 'complete');
  assert.equal(generatePlanSchedule({ ...base, daysPerUnit: 0 }).reason, 'bad-pace');
  assert.equal(generatePlanSchedule({ ...base, activity: 1.5 }).reason, 'bad-activity');
  assert.equal(generatePlanSchedule({ ...base, activity: 0 }).reason, 'bad-activity');
  assert.equal(generatePlanSchedule({ ...base, margin: -1 }).reason, 'bad-margin');
  assert.equal(generatePlanSchedule({ ...base, startDate: '2026-02-31' }).reason, 'bad-start');
  assert.equal(generatePlanSchedule({ ...base, startDate: '2026-10-01' }).reason, 'past-start');
  assert.equal(generatePlanSchedule({ ...base, deadline: '2027-13-01' }).reason, 'bad-deadline');
  // 无考期：照排不对照
  const noDeadline = generatePlanSchedule({ ...base, plan: { ...base.plan, deadline: undefined }, deadline: null });
  assert.equal(noDeadline.ok, true);
  assert.equal(noDeadline.summary.deadline, null);
  assert.equal(noDeadline.summary.slackDays, null);
  assert.equal(noDeadline.plan.deadline, undefined);
});

// ── CLI 装配链路（真子进程端到端；日期一律相对真实墙钟现算，测试不依赖固定「今天」）──

const CLI_MISSION = '# m\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 补码 | 掌握 | single×10 | W1 | 5 |\n| EP-03 | 流水线 | 理解 | single×8 | W1 | 4 |\n';

/** 真实墙钟 +N 天的本地 YYYY-MM-DD（CLI 的 past-start 守门吃真实 now，测试跟着钟走）。 */
const localDate = (offsetDays) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
const addDays = (s, n) => {
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  const z = (x) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${z(dt.getMonth() + 1)}-${z(dt.getDate())}`;
};

const cliTheme = () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ask-plangen-'));
  writeFileSync(path.join(dir, 'questions.json'), JSON.stringify([
    { id: 'Q1', topic: 't', examPoint: 'EP-01' }, { id: 'Q2', topic: 't', examPoint: 'EP-03' },
  ]));
  writeFileSync(path.join(dir, 'MISSION.md'), CLI_MISSION);
  return dir;
};

test('CLI 端到端：--out 写预览件不碰主题 plan.json，--json 出装配报告（数学 178 天对上）', () => {
  const dir = cliTheme();
  const planPath = path.join(dir, 'plan.json');
  const plan = ruankaoLikePlan('2027-05-22');
  writeFileSync(planPath, JSON.stringify(plan, null, 2) + '\n');
  const outPath = path.join(dir, 'preview-plan.json');
  const start = localDate(30);
  const deadline = addDays(start, 400);
  const stdout = execFileSync('node', [CLI,
    '--theme', dir,
    '--days-per-unit', '2.6', '--activity', '0.54',
    '--start', start, '--deadline', deadline,
    '--interleave',
    '--out', outPath,
    '--json'], { encoding: 'utf-8' });
  const report = JSON.parse(stdout);
  assert.equal(report.status, 'ok');
  assert.equal(report.inputs.daysPerUnit, 2.6);
  assert.equal(report.inputs.paceSource, 'flag');
  assert.equal(report.inputs.activitySource, 'flag');
  assert.equal(report.inputs.interleave, true);
  assert.equal(report.schedule.remaining, 37);
  assert.equal(report.schedule.totalCalendarDays, 178);            // 37 × 2.6 ÷ 0.54
  assert.equal(report.schedule.scheduledEnd, addDays(start, 178)); // 2026-10-08 起即 2027-04-04 同款算术
  assert.equal(report.schedule.slackDays, 400 - 178);
  assert.equal(report.output, path.resolve(outPath));
  // 主题 plan.json 原样未动（--out 预览面）
  assert.equal(readFileSync(planPath, 'utf-8'), JSON.stringify(plan, null, 2) + '\n');
  // 预览件是合法 plan.json：deadline + 全部 47 单元 + 剩余全带 plannedDate + done 带 doneDate
  const written = JSON.parse(readFileSync(outPath, 'utf-8'));
  assert.equal(written.deadline, deadline);
  assert.equal(written.units.length, 47);
  for (const u of written.units) {
    if (u.status !== 'done') assert.match(u.plannedDate, /^\d{4}-\d{2}-\d{2}$/);
    else assert.equal(u.doneDate !== undefined, true);
  }
});

test('CLI 写回默认路径 = 主题 plan.json（契约三读-改-写；done 原样、剩余换新 plannedDate）', () => {
  const dir = cliTheme();
  const planPath = path.join(dir, 'plan.json');
  writeFileSync(planPath, JSON.stringify(ruankaoLikePlan('2027-05-22'), null, 2) + '\n');
  const start = localDate(1);
  execFileSync('node', [CLI,
    '--theme', dir, '--days-per-unit', '2.6', '--activity', '0.54', '--start', start, '--deadline', addDays(start, 400)],
    { encoding: 'utf-8' });
  const after = JSON.parse(readFileSync(planPath, 'utf-8'));
  assert.equal(after.units.length, 47);
  assert.equal(after.units.filter((u) => u.status !== 'done')[0].plannedDate, addDays(start, 5)); // round(2.6/0.54)
  assert.equal(after.units.filter((u) => u.status === 'done').length, 10);
});

test('CLI 缺 plan.json → exit 1 明确报错（不发明计划）；排不进考期 → exit 1 附算术', () => {
  const dir = cliTheme(); // 有题库无 plan.json
  {
    let code = 0; let stderr = '';
    try { execFileSync('node', [CLI, '--theme', dir, '--days-per-unit', '2.6', '--activity', '0.54'], { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] }); }
    catch (e) { code = e.status; stderr = e.stderr; }
    assert.equal(code, 1, `应 exit 1：${stderr}`);
    assert.match(stderr, /不发明计划/);
  }
  // 不可行：3.9 天/站 × 37 ÷ 0.54 = 267 天 > 考期预算 100 天
  const dir2 = cliTheme();
  writeFileSync(path.join(dir2, 'plan.json'), JSON.stringify(ruankaoLikePlan('2027-05-22'), null, 2) + '\n');
  const start = localDate(30);
  const out2 = path.join(dir2, 'x.json');
  let code2 = 0; let stderr2 = '';
  try { execFileSync('node', [CLI, '--theme', dir2, '--days-per-unit', '3.9', '--activity', '0.54', '--start', start, '--deadline', addDays(start, 100), '--out', out2], { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { code2 = e.status; stderr2 = e.stderr; }
  assert.equal(code2, 1);
  assert.match(stderr2, /排不进考期/);
  assert.match(stderr2, /缺口 167 天/);
});

test('CLI 交错判据无数据（MISSION 缺失）→ exit 1；零 done 历史且无显式速率 → exit 1 提示 --days-per-unit', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'ask-plangen-'));
  writeFileSync(path.join(dir, 'questions.json'), JSON.stringify([{ id: 'Q1', topic: 't' }]));
  writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(ruankaoLikePlan(null), null, 2) + '\n');
  {
    let code = 0; let stderr = '';
    try { execFileSync('node', [CLI, '--theme', dir, '--days-per-unit', '2.6', '--activity', '0.54', '--interleave'], { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] }); }
    catch (e) { code = e.status; stderr = e.stderr; }
    assert.equal(code, 1);
    assert.match(stderr, /交错判据无数据/);
  }
  const dir2 = cliTheme();
  writeFileSync(path.join(dir2, 'plan.json'), JSON.stringify({
    deadline: '2027-05-22',
    units: [
      { id: 'A', title: 'a（EP-01）', order: 1, status: 'planned' },
      { id: 'B', title: 'b（EP-03）', order: 2, status: 'planned' },
    ],
  }, null, 2) + '\n');
  let code = 0; let stderr = '';
  try { execFileSync('node', [CLI, '--theme', dir2, '--activity', '1'], { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] }); }
  catch (e) { code = e.status; stderr = e.stderr; }
  assert.equal(code, 1);
  assert.match(stderr, /--days-per-unit/);
});

// ── 5. 自动重排触发 + 审计写回（v0.27 #125，spec #118：断档/落后不再累积红字债）──────

import { shouldReschedule } from './plan-generate.mjs';

/** 落后夹具（**纯函数段专用**，日期冻结、配注入的冻结 NOW=2026-10-08：09-01→10-08=37 恒
 *  成立）：A 逾期（plannedDate 09-01）、B 未来；2 个 done 落 14 天窗给速率。
 *  ⚠️ CLI 端到端段（now=Date.now() 真实墙钟）禁用本夹具——triggerDays 会随今天漂移，
 *  那边用相对墙钟版 behindPlanCli()。 */
const behindPlan = (extra = {}) => ({
  deadline: '2026-12-31',
  units: [
    { id: 'D-1', title: 'done1', order: 1, plannedDate: '2026-09-25', status: 'done', doneDate: '2026-09-28' },
    { id: 'D-2', title: 'done2', order: 2, plannedDate: '2026-09-26', status: 'done', doneDate: '2026-10-01' },
    { id: 'A', title: '逾期单元', order: 3, plannedDate: '2026-09-01', status: 'planned' },
    { id: 'B', title: '未来单元', order: 4, plannedDate: '2026-11-20', status: 'planned' },
  ],
  ...extra,
});

test('shouldReschedule：behind 夹具触发（reason=behind，triggerDays=落后天数，不看 deadline）', () => {
  const r = shouldReschedule({ plan: behindPlan(), progress: null, now: NOW, questionIds: ['Q1'], theme: 't' });
  assert.equal(r.needed, true);
  assert.equal(r.reason, 'behind');
  assert.equal(r.triggerDays, 37);   // 09-01 → 10-08 = 37 天（锚逾期单元的最大 plannedDate）
  // 无 deadline 也触发：逾期是日程事实，修复动作不是催办文案
  const noDl = shouldReschedule({ plan: behindPlan({ deadline: undefined }), progress: null, now: NOW, questionIds: ['Q1'], theme: 't' });
  assert.equal(noDl.reason, 'behind');
});

test('shouldReschedule：gap 夹具触发（断档 ≥3 且后移建议可算 → reason=gap 带 shiftDays）', () => {
  // 断档 5 天（最后接触 10-03）+ 速率 2/14 → 剩 10 单元 ceil(10/(2/14))=70 天 > 到 deadline 的 22 天
  const plan = {
    deadline: '2026-10-30',
    units: [
      { id: 'D-1', title: 'd1', order: 1, status: 'done', doneDate: '2026-09-28' },
      { id: 'D-2', title: 'd2', order: 2, status: 'done', doneDate: '2026-10-01' },
      ...Array.from({ length: 10 }, (_, i) => ({ id: `P-${i}`, title: `p${i}`, order: 3 + i, status: 'planned' })),
    ],
  };
  const progress = { answers: { Q1: { submittedAt: noon(2026, 10, 3) } } };
  const r = shouldReschedule({ plan, progress, now: NOW, questionIds: ['Q1'], theme: 't' });
  assert.equal(r.needed, true);
  assert.equal(r.reason, 'gap');
  assert.equal(r.triggerDays, 5);
  assert.equal(r.shiftDays, 70 - 22);   // 48
});

test('shouldReschedule：在轨 / 断档但速率无数据 / 今天已重排 → 不触发（诚实降级 + 幂等闸门）', () => {
  // 在轨：无逾期、断档 0（今天有接触）
  const onTrack = {
    units: [
      { id: 'A', title: 'a', order: 1, plannedDate: '2026-11-01', status: 'planned' },
    ],
  };
  const progressToday = { answers: { Q1: { submittedAt: NOW } } };
  assert.deepEqual(
    { ...shouldReschedule({ plan: onTrack, progress: progressToday, now: NOW, questionIds: ['Q1'], theme: 't' }) },
    { needed: false, reason: 'on-track', triggerDays: null },
  );
  // 断档 5 天但零 done（速率无数据）→ gap 判定里 no-rate 不触发，回落 on-track（绝不无速率硬排）
  const noRate = { units: [{ id: 'A', title: 'a', order: 1, plannedDate: '2026-11-01', status: 'planned' }] };
  const progress5d = { answers: { Q1: { submittedAt: noon(2026, 10, 3) } } };
  assert.equal(shouldReschedule({ plan: noRate, progress: progress5d, now: NOW, questionIds: ['Q1'], theme: 't' }).reason, 'on-track');
  // 今天已重排（审计 at=今天）→ 幂等闸门，同一天不重复挪日程
  const rescheduledToday = behindPlan({ rescheduled: [{ at: NOW, reason: 'behind', triggerDays: 37, start: '2026-10-08', scheduledEnd: '2026-10-08' }] });
  assert.equal(shouldReschedule({ plan: rescheduledToday, progress: null, now: NOW, questionIds: ['Q1'], theme: 't' }).reason, 'already-rescheduled-today');
  // 昨天重排的（旧闸门）不豁免——但重排后 plannedDate 已挪走，behind 自然消除（这是主路径）
  // 无计划（units 空）→ no-plan
  assert.equal(shouldReschedule({ plan: { units: [] }, progress: null, now: NOW }).reason, 'no-plan');
});

test('generatePlanSchedule 审计写回：rescheduled 追加不覆盖（历史全留 = 可追溯），缺省 reason=manual、at 回落 now', () => {
  const withHistory = behindPlan({
    rescheduled: [{ at: noon(2026, 9, 1), reason: 'manual', triggerDays: null, start: '2026-09-01', scheduledEnd: '2026-10-01' }],
  });
  const r = generatePlanSchedule({
    plan: withHistory, now: NOW,
    daysPerUnit: 2, activity: 1,
    rescheduleAt: NOW, rescheduleReason: 'behind', rescheduleTriggerDays: 37,
  });
  assert.equal(r.ok, true);
  assert.equal(r.plan.rescheduled.length, 2);                       // 追加：历史 1 + 本次 1
  assert.deepEqual(r.plan.rescheduled[0], { at: noon(2026, 9, 1), reason: 'manual', triggerDays: null, start: '2026-09-01', scheduledEnd: '2026-10-01' });
  const last = r.plan.rescheduled[1];
  assert.equal(last.at, NOW);
  assert.equal(last.reason, 'behind');
  assert.equal(last.triggerDays, 37);
  assert.equal(last.start, '2026-10-08');                           // 起点 = 今天（起点起排）
  assert.equal(last.scheduledEnd, r.summary.scheduledEnd);          // 尽头 = 排期尽头
  // 缺省：#121 手动路径不传审计三件 → manual + at 回落 now
  const manual = generatePlanSchedule({ plan: behindPlan(), now: NOW, daysPerUnit: 2, activity: 1 });
  assert.equal(manual.plan.rescheduled.length, 1);
  assert.equal(manual.plan.rescheduled[0].reason, 'manual');
  assert.equal(manual.plan.rescheduled[0].at, NOW);
  assert.equal(manual.plan.rescheduled[0].triggerDays, null);
});

// ── 6. CLI 自动重排端到端（--auto / --dry-run / --reason；#125 验收：写回、可追溯、可否决）──────

/** CLI 段专用的落后夹具（相对真实墙钟版）：CLI 子进程的 now = Date.now()（plan-generate.mjs），
 *  本段纪律（上方 :290）「日期一律相对真实墙钟现算，测试不依赖固定『今天』」——冻结版
 *  behindPlan()（09-01 硬编码，配纯函数段注入的冻结 NOW）在这里会把 triggerDays 钉死在
 *  「今天恰为 2026-10-08」的 37 上，明天起变 38 断言必红。本夹具：A 逾期 localDate(-37) →
 *  triggerDays 恒 37；B 未来 localDate(40) → 恒不逾期（behind 锚「逾期单元的最大
 *  plannedDate」，B 逾期会改锚）；deadline localDate(80) → 排期恒 feasible；done 用相对
 *  doneDate（速率已显式传 --days-per-unit，done 只服务 actualAt 形态）。 */
const behindPlanCli = () => ({
  deadline: localDate(80),
  units: [
    { id: 'D-1', title: 'done1', order: 1, plannedDate: localDate(-8), status: 'done', doneDate: localDate(-7) },
    { id: 'A', title: '逾期单元', order: 3, plannedDate: localDate(-37), status: 'planned' },
    { id: 'B', title: '未来单元', order: 4, plannedDate: localDate(40), status: 'planned' },
  ],
});

test('CLI --auto：落后夹具 → 判 behind 写回 plan.json + 审计可追溯 + 逾期消除；同日再跑 → noop 幂等', () => {
  const dir = cliTheme();
  const planPath = path.join(dir, 'plan.json');
  writeFileSync(planPath, JSON.stringify(behindPlanCli(), null, 2) + '\n');
  const progressPath = path.join(dir, 'progress.json');
  writeFileSync(progressPath, JSON.stringify({ version: 1, answers: {} }) + '\n');
  // 第一跑：--auto 判定 behind → 写回（显式速率 2 天/单元、活跃率 1，数学确定）
  const out1 = JSON.parse(execFileSync('node', [CLI,
    '--theme', dir, '--auto',
    '--days-per-unit', '2', '--activity', '1',
    '--progress', progressPath, '--json'], { encoding: 'utf-8' }));
  assert.equal(out1.status, 'ok');
  assert.equal(out1.reschedule.reason, 'behind');
  assert.equal(out1.reschedule.reasonWhere, '落后触发（存在逾期单元）');
  const after = JSON.parse(readFileSync(planPath, 'utf-8'));
  // 逾期消除：所有剩余单元 plannedDate ≥ 今天（今天起按速率落位——挪日期修复，不陈列欠账）
  const today = localDate(0);
  for (const unit of after.units.filter((x) => x.status !== 'done')) {
    assert.ok(unit.plannedDate >= today, `${unit.id} 的新日程 ${unit.plannedDate} 应 ≥ 今天 ${today}`);
  }
  // 审计可追溯：reason/triggerDays/start/scheduledEnd 落位（triggerDays 恒 37——
  // 夹具相对墙钟 localDate(-37) 与 CLI 的 Date.now() 同源同天现算，跨天稳定）
  assert.equal(after.rescheduled.length, 1);
  assert.equal(after.rescheduled[0].reason, 'behind');
  assert.equal(after.rescheduled[0].triggerDays, 37);
  assert.equal(after.rescheduled[0].start, today);
  // 第二跑（同一天）：幂等闸门 → noop，文件不再变化
  const before2 = readFileSync(planPath, 'utf-8');
  const out2 = JSON.parse(execFileSync('node', [CLI,
    '--theme', dir, '--auto',
    '--days-per-unit', '2', '--activity', '1',
    '--progress', progressPath, '--json'], { encoding: 'utf-8' }));
  assert.equal(out2.status, 'noop');
  assert.equal(out2.reason, 'already-rescheduled-today');
  assert.equal(readFileSync(planPath, 'utf-8'), before2);
});

test('CLI --auto 在轨（无逾期、今天有接触）→ noop on-track 不写任何文件', () => {
  const dir = cliTheme();
  const planPath = path.join(dir, 'plan.json');
  const onTrack = {
    deadline: '2027-05-22',
    units: [
      { id: 'A', title: 'a', order: 1, status: 'done', doneDate: localDate(-1) },
      { id: 'B', title: 'b', order: 2, plannedDate: localDate(10), status: 'planned' },
    ],
  };
  writeFileSync(planPath, JSON.stringify(onTrack, null, 2) + '\n');
  const progressPath = path.join(dir, 'progress.json');
  writeFileSync(progressPath, JSON.stringify({ version: 1, answers: { Q1: { submittedAt: Date.now() } } }) + '\n');
  const before = readFileSync(planPath, 'utf-8');
  const out = JSON.parse(execFileSync('node', [CLI,
    '--theme', dir, '--auto',
    '--days-per-unit', '2', '--activity', '1',
    '--progress', progressPath, '--json'], { encoding: 'utf-8' }));
  assert.equal(out.status, 'noop');
  assert.equal(out.reason, 'on-track');
  assert.equal(readFileSync(planPath, 'utf-8'), before);
});

test('CLI --dry-run：落后夹具只出建议不写回（可否决执行面：学习者点头后去掉 flag 才落盘）', () => {
  const dir = cliTheme();
  const planPath = path.join(dir, 'plan.json');
  const original = JSON.stringify(behindPlanCli(), null, 2) + '\n';
  writeFileSync(planPath, original);
  const progressPath = path.join(dir, 'progress.json');
  writeFileSync(progressPath, JSON.stringify({ version: 1, answers: {} }) + '\n');
  const out = JSON.parse(execFileSync('node', [CLI,
    '--theme', dir, '--auto', '--dry-run',
    '--days-per-unit', '2', '--activity', '1',
    '--progress', progressPath, '--json'], { encoding: 'utf-8' }));
  assert.equal(out.status, 'suggested');
  assert.equal(out.reschedule.dryRun, true);
  assert.equal(out.reschedule.reason, 'behind');
  assert.equal(out.output, null);
  assert.equal(readFileSync(planPath, 'utf-8'), original);   // 主题 plan.json 原样未动
});

test('CLI --auto 与 --reason 互斥 → exit 1；--reason 坏值 → exit 1', () => {
  const dir = cliTheme();
  writeFileSync(path.join(dir, 'plan.json'), JSON.stringify(behindPlanCli(), null, 2) + '\n');
  for (const [args, re] of [
    [['--auto', '--reason', 'behind'], /互斥/],
    [['--reason', 'whim'], /不在 behind\|gap\|manual/],
  ]) {
    let code = 0; let stderr = '';
    try {
      execFileSync('node', [CLI, '--theme', dir, '--days-per-unit', '2', '--activity', '1', ...args], { encoding: 'utf-8', stdio: ['ignore', 'ignore', 'pipe'] });
    } catch (e) { code = e.status; stderr = e.stderr; }
    assert.equal(code, 1, `应 exit 1：${stderr}`);
    assert.match(stderr, re);
  }
});
