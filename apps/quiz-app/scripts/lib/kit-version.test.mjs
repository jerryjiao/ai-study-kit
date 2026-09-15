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

// 四份插件清单的版本面（v0.16 起多生态分发：zcode/Claude manifest×2 + Codex 清单 +
// Agent Plugins 1.0 清单）——同一发版纪律：bump 后没重跑 sync-plugin 这里就红。
test('四份插件清单版本号与根 package.json 一致', () => {
  const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'));
  const manifests = [
    join(REPO_ROOT, 'plugins', 'ai-study-kit', '.zcode-plugin', 'plugin.json'),
    join(REPO_ROOT, 'plugins', 'ai-study-kit', '.claude-plugin', 'plugin.json'),
    join(REPO_ROOT, 'plugins', 'ai-study-kit', '.codex-plugin', 'plugin.json'),
    join(REPO_ROOT, 'plugins', 'ai-study-kit', 'plugin.json'),
  ];
  for (const f of manifests) {
    assert.ok(existsSync(f), `清单缺失：${f}——重跑 pnpm run sync:plugin`);
    const m = JSON.parse(readFileSync(f, 'utf-8'));
    assert.equal(m.version, pkg.version, `${f} 版本(${m.version}) ≠ package.json(${pkg.version})——改版本后必须重跑 pnpm run sync:plugin`);
  }
});
