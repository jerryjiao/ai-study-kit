// 四对齐校验脚本的契约测试（黑盒：CLI 边界——退出码 + 输出标记）。
// fixtures 见同目录 fixtures/：三个最小主题目录，覆盖带排布表 / 无表回退 / 对账不符三条路径。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(here, '../../../..');
const CHECKER = path.join(REPO_ROOT, 'scripts', 'bidirectional-check.py');
const FIXTURES = path.join(here, 'fixtures');

function run(fixture) {
  const r = spawnSync('python3', [CHECKER, path.join(FIXTURES, fixture)], {
    encoding: 'utf8',
  });
  assert.equal(r.error, undefined, `python3 启动失败: ${r.error}`);
  return r;
}

test('带排布表：对账正确 → exit 0，走契约模式（不回退）', () => {
  const r = run('with-table');
  assert.equal(r.status, 0, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /EP-01/);
  assert.match(r.stdout, /方向 2/);
  assert.match(r.stdout, /○ 循环: 排布表声明 0 卡/);
  assert.doesNotMatch(r.stdout, /回退/);
});

test('无排布表：回退高频词模式 + 告警，不失败（exit 0）', () => {
  const r = run('no-table');
  assert.equal(r.status, 0, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /回退/);
  assert.match(r.stdout, /⚠/);
});

test('排布表与题量不符：exit 1 且有 ✗ 标记', () => {
  const r = run('mismatch');
  assert.equal(r.status, 1, `stdout:\n${r.stdout}\nstderr:\n${r.stderr}`);
  assert.match(r.stdout, /✗/);
});

test('主题目录不存在：exit 2', () => {
  const r = run('no-such-dir');
  assert.equal(r.status, 2);
});
