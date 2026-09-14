// theme-path.test.mjs — 粘滞主题解析契约（node:test）：EXAMPLE_THEME > theme.json 粘滞 > dev-intro。
// 两个 sync 脚本（sync-examples / sync-study）必须同口径——sync-study 裸跑不读粘滞主题
// 会把 dev-intro 课程站静默同步到别的主题的数据层（审计 bug #52）；
// theme.json 损坏必须打 warn 再回落，绝不静默换主题（审计 bug #54）。
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveThemeDir, detectStickyTheme } from './theme-path.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ask-theme-path-'));
  const dataDir = join(root, 'data');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(join(root, 'examples', 'my-theme'), { recursive: true });   // 仓库内主题
  mkdirSync(join(root, 'external', 'ext-topic'), { recursive: true });  // 外部主题包
  return root;
}

function withFixture(fn) {
  const root = makeFixture();
  try {
    return fn(root, join(root, 'data'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

beforeEach(() => { delete process.env.EXAMPLE_THEME; });

test('detectStickyTheme: EXAMPLE_THEME 已设 → 直接用，不读 theme.json', () => {
  withFixture((root, dataDir) => {
    process.env.EXAMPLE_THEME = 'my-theme';
    assert.equal(detectStickyTheme(dataDir, root), 'my-theme');
  });
});

test('detectStickyTheme: 无环境变量 → 读 theme.json 粘滞（仓库内主题名）', () => {
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'my-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), 'my-theme');
  });
});

test('detectStickyTheme: theme.json 带 dir（外部主题包）→ 粘滞完整路径', () => {
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'ext-topic', dir: join(root, 'external', 'ext-topic') }));
    assert.equal(detectStickyTheme(dataDir, root), join(root, 'external', 'ext-topic'));
  });
});

test('detectStickyTheme: 无 theme.json → 回落 dev-intro', () => {
  withFixture((root, dataDir) => {
    assert.equal(detectStickyTheme(dataDir, root), 'dev-intro');
  });
});

test('detectStickyTheme: theme.json 损坏 → 回落 dev-intro 且打 warn，不静默换主题（#54）', (t) => {
  const warns = [];
  t.mock.method(console, 'warn', (...args) => warns.push(args.join(' ')));
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), '{broken json');
    assert.equal(detectStickyTheme(dataDir, root), 'dev-intro');
    assert.equal(warns.length, 1);
    assert.match(warns[0], /theme\.json 损坏/);
  });
});

test('detectStickyTheme: theme.json 记的主题在 examples/ 不存在 → 回落 dev-intro', () => {
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'deleted-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), 'dev-intro');
  });
});

// ── resolveThemeDir（既有行为回归锚点）──────────────────────

test('resolveThemeDir: 仓库内主题名 → examples/<name>，external=false', () => {
  const r = resolveThemeDir('my-theme', '/repo');
  assert.equal(r.dir, join('/repo', 'examples', 'my-theme'));
  assert.equal(r.name, 'my-theme');
  assert.equal(r.external, false);
});

test('resolveThemeDir: 含路径分隔符 → 外部主题包，name 取 basename', () => {
  const r = resolveThemeDir('/home/u/packs/my-topic', '/repo');
  assert.equal(r.dir, '/home/u/packs/my-topic');
  assert.equal(r.name, 'my-topic');
  assert.equal(r.external, true);
});
