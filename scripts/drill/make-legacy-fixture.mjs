#!/usr/bin/env node
// make-legacy-fixture.mjs — 一键生成「v0.13 形态存量项目」夹具（U6 #61，spec #55 行为级验收面）。
//
// 夹具形态（模拟一个 v0.13 时代用 F1 建好、学了一阵子的用户项目）：
//   <dest>/
//   ├── kit/                    v0.13.1 跟踪面快照（git archive 拉取）——无 kit-version.json（版本未知）
//   │   └── apps/quiz-app/progress.json   合成的旧进度（真实 Date.now()，答题/闪卡/课已学全有）
//   ├── theme/net-basics/       用户主题（外部主题包形态，住 kit 外——升级不许碰它）：
//   │   ├── MISSION.md          含考点排布表（v0.10 契约，已对齐）
//   │   ├── questions.json      8 题，examPoint/day 齐
//   │   ├── flashcards.json     6 卡，全部【无 examPoint】← 故意的契约缺口（v0.11 契约，掌握度静默退纯题维度）
//   │   ├── lessons/            2 课
//   │   └── study/records/      1 条 v0.13 旧格式学习记录（含「口头题计数」节）；无 oral-attempts.json（v0.14 首用自建）
//   └── .drill-manifest.json    夹具指纹（progress/主题文件 sha256）——check-upgrade.mjs 用它断言「分毫未失」
//
// 可重复执行：每次重生成（时间戳重新取）。主题内容确定性（不含随机数），sha 随 progress 时间戳变化。
//
// 用法：node scripts/drill/make-legacy-fixture.mjs [dest]   # dest 默认 /tmp/ask-drill/project
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const SOURCE_TAG = 'v0.13.1'; // 存量项目的 kit 代际：v0.13.1（无 kit-version.json = 版本未知）

const dest = resolve(process.argv[2] || '/tmp/ask-drill/project');
const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// ── 1. kit：v0.13.1 跟踪面快照（同 sync-plugin 的拷贝面：apps/quiz-app + examples/dev-intro）──
rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, 'kit'), { recursive: true });
// git archive 出 tar 流 → 临时文件 → tar -x 落盘（跨平台走 git 自带的 tar 生成，解包用系统 tar）
const tmp = mkdtempSync(join(tmpdir(), 'ask-drill-tar-'));
const tarPath = join(tmp, 'kit.tar');
const buf = execFileSync('git', ['archive', SOURCE_TAG, '--', 'apps/quiz-app', 'examples/dev-intro'], { cwd: REPO_ROOT, maxBuffer: 64 * 1024 * 1024 });
writeFileSync(tarPath, buf);
execFileSync('tar', ['-xf', tarPath, '-C', join(dest, 'kit')], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
// v0.13.1 快照天然没有 kit-version.json——「版本未知 = 按最老」正是要演练的形态，不做任何补充。

// ── 2. 旧 progress（v0.13 形态：答题 + 看题 + 闪卡 SRS + 课已学全，真实时间戳）──
const progress = {
  version: 1,
  answers: {
    'NET-001': { selected: ['A'], correct: true, submittedAt: now - 3 * DAY },
    'NET-002': { selected: ['对'], correct: false, wrongCount: 2, streak: 1, submittedAt: now - 2 * DAY },
    'NET-003': { selected: ['B'], correct: true, submittedAt: now - 2 * DAY },
    'NET-004': { selected: ['A', 'C'], correct: false, wrongCount: 1, streak: 0, submittedAt: now - DAY },
    'NET-005': { selected: ['A'], correct: true, submittedAt: now - DAY },
    'NET-006': { selected: ['错'], correct: true, submittedAt: now - DAY },
  },
  read: { 'NET-007': now - DAY, 'NET-008': now - DAY },
  srs: {
    'FC-NET-01': { phase: 'review', due: now + 2 * DAY, interval: 6, easeFactor: 2.5, reps: 4, lapses: 0 },
    'FC-NET-02': { phase: 'learning', due: now + 10 * 60 * 1000, stepsIdx: 0, reps: 1, lapses: 0 },
    'FC-NET-03': { phase: 'review', due: now + 5 * DAY, interval: 4, easeFactor: 2.5, reps: 3, lapses: 1 },
  },
  srsMeta: { newToday: { date: '2000-01-01', count: 0 } },
  coursesRead: { 'net-basics/lesson-01.html': now - 2 * DAY },
};
writeFileSync(join(dest, 'kit/apps/quiz-app/progress.json'), JSON.stringify(progress, null, 2) + '\n');

// ── 3. 用户主题 net-basics（外部主题包，住 kit 外）──
const themeDir = join(dest, 'theme', 'net-basics');
mkdirSync(join(themeDir, 'lessons'), { recursive: true });
mkdirSync(join(themeDir, 'study/records'), { recursive: true });

writeFileSync(join(themeDir, 'MISSION.md'), `---
theme: net-basics
title: 网络基础速成
---

# 网络基础速成

能力大纲：把日常开发里绕不开的网络概念（分层、子网、传输层协议、HTTP 语义）练到能做对题、能讲清楚。

## 考点排布表

大纲是唯一权威——先定考什么、考多深，再照表产题产卡。

| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |
|--------|------|------|-----------|-----|--------|
| EP-01 | OSI 分层 | 掌握 | single×1, judge×1 | D1 | 2 |
| EP-02 | 子网掩码 | 理解 | single×1, multi×1 | D1 | 2 |
| EP-03 | TCP 与 UDP | 掌握 | single×1, judge×1 | D2 | 1 |
| EP-04 | HTTP 状态码 | 理解 | single×1, multi×1 | D2 | 1 |
`);

const questions = [
  { id: 'NET-001', type: 'single', source: 'net-basics', topic: 'osi', day: 'D1', examPoint: 'EP-01',
    question: 'OSI 参考模型共几层？',
    options: { A: '4 层', B: '5 层', C: '7 层', D: '9 层' }, answer: ['C'],
    analysis: 'OSI 是 7 层：物理、数据链路、网络、传输、会话、表示、应用。' },
  { id: 'NET-002', type: 'judge', source: 'net-basics', topic: 'osi', day: 'D1', examPoint: 'EP-01',
    question: '传输层在 OSI 模型里位于网络层之下。', options: { 对: '对', 错: '错' }, answer: ['错'],
    analysis: '由下往上：网络层（第 3 层）在传输层（第 4 层）之下。' },
  { id: 'NET-003', type: 'single', source: 'net-basics', topic: 'subnet', day: 'D1', examPoint: 'EP-02',
    question: '/24 的子网掩码点分十进制写法是？',
    options: { A: '255.255.255.0', B: '255.255.0.0', C: '255.0.0.0', D: '255.255.255.255' }, answer: ['A'],
    analysis: '/24 = 前 24 位为 1 = 255.255.255.0。' },
  { id: 'NET-004', type: 'multi', source: 'net-basics', topic: 'subnet', day: 'D1', examPoint: 'EP-02',
    question: '关于 /26 子网（正确说法全选）：',
    options: { A: '每个子网 64 个地址', B: '主机位 6 位', C: '可用主机地址 62 个', D: '掩码是 255.255.255.192' }, answer: ['A', 'B', 'C', 'D'],
    analysis: '主机位 6 位 → 64 地址，去网络/广播地址得 62 可用；掩码第三段 192。' },
  { id: 'NET-005', type: 'single', source: 'net-basics', topic: 'transport', day: 'D2', examPoint: 'EP-03',
    question: '需要可靠传输、按序到达，应选哪个传输层协议？',
    options: { A: 'TCP', B: 'UDP', C: 'ICMP', D: 'ARP' }, answer: ['A'],
    analysis: 'TCP 有确认重传与排序；UDP 不保证可靠与顺序。' },
  { id: 'NET-006', type: 'judge', source: 'net-basics', topic: 'transport', day: 'D2', examPoint: 'EP-03',
    question: 'UDP 首部比 TCP 首部更小。', options: { 对: '对', 错: '错' }, answer: ['对'],
    analysis: 'UDP 首部 8 字节，TCP 至少 20 字节。' },
  { id: 'NET-007', type: 'single', source: 'net-basics', topic: 'http', day: 'D2', examPoint: 'EP-04',
    question: '资源已永久搬家，服务器应返回哪个状态码？',
    options: { A: '200', B: '301', C: '302', D: '404' }, answer: ['B'],
    analysis: '301 永久重定向，302 临时。' },
  { id: 'NET-008', type: 'multi', source: 'net-basics', topic: 'http', day: 'D2', examPoint: 'EP-04',
    question: '属于客户端这一侧问题的状态码（正确说法全选）：',
    options: { A: '400 请求语法错', B: '401 未认证', C: '403 已认证但无权限', D: '502 网关坏' }, answer: ['A', 'B', 'C'],
    analysis: '4xx 归因客户端；502 是网关/服务侧。' },
];
writeFileSync(join(themeDir, 'questions.json'), JSON.stringify(questions, null, 2) + '\n');

// v0.13 形态闪卡：全部不带 examPoint —— 升级前掌握度判据退纯题维度（F13 要点名的契约缺口）
const flashcards = [
  { id: 'FC-NET-01', front: 'OSI 七层从下往上？', back: '物理 → 数据链路 → 网络 → 传输 → 会话 → 表示 → 应用', source: 'net-basics' },
  { id: 'FC-NET-02', front: '/24 掩码的点分十进制？', back: '255.255.255.0（前 24 位为 1）', source: 'net-basics' },
  { id: 'FC-NET-03', front: '/26 每个子网多少可用主机地址？', back: '62（64 地址去网络地址与广播地址）', source: 'net-basics' },
  { id: 'FC-NET-04', front: 'TCP 与 UDP 谁保证按序可靠？', back: 'TCP（确认重传 + 排序）；UDP 只管尽力交付', source: 'net-basics' },
  { id: 'FC-NET-05', front: 'UDP 与 TCP 首部大小？', back: 'UDP 8 字节；TCP ≥ 20 字节', source: 'net-basics' },
  { id: 'FC-NET-06', front: '301 与 302 的区别一句话？', back: '301 永久搬家；302 临时出门', source: 'net-basics' },
];
writeFileSync(join(themeDir, 'flashcards.json'), JSON.stringify(flashcards, null, 2) + '\n');

writeFileSync(join(themeDir, 'lessons/lesson-01.html'), `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><title>分层与子网</title></head>
<body><h1>分层与子网</h1><p>OSI 七层与 TCP/IP 四层的对照；子网掩码的位运算。</p></body></html>
`);
writeFileSync(join(themeDir, 'lessons/lesson-02.html'), `<!doctype html>
<html lang="zh"><head><meta charset="utf-8"><title>传输层与 HTTP 语义</title></head>
<body><h1>传输层与 HTTP 语义</h1><p>TCP/UDP 取舍；HTTP 状态码家族划分。</p></body></html>
`);

// v0.13 旧格式学习记录（「口头题计数」节——v0.14 起停写但解析器照读合并）
writeFileSync(join(themeDir, 'study/records/01-osi-layers.md'), `---
id: 1
topic: OSI 分层
mode: quick
status: done
---

## 已过考点
- OSI 分层 · 金句：「下层为上层服务」

## 错的点
- 把传输层和数据链路层的顺序说反——已当场纠

## 待办
- [x] OSI 分层

## 口头题计数
- EP-01 OSI 分层：问 3 对 2
`);

// ── 4. 夹具指纹（.drill-manifest.json）──
const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const themeShas = {};
for (const rel of ['MISSION.md', 'questions.json', 'flashcards.json', 'lessons/lesson-01.html', 'lessons/lesson-02.html', 'study/records/01-osi-layers.md']) {
  themeShas[rel] = sha256(readFileSync(join(themeDir, rel)));
}
const manifest = {
  version: 1,
  sourceTag: SOURCE_TAG,
  themeDir: 'theme/net-basics', // check-upgrade.mjs 按它定位主题（不硬编码）
  generatedAt: new Date(now).toISOString(),
  progressSha: sha256(readFileSync(join(dest, 'kit/apps/quiz-app/progress.json'))),
  themeShas,
  notes: 'check-upgrade.mjs 用它断言：progress 与主题内容在升级前后逐字节一致（F13 完成标志）',
};
writeFileSync(join(dest, '.drill-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log(`[drill] 存量项目夹具已生成：${dest}`);
console.log(`[drill] kit 代际：${SOURCE_TAG}（无 kit-version.json → 版本未知）`);
console.log(`[drill] 契约缺口：闪卡 6 张全部无 examPoint 映射（掌握度退纯题维度）；记录为 v0.13 旧格式；无 oral-attempts.json`);
console.log(`[drill] 指纹：.drill-manifest.json（progress sha=${manifest.progressSha.slice(0, 12)}…）`);
