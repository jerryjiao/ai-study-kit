// kit-version.test.mjs — kit 快照自报版本契约（ADR-0006，U1 #56）：
// 打包产物必含 kit-version.json 且版本号与根 package.json 一致。
// 这同时是发版纪律的断言面：package.json 改版本后没重跑 sync-plugin，本测试即红
// （plugin 产物与版本漂移，kit 快照字节契约的版本面）。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const KIT_VERSION_FILE = join(REPO_ROOT, 'plugins', 'ai-study-kit', 'kit', 'kit-version.json');

test('kit 快照含 kit-version.json，版本号与根 package.json 一致', () => {
  assert.ok(existsSync(KIT_VERSION_FILE), `打包产物缺 ${KIT_VERSION_FILE}——重跑 pnpm run sync:plugin`);
  const marker = JSON.parse(readFileSync(KIT_VERSION_FILE, 'utf-8'));
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'));
  assert.equal(marker.version, pkg.version, `kit-version.json(${marker.version}) ≠ package.json(${pkg.version})——改版本后必须重跑 pnpm run sync:plugin`);
});
