// theme-path.test.mjs — 粘滞主题解析契约（node:test）：
// EXAMPLE_THEME > .theme-state.json（外部主题包 dir）> theme.json 粘滞 > dev-intro。
// 两个 sync 脚本（sync-examples / sync-study）必须同口径——sync-study 裸跑不读粘滞主题
// 会把 dev-intro 课程站静默同步到别的主题的数据层上（审计 bug #52）；
// theme.json / .theme-state.json 损坏必须打 warn 再回落，绝不静默换主题（审计 bug #54）。
// #109：dir（外部主题包绝对路径）只住 apps/quiz-app/.theme-state.json（src/ 之外，
// 不进公开 bundle）；旧项目 theme.json 残留 dir 兼容读 + 本次 sync 迁移。
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveThemeDir, detectStickyTheme,
  themeStatePath, readThemeStateDir, writeThemeState, clearThemeState,
} from './theme-path.mjs';

function makeFixture() {
  const root = mkdtempSync(join(tmpdir(), 'ask-theme-path-'));
  // 布局复刻真实仓库：dataDir 恒为 <appRoot>/src/data——.theme-state.json 住 <appRoot>/
  // （dataDir 上两级），必须落在 src/ 之外（前端 import 范围够不着 bundle 边界外）。
  const dataDir = join(root, 'app', 'src', 'data');
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(join(root, 'examples', 'my-theme'), { recursive: true });   // 仓库内主题
  mkdirSync(join(root, 'external', 'ext-topic'), { recursive: true });  // 外部主题包
  return root;
}

function withFixture(fn) {
  const root = makeFixture();
  try {
    return fn(root, join(root, 'app', 'src', 'data'), join(root, 'app'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

// 复刻 sync-examples 的粘滞指针落位编排（EXTERNAL ? 写 : 清），测的就是 sync 真实序列。
function applyThemeStateLikeSync(dataDir, external, dir, themeName) {
  const themeMeta = { theme: themeName, examPoints: {}, examDays: {} };
  delete themeMeta.dir;
  writeFileSync(join(dataDir, 'theme.json'), JSON.stringify(themeMeta) + '\n');
  if (external) writeThemeState(dataDir, dir);
  else clearThemeState(dataDir);
}

beforeEach(() => { delete process.env.EXAMPLE_THEME; });

test('detectStickyTheme: EXAMPLE_THEME 已设 → 直接用，不读任何粘滞文件', () => {
  withFixture((root, dataDir) => {
    writeThemeState(dataDir, join(root, 'external', 'ext-topic'));
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

test('detectStickyTheme: .theme-state.json 带 dir（外部主题包）→ 粘滞完整路径（#109 新粘滞源）', () => {
  withFixture((root, dataDir) => {
    writeThemeState(dataDir, join(root, 'external', 'ext-topic'));
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'my-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), join(root, 'external', 'ext-topic'));
  });
});

test('detectStickyTheme: 旧项目 theme.json 残留 dir → 兼容读仍粘滞（ADR-0006 存量承诺）', () => {
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'ext-topic', dir: join(root, 'external', 'ext-topic') }));
    assert.equal(detectStickyTheme(dataDir, root), join(root, 'external', 'ext-topic'));
  });
});

test('detectStickyTheme: 无 theme.json / .theme-state.json → 回落 dev-intro', () => {
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

test('detectStickyTheme: .theme-state.json 损坏 → 忽略该指针打 warn，回落后续粘滞源', (t) => {
  const warns = [];
  t.mock.method(console, 'warn', (...args) => warns.push(args.join(' ')));
  withFixture((root, dataDir) => {
    writeFileSync(themeStatePath(dataDir), '{broken');
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'my-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), 'my-theme');
    assert.ok(warns.some((w) => w.includes('.theme-state.json 损坏')));
  });
});

test('detectStickyTheme: theme.json 记的主题在 examples/ 不存在 → 回落 dev-intro', () => {
  withFixture((root, dataDir) => {
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'deleted-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), 'dev-intro');
  });
});

test('detectStickyTheme: .theme-state.json 的 dir 指向的目录已不存在 → 跳过该指针', () => {
  withFixture((root, dataDir) => {
    writeThemeState(dataDir, join(root, 'external', 'gone-topic'));
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'my-theme' }));
    assert.equal(detectStickyTheme(dataDir, root), 'my-theme');
  });
});

// ── 粘滞指针状态文件（#109 契约三条）──────────────────────

test('#109 外部形态写 .theme-state：文件落 dataDir 上一级（src/ 之外），内容只有 dir，theme.json 不带 dir', () => {
  withFixture((root, dataDir) => {
    const extDir = join(root, 'external', 'ext-topic');
    applyThemeStateLikeSync(dataDir, true, extDir, 'ext-topic');
    const stateFile = themeStatePath(dataDir);
    assert.equal(stateFile, join(root, 'app', '.theme-state.json'));    // <appRoot>/，不在 src/ 里
    assert.ok(existsSync(stateFile));
    assert.deepEqual(JSON.parse(readFileSync(stateFile, 'utf-8')), { dir: extDir });
    assert.equal(readThemeStateDir(dataDir), extDir);
    const themeJson = JSON.parse(readFileSync(join(dataDir, 'theme.json'), 'utf-8'));
    assert.equal(themeJson.dir, undefined);                              // 公开 bundle 无绝对路径
    assert.equal(detectStickyTheme(dataDir, root), extDir);              // 下次裸跑 sync 仍粘外部主题
  });
});

test('#109 显式仓库名清 .theme-state：指针随显式切换重置，默认构建不再粘回外部主题', () => {
  withFixture((root, dataDir) => {
    writeThemeState(dataDir, join(root, 'external', 'ext-topic'));       // 先处于外部主题粘滞
    assert.equal(detectStickyTheme(dataDir, root), join(root, 'external', 'ext-topic'));
    applyThemeStateLikeSync(dataDir, false, null, 'dev-intro');         // 显式 EXAMPLE_THEME=dev-intro 的 sync 序列
    assert.ok(!existsSync(themeStatePath(dataDir)));                     // 指针被清除
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'dev-intro' }));
    assert.equal(detectStickyTheme(dataDir, root), 'dev-intro');         // 裸跑回落 dev-intro，不粘回外部
  });
});

test('#109 旧 theme.json.dir 兼容读 + 自动迁移：读到即用，本次 sync 迁进 .theme-state 并从 theme.json 剔除', () => {
  withFixture((root, dataDir) => {
    const extDir = join(root, 'external', 'ext-topic');
    // 老项目形态：theme.json 带 dir（旧版本 sync 写的），无 .theme-state.json
    writeFileSync(join(dataDir, 'theme.json'), JSON.stringify({ theme: 'ext-topic', dir: extDir, examPoints: {}, examDays: {} }));
    const sticky = detectStickyTheme(dataDir, root);                     // sync 入口第一次探测
    assert.equal(sticky, extDir);                                        // 不报错、不丢主题
    const { external } = resolveThemeDir(sticky, root);
    assert.equal(external, true);
    applyThemeStateLikeSync(dataDir, external, extDir, 'ext-topic');     // sync-examples 的落位序列
    assert.equal(readThemeStateDir(dataDir), extDir);                    // 迁移完成：指针进了新家
    assert.equal(JSON.parse(readFileSync(join(dataDir, 'theme.json'), 'utf-8')).dir, undefined);
    rmSync(join(dataDir, 'theme.json'), { force: true });                // 极端验证：旧文件消失也仍粘滞
    assert.equal(detectStickyTheme(dataDir, root), extDir);
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
