/**
 * course-theme.test.mjs — 课程样式表生成链的纯函数测试（v0.25 票④，spec #110）。
 *
 * 测外部行为（输入→输出），不测实现细节：
 *  - parseDesignTokens：从 index.css 形态的 CSS 里解析 :root / .dark 令牌（RGB 三元组 → hex）；
 *  - buildCourseStyles：确定性（同令牌重跑逐字节稳定，验收标准）、
 *    票④换肤面（teach/grill 产物实际用到的选择器 + 旧变量别名 + 暗色块）齐全、
 *    缺令牌显式报错（不静默降级出无色页面）；
 *  - 对真实 src/index.css 跑一遍全链（解析→生成），保证仓库当前令牌面可产出。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDesignTokens, buildCourseStyles } from './course-theme.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INDEX_CSS = join(__dirname, '..', '..', 'src', 'index.css');

// 与 src/index.css 相同形态的最小夹具（含注释、非三元组声明、.dark 块）
const FIXTURE = `@tailwind base;
/* 注释里提到 :root 和 .dark 但没有花括号 */
:root {
  --color-bg-app: 242 247 252;   /* #F2F7FC */
  --st-green: 88 204 2;
  --st-green-dark: 70 163 2;
  --st-green-soft: 232 246 220;
  --st-green-ink: 70 163 2;
  --st-blue: 28 176 246;
  --st-blue-dark: 24 153 214;
  --st-blue-soft: 225 244 253;
  --st-blue-ink: 24 153 214;
  --st-gold: 255 200 0;
  --st-gold-dark: 201 143 0;
  --st-gold-border: 229 166 0;
  --st-gold-soft: 255 244 214;
  --st-gold-ink: 201 143 0;
  --st-red: 255 75 75;
  --st-red-dark: 225 63 63;
  --st-red-soft: 255 229 229;
  --st-red-border: 245 179 179;
  --st-red-ink: 225 63 63;
  --st-track: 233 239 247;
  color-scheme: light;
}
.dark { color-scheme: dark; }
`;

// 夹具的 .dark 没给令牌——buildCourseStyles 应报缺令牌；补全后再测生成。
const DARK_LINES = `  --color-bg-app: 23 33 52;
  --color-bg-surface: 33 46 70;
  --color-bg-subtle: 27 39 61;
  --color-text-primary: 232 238 248;
  --color-text-secondary: 185 198 220;
  --color-text-muted: 147 163 191;
  --color-text-faint: 110 127 156;
  --color-border: 51 66 95;
  --color-border-strong: 70 88 122;
  --st-green: 88 204 2;
  --st-green-dark: 70 163 2;
  --st-green-soft: 26 43 16;
  --st-green-ink: 137 224 56;
  --st-blue: 28 176 246;
  --st-blue-dark: 24 153 214;
  --st-blue-soft: 14 40 60;
  --st-blue-ink: 94 200 247;
  --st-gold: 255 200 0;
  --st-gold-dark: 201 143 0;
  --st-gold-border: 229 166 0;
  --st-gold-soft: 47 38 12;
  --st-gold-ink: 255 213 79;
  --st-red: 255 75 75;
  --st-red-dark: 225 63 63;
  --st-red-soft: 55 26 26;
  --st-red-border: 138 58 58;
  --st-red-ink: 255 123 123;
  --st-track: 39 52 76;
`;
const LIGHT_EXTRA = `  --color-bg-surface: 255 255 255;
  --color-bg-subtle: 233 239 247;
  --color-text-primary: 43 58 85;
  --color-text-secondary: 107 123 153;
  --color-text-muted: 126 141 168;
  --color-text-faint: 151 163 188;
  --color-border: 226 232 242;
  --color-border-strong: 203 213 227;
`;
const FIXTURE_FULL = FIXTURE.replace(
  '.dark { color-scheme: dark; }',
  `.dark {
${DARK_LINES}  color-scheme: dark;
}`,
).replace('  color-scheme: light;', `${LIGHT_EXTRA}  color-scheme: light;`);

test('parseDesignTokens：RGB 三元组 → 小写 hex，注释/非三元组声明不产出', () => {
  const t = parseDesignTokens(FIXTURE);
  assert.equal(t.light['--color-bg-app'], '#f2f7fc');
  assert.equal(t.light['--st-green'], '#58cc02');
  assert.equal(t.light['--st-gold-border'], '#e5a600');
  // color-scheme 等非三元组声明忽略
  assert.equal(t.light['color-scheme'], undefined);
  assert.equal(Object.keys(t.dark).length, 0); // 夹具 .dark 无令牌
});

test('parseDesignTokens：对真实 src/index.css 解析出明暗两套同面令牌', () => {
  const t = parseDesignTokens(readFileSync(INDEX_CSS, 'utf-8'));
  assert.ok(Object.keys(t.light).length >= 30, `light 令牌数 ${Object.keys(t.light).length}`);
  assert.equal(t.light['--st-green'], '#58cc02'); // spec #110 拍板色号
  assert.equal(t.light['--st-red'], '#ff4b4b');
  assert.equal(t.light['--st-gold'], '#ffc800');
  assert.equal(t.light['--st-blue'], '#1cb0f6');
  assert.equal(t.dark['--st-green-soft'], '#1a2b10'); // 暗色软底=深色井
  // 明暗令牌名集合一致（每个浅色令牌都有暗色对应值）
  assert.deepEqual(Object.keys(t.dark).sort(), Object.keys(t.light).sort());
});

test('buildCourseStyles：确定性——同一输入两次生成逐字节相同', () => {
  const tokens = parseDesignTokens(readFileSync(INDEX_CSS, 'utf-8'));
  assert.equal(buildCourseStyles(tokens), buildCourseStyles(tokens));
});

test('buildCourseStyles：teach/grill 产物实际用到的选择器全覆盖 + 暗色块 + 旧变量别名', () => {
  const tokens = parseDesignTokens(FIXTURE_FULL);
  const css = buildCourseStyles(tokens);
  // 票④换肤面：正文排版 + callout 四变体 + 对照块 + 考点锚点 + 出处块（teach），
  // 引导块/表格（原型 .doc），以及 grill/sprint 手写页用到的旧变量
  for (const sel of [
    'p.lead', 'p.meta', '.callout', '.callout-warn', '.callout-tip', '.callout-ok',
    '.compare', '.quiz-anchor', '.sources', 'html.dark', 'pre code', 'footer',
    '--ink:', '--rule:', '--accent:', '--warn:', '--tip:', '--bg:',
  ]) {
    assert.ok(css.includes(sel), `缺选择器/别名：${sel}`);
  }
  // 状态色语义正确落地（绿 callout / 红 warn / 金 tip）
  assert.ok(css.includes('border-left: 5px solid var(--st-green)'), 'h2 绿色左导轨');
  assert.match(css, /\.callout-warn[^}]*--st-red-soft/);
  assert.match(css, /\.callout-tip[^}]*--st-gold-soft/);
  // 头部声明「生成产物勿手编」（防后来者手改漂移）
  assert.ok(css.startsWith('/* ai-study-kit · 课程站样式表（生成产物，勿手编）'));
});

test('buildCourseStyles：缺令牌显式报错，不静默产出无色页面', () => {
  const tokens = parseDesignTokens(FIXTURE); // 夹具缺中性面令牌、.dark 面为空
  assert.throws(() => buildCourseStyles(tokens), /设计令牌缺失/);
});

test('生成链全链：真实 src/index.css 令牌 → 输出与 examples 副本逐字节一致（同源不漂移）', () => {
  const tokens = parseDesignTokens(readFileSync(INDEX_CSS, 'utf-8'));
  const css = buildCourseStyles(tokens);
  const committed = readFileSync(
    join(__dirname, '..', '..', '..', '..', 'examples', 'dev-intro', 'assets', 'styles.css'),
    'utf-8',
  );
  assert.equal(css, committed);
});
