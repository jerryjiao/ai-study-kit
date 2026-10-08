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
import { join, dirname, resolve } from 'node:path';
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
