// mastery-report.test.mjs — mastery-report CLI 端到端测试（#119 AC3 的 report 面）。
//
// 跑真的子进程：临时外部主题包（questions/flashcards/MISSION + 私有 study/records/
// oral-attempts.json）+ 临时进度文件 → `node mastery-report.mjs --theme <dir> --progress
// <file> --json` → 断言 points[].status 与跨侧一致夹具的期望四态逐考点相等。
// 判据本体在 lib/mastery.mjs（单测见 mastery.test.mjs），这里证明的是装配链路：
// readOralAttempts → groupOralAttempts → oralMastery → oralByEp → masteryByExamPoint，
// 以及零 srs 记录（从不使用闪卡）的考点题全对即报 mastered（AC1）。
// 注意：文件住在 lib/ 是因为根 package.json 的 node --test glob 只扫 scripts/lib/*.test.mjs。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixture, expected } from './fixtures/mastery-cross-fixture.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPORT = resolve(HERE, '..', 'mastery-report.mjs');

const MISSION = '# m\n\n| 考点id | 考点 | 深度 | 题型×题量 | day | 闪卡数 |\n|---|---|---|---|---|---|\n'
  + '| EP-01 | 暂存区 | 掌握 | single×2 | D1 | 0 |\n| EP-02 | revert | 理解 | single×2 | D1 | 0 |\n'
  + '| EP-03 | chmod | 掌握 | single×2 | D2 | 1 |\n| EP-04 | 相对路径 | 了解 | single×2 | D2 | 2 |\n'
  + '| EP-05 | 分支模型 | 掌握 | single×2 | D3 | 0 |\n';

test('mastery-report --json：跨侧一致夹具端到端输出期望四态（零闪卡考点题全对报 mastered）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ask-mastery-'));
  try {
    // 外部主题包（含路径分隔符 → resolveThemeDir 外部形态）
    writeFileSync(join(dir, 'questions.json'), JSON.stringify(fixture.questions));
    writeFileSync(join(dir, 'flashcards.json'), JSON.stringify(fixture.flashcards));
    writeFileSync(join(dir, 'MISSION.md'), MISSION);
    mkdirSync(join(dir, 'study', 'records'), { recursive: true });
    writeFileSync(join(dir, 'study', 'records', 'oral-attempts.json'), JSON.stringify(fixture.oralAttempts));
    const progressPath = join(dir, 'progress.json');
    writeFileSync(progressPath, JSON.stringify({ answers: fixture.answers, srs: fixture.srs }));

    const out = execFileSync(
      process.execPath,
      [REPORT, '--theme', dir, '--progress', progressPath, '--json'],
      { encoding: 'utf-8' },
    );
    const report = JSON.parse(out);
    const got = Object.fromEntries(report.points.map((p) => [p.ep, p.status]));
    assert.deepEqual(got, expected);
    // 口述四态同时作为 oralStatus 透出（判据输入可见性）
    const oral = Object.fromEntries(report.points.filter((p) => p.oralStatus).map((p) => [p.ep, p.oralStatus]));
    assert.deepEqual(oral, { 'EP-01': 'mastered', 'EP-03': 'inProgress', 'EP-04': 'inProgress', 'EP-05': 'weak' });
    // 汇总：EP-02 映射了卡但零 srs 记录、题全对 → mastered（AC1）；EP-03 证据不足；EP-05 口述负面
    assert.equal(report.summary.mastered, 3);
    assert.equal(report.summary.inProgress, 1);
    assert.equal(report.summary.weak, 1);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// #122 实时回流：progress.oralAttempts（教练 POST /api/oral-attempts 的实时副本）与主题包
// 流水并流——同笔作答四元组去重、只在本主题回流里的新条目照进判据、他主题条目不串门。
// 场景：主题包流水 = 跨侧夹具原样；progress 带 ①EP-01 三条重复（theme 标记、同四元组）
// ②EP-03 第三条新作答（只经 API 回流，包内没有）③他主题的 EP-01 判错条目（若串门会把
// EP-01 拖 weak）。期望：EP-01 问数不膨胀仍 mastered；EP-03 因新回流条目解锁 mastered。
test('mastery-report --json：progress.oralAttempts 实时副本并流（去重不重复计数、他主题不串门）', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ask-mastery-'));
  try {
    writeFileSync(join(dir, 'questions.json'), JSON.stringify(fixture.questions));
    writeFileSync(join(dir, 'flashcards.json'), JSON.stringify(fixture.flashcards));
    writeFileSync(join(dir, 'MISSION.md'), MISSION);
    mkdirSync(join(dir, 'study', 'records'), { recursive: true });
    writeFileSync(join(dir, 'study', 'records', 'oral-attempts.json'), JSON.stringify(fixture.oralAttempts));

    const theme = basename(dir);   // 外部主题包：主题名 = 目录 basename
    const progressPath = join(dir, 'progress.json');
    writeFileSync(progressPath, JSON.stringify({
      answers: fixture.answers,
      srs: fixture.srs,
      oralAttempts: [
        // ① 包内 EP-01 三条的同一笔（theme 标记不影响四元组）→ 去重
        ...fixture.oralAttempts.filter((a) => a.target.startsWith('EP-01')).map((a) => ({ theme, ...a })),
        // ② 只经 API 回流的 EP-01 新作答？不——给 EP-03 补第三条对（包内只有两条，封顶 0.8）
        { theme, target: 'EP-03 chmod', correct: true, at: 5500, source: 'recall' },
        // ③ 他主题的 EP-01 判错——若串门，EP-01 口述最近判错 → weak
        { theme: 'other-theme', target: 'EP-01 暂存区', correct: false, at: 99999, source: 'recall' },
      ],
    }));

    const out = execFileSync(
      process.execPath,
      [REPORT, '--theme', dir, '--progress', progressPath, '--json'],
      { encoding: 'utf-8' },
    );
    const report = JSON.parse(out);
    const got = Object.fromEntries(report.points.map((p) => [p.ep, p.status]));
    assert.deepEqual(got, {
      'EP-01': 'mastered',   // 去重生效：问数不膨胀、他主题判错不串门，仍口述达标
      'EP-02': 'mastered',   // 无口述数据 chat-first 解锁不变
      'EP-03': 'mastered',   // API 回流的第三条对解锁（0.8 → 1.0）
      'EP-04': 'mastered',   // 闪卡替代通道不变
      'EP-05': 'weak',       // 包内负面证据不变
    });
    // EP-01 去重不膨胀：问 3（包内 3 条，progress 重复 3 条 + 他主题 1 条都不计入）
    const ep01 = report.oral.targets.find((t) => t.target === 'EP-01');
    assert.equal(ep01.asked, 3);
    assert.equal(ep01.correct, 3);
    // EP-03 计入 API 回流条目：问 3 对 3
    const ep03 = report.oral.targets.find((t) => t.target === 'EP-03');
    assert.deepEqual([ep03.asked, ep03.correct], [3, 3]);
    // fromProgress = 本主题提取条数（去重前口径）：EP-01 三条重复 + EP-03 一条 = 4（他主题不计）
    assert.equal(report.oral.fromProgress, 4);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── 口述错因台账（#132，spec #131 / 决议 #128）：报告消费面端到端 ──────────────
//
// 装配链路：readMisconceptions（主题过滤）→ deriveMisconceptionStatuses（并流后的口述流水
// 派生状态）→ misconceptionView（三桶）→ points[].misconceptions（按 EP join）。断言面：
// 双源错因 join（profile 题 id 来源 ∪ 台账口述来源，同 EP 并存）、主题隔离（他主题同号
// EP-03 不串用）、未定位桶不归 EP、状态派生（open/corrected）、无台账/坏台账字段静默缺席
// （输出与功能前零变化）、v1.2 掌握判据不受台账影响（台账是证据源不是判据输入）。

const misEntry = (over = {}) => ({
  theme: undefined, // 缺省由调用方覆写（theme 字段 = 读端过滤键）
  target: 'EP-03 chmod', ep: 'EP-03', node: null, name: 'chmod', via: 'ep',
  observed: { text: '把 4 说成读权限', at: 3000, source: 'recall' },
  diagnosis: { text: '权限位与八进制对应记反', at: 3000 },
  questionId: 'C1', status: 'open',
  ...over,
});

test('mastery-report --json：台账双源 join——口述错因与档案错因同 EP 并存、状态按口述流水派生、未定位不归 EP、他主题同号不串用', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ask-mastery-'));
  try {
    writeFileSync(join(dir, 'questions.json'), JSON.stringify(fixture.questions));
    writeFileSync(join(dir, 'flashcards.json'), JSON.stringify(fixture.flashcards));
    writeFileSync(join(dir, 'MISSION.md'), MISSION);
    mkdirSync(join(dir, 'study', 'records'), { recursive: true });
    writeFileSync(join(dir, 'study', 'records', 'oral-attempts.json'), JSON.stringify(fixture.oralAttempts));
    // profile：题库题 id 来源的档案错因挂在 EP-03（双源 join 的另一源——与台账同 EP 并存）
    writeFileSync(join(dir, 'study', 'records', 'profile.json'), JSON.stringify({
      version: 1, theme: 'x', globalPatterns: [],
      examPoints: [{ name: 'chmod', questionIds: ['C1', 'C2'], wrongReasons: ['权限位组合不熟'], advice: '按 rwx 折算', timesGrilled: 2 }],
    }));
    const theme = basename(dir);
    writeFileSync(join(dir, 'study', 'records', 'misconceptions.json'), JSON.stringify([
      // ① EP-03 台账条目：observed.at=3000 < 包内流水 EP-03 后续两条对（4000/5000）→ corrected
      misEntry({ theme }),
      // ② EP-05 台账条目：observed.at=9000，后续仅 10000 判错 → open（最近一次不是答对）
      misEntry({ theme, target: 'EP-05 分支模型', ep: 'EP-05', name: '分支模型', observed: { text: '把合并说成覆盖', at: 9000, source: 'recite' }, diagnosis: null, questionId: null }),
      // ③ 裸名未定位条目：不在排布表 → 未定位桶，永不强归 EP
      misEntry({ theme, target: '补零权限位', ep: null, name: '补零权限位', via: null, observed: { text: '077 说成 77', at: 9500, source: 'recite' }, diagnosis: null, questionId: null }),
      // ④ 他主题条目：同号 EP-03——读端按 theme 过滤，不得串入本主题视图
      misEntry({ theme: 'other-theme' }),
    ]));

    const progressPath = join(dir, 'progress.json');
    writeFileSync(progressPath, JSON.stringify({ answers: fixture.answers, srs: fixture.srs }));
    const out = execFileSync(process.execPath, [REPORT, '--theme', dir, '--progress', progressPath, '--json'], { encoding: 'utf-8' });
    const report = JSON.parse(out);

    // 台账消费视图：①corrected ②open ③未定位；④ 他主题被读端过滤（total 不含）
    assert.equal(report.misconceptions.total, 3);
    assert.deepEqual(
      { open: report.misconceptions.open, corrected: report.misconceptions.corrected, recurred: report.misconceptions.recurred },
      { open: 2, corrected: 1, recurred: 0 },
    );
    // 双源 join：EP-03 同时有 profile（题 id 来源）与 misconceptions（口述来源），互不覆盖
    const ep03 = report.points.find((p) => p.ep === 'EP-03');
    assert.ok(ep03.profile, 'EP-03 档案错因（题 id 来源）仍在');
    assert.deepEqual(ep03.profile.wrongReasons, ['权限位组合不熟']);
    assert.equal(ep03.misconceptions.length, 1);
    assert.equal(ep03.misconceptions[0].status, 'corrected');
    assert.equal(ep03.misconceptions[0].observed.text, '把 4 说成读权限');
    assert.equal(ep03.misconceptions[0].diagnosis.text, '权限位与八进制对应记反');
    assert.equal(ep03.misconceptions[0].questionId, 'C1');
    // EP-05 条目 open + 无档案（profile join 不受台账影响）
    const ep05 = report.points.find((p) => p.ep === 'EP-05');
    assert.equal(ep05.misconceptions[0].status, 'open');
    assert.equal(ep05.profile, undefined);
    // 未定位桶：裸名条目进 unlocated、不进任何 EP 的 join
    assert.equal(report.misconceptions.unlocated.length, 1);
    assert.equal(report.misconceptions.unlocated[0].name, '补零权限位');
    assert.equal(report.misconceptions.byEp['EP-03'].length, 1);
    assert.equal(report.misconceptions.byEp['EP-05'].length, 1);
    // v1.2 掌握判据零变化：台账条目不进判据，四态与跨侧夹具期望一致
    const got = Object.fromEntries(report.points.map((p) => [p.ep, p.status]));
    assert.deepEqual(got, expected);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('mastery-report --json：无台账 / 坏台账 → 字段静默缺席，输出与功能前零变化（判据不受影响）', () => {
  const mk = (ledgerContent) => {
    const dir = mkdtempSync(join(tmpdir(), 'ask-mastery-'));
    writeFileSync(join(dir, 'questions.json'), JSON.stringify(fixture.questions));
    writeFileSync(join(dir, 'flashcards.json'), JSON.stringify(fixture.flashcards));
    writeFileSync(join(dir, 'MISSION.md'), MISSION);
    mkdirSync(join(dir, 'study', 'records'), { recursive: true });
    writeFileSync(join(dir, 'study', 'records', 'oral-attempts.json'), JSON.stringify(fixture.oralAttempts));
    if (ledgerContent !== null) writeFileSync(join(dir, 'study', 'records', 'misconceptions.json'), ledgerContent);
    const progressPath = join(dir, 'progress.json');
    writeFileSync(progressPath, JSON.stringify({ answers: fixture.answers, srs: fixture.srs }));
    return { dir, progressPath };
  };
  for (const [label, ledger] of [['无台账', null], ['坏台账', '{oops'], ['全他主题条目', JSON.stringify([misEntry({ theme: 'other-theme' })])]]) {
    const { dir, progressPath } = mk(ledger);
    try {
      const out = execFileSync(process.execPath, [REPORT, '--theme', dir, '--progress', progressPath, '--json'], { encoding: 'utf-8' });
      const report = JSON.parse(out);
      assert.equal('misconceptions' in report, false, `${label}：顶层字段缺席`);
      assert.ok(report.points.every((p) => !('misconceptions' in p)), `${label}：points 键缺席`);
      // 掌握四态与功能前一致（跨侧夹具期望）
      assert.deepEqual(Object.fromEntries(report.points.map((p) => [p.ep, p.status])), expected, `${label}：判据零变化`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});
