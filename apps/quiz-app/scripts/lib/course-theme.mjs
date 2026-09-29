/**
 * course-theme.mjs — 课程站样式表的「令牌同源」生成核心（v0.25 票④，spec #110）。
 *
 * 设计令牌单源 = apps/quiz-app/src/index.css 的 :root / .dark 两个块（票①建立，
 * Tailwind 的 bg-* / text-* / st-* 工具类全部指向它）。本模块把同一份令牌
 * 编译成课程小站的 assets/styles.css——teach 产物只链 `../assets/styles.css`
 * 且零内联样式（spec #110 已核实），换样式表即换肤，课程 HTML 零改动。
 *
 * 消费链（两处，同一生成器）：
 *   1. gen-course-styles.mjs 重新生成 examples/<theme>/assets/styles.css（提交进库的副本）；
 *   2. sync-study.mjs 在拷贝主题到 public/study/<name>/ 后，用同一生成器覆盖
 *      assets/styles.css——存量主题（含外部主题包）重跑 sync 即换肤，不重产课。
 *
 * 纯函数、确定性：同一份 index.css 输入 → 逐字节相同的输出（无时间戳、无随机序），
 * 这是票④验收标准之一，course-theme.test.mjs 有断言。
 */

/** 从 CSS 文本里取出一个选择器块的花括号内容（平衡括号扫描，容忍注释）。
 *  只用于 index.css 的 `:root { … }` / `.dark { … }`（无嵌套规则），不是通用 CSS 解析器。 */
function extractBlock(css, selector) {
  const start = css.indexOf(`${selector}{`) !== -1 ? css.indexOf(`${selector}{`) : css.indexOf(`${selector} {`);
  if (start === -1) return null;
  const open = css.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === '{') depth++;
    else if (css[i] === '}') {
      depth--;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

/** RGB 三元组 → #RRGGBB（小写十六进制）。88 204 2 → #58cc02。 */
function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * 解析 index.css 的设计令牌：`:root` 与 `.dark` 两块里的 `--name: R G B;` 声明
 * （空格分隔三数，配合 Tailwind 的 rgb(var(…) / <alpha-value>) 语法——票①约定）。
 * 非三元组形态的声明（如 color-scheme）自动忽略。
 * @param {string} cssText  apps/quiz-app/src/index.css 全文
 * @returns {{ light: Record<string,string>, dark: Record<string,string> }}  令牌名 → #rrggbb
 */
export function parseDesignTokens(cssText) {
  const parse = (block) => {
    const out = {};
    if (!block) return out;
    for (const m of block.matchAll(/(--[a-z0-9-]+)\s*:\s*(\d+)\s+(\d+)\s+(\d+)\s*;/g)) {
      out[m[1]] = rgbToHex(Number(m[2]), Number(m[3]), Number(m[4]));
    }
    return out;
  };
  return { light: parse(extractBlock(cssText, ':root')), dark: parse(extractBlock(cssText, '.dark')) };
}

/**
 * 课程 styles.css 模板里用到的令牌面（从解析结果取值；缺令牌时显式报错而不是静默降级——
 * 生成链输出进发布物，缺色必须当场炸出来）。
 * @param {{light:Record<string,string>,dark:Record<string,string>}} tokens
 * @param {'light'|'dark'} mode
 */
function pick(tokens, mode) {
  const t = tokens[mode];
  const need = [
    '--color-bg-app', '--color-bg-surface', '--color-bg-subtle',
    '--color-text-primary', '--color-text-secondary', '--color-text-muted', '--color-text-faint',
    '--color-border', '--color-border-strong',
    '--st-green', '--st-green-dark', '--st-green-soft', '--st-green-ink',
    '--st-blue', '--st-blue-dark', '--st-blue-soft', '--st-blue-ink',
    '--st-gold', '--st-gold-dark', '--st-gold-border', '--st-gold-soft', '--st-gold-ink',
    '--st-red', '--st-red-dark', '--st-red-soft', '--st-red-border', '--st-red-ink',
    '--st-track',
  ];
  const missing = need.filter((n) => !t[n]);
  if (missing.length) throw new Error(`设计令牌缺失（${mode}）：${missing.join(', ')}——检查 src/index.css`);
  return t;
}

/** 令牌声明块（`--x: #hex;` 每行一条，插入顺序固定 → 输出确定）。 */
function tokenDecls(t) {
  return Object.entries(t).map(([k, v]) => `  ${k}: ${v};`).join('\n');
}

/**
 * 生成课程站样式表全文。
 *
 * 视觉基准 = 原型 proto-courses.html 的 .doc 系列（同令牌：白卡底、粗描边、
 * 绿系 callout、蓝系引导块、圆角描边表格），暗色经 html.dark 切换（由答题站
 * Courses 页把主题类同步进同源 iframe，见 Courses.tsx）。
 *
 * 选择器面 = 既有 teach/grill 产物实际用到的全集（h1-h4 / p.lead / p.meta /
 * .callout±warn/tip/ok / .compare / .quiz-anchor / .sources / footer / pre / table）
 * + 旧版自定义变量的别名层（--ink/--rule/--accent…——手写页与外部主题包里
 * 的 var(--rule) 等内联引用继续成立，值换成新令牌）。
 *
 * @param {{light:Record<string,string>,dark:Record<string,string>}} tokens  parseDesignTokens 的输出
 * @returns {string}  styles.css 全文（确定性：同输入同输出）
 */
export function buildCourseStyles(tokens) {
  const L = pick(tokens, 'light');
  const D = pick(tokens, 'dark');

  // 软块描边的「浅一档」边色（原型字面值）；暗色直接复用状态色 -dark 令牌。
  const GREEN_EDGE_L = '#bfe8a6';
  const BLUE_EDGE_L = '#bee3fb';

  return `/* ai-study-kit · 课程站样式表（生成产物，勿手编）
 *
 * 由 apps/quiz-app/scripts/gen-course-styles.mjs 从 apps/quiz-app/src/index.css 的
 * 设计令牌（:root / .dark，与答题站 Tailwind 同源单源）生成——v0.25 票④「课程令牌同源」。
 * 改视觉：改 src/index.css 令牌或 scripts/lib/course-theme.mjs 模板，然后重跑
 *   pnpm -C apps/quiz-app run gen:course-css        （重生成本文件）
 *   pnpm -C apps/quiz-app run sync:study            （重刷 public/study/<theme>/）
 * 课程 HTML（teach 产物）零内联样式、零改动，换本样式表即整体换肤；明暗由
 * <html class="dark"> 切换（答题站嵌入 iframe 时由 Courses 页同步主题类）。
 */

:root {
/* ── 设计令牌（同源：src/index.css，十六进制形态） ───────────────────── */
${tokenDecls(L)}
  /* 软块描边浅一档（模板常量，原型 proto.css 口径） */
  --c-green-edge: ${GREEN_EDGE_L};
  --c-blue-edge: ${BLUE_EDGE_L};
/* ── 旧版变量别名（手写页/外部主题包的 var(--ink) 等继续成立，值并轨新令牌） ── */
  --ink: var(--color-text-primary);
  --ink-soft: var(--color-text-secondary);
  --ink-faint: var(--color-text-faint);
  --rule: var(--color-border);
  --rule-soft: var(--st-track);
  --line: var(--color-border);
  --accent: var(--st-blue-dark);
  --accent-soft: var(--st-blue-soft);
  --ok: var(--st-green-dark);
  --ok-soft: var(--st-green-soft);
  --warn: var(--st-red-dark);
  --warn-soft: var(--st-red-soft);
  --tip: var(--st-gold-dark);
  --tip-soft: var(--st-gold-soft);
  --bg: var(--color-bg-app);
  color-scheme: light;
}

html.dark {
${tokenDecls(D)}
  --c-green-edge: var(--st-green-dark);
  --c-blue-edge: var(--st-blue-dark);
  color-scheme: dark;
}

* { box-sizing: border-box; }

html { font-size: 16px; }
body {
  margin: 0;
  background: var(--color-bg-app);
  color: var(--color-text-primary);
  font-family: system-ui, -apple-system, "SF Pro Text", "PingFang SC",
               "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif;
  font-size: 15px;
  line-height: 1.75;
  -webkit-font-smoothing: antialiased;
}

main {
  max-width: 780px;
  margin: 0 auto;
  padding: 34px 44px 26px;
}

h1, h2, h3, h4 {
  color: var(--color-text-primary);
  line-height: 1.35;
  font-weight: 800;
}
h1 { font-size: 24px; margin: 0 0 6px; }
h2 {
  font-size: 17px;
  margin: 24px 0 10px;
  padding-left: 12px;
  border-left: 5px solid var(--st-green);
}
h3 { font-size: 15.5px; margin: 18px 0 8px; }
h4 { font-size: 15px; margin: 14px 0 6px; }

p { margin: 0 0 12px; }

/* 引导块（原型 .doc .lead）：蓝系软底 + 蓝描边，课首「这课怎么学」 */
p.lead {
  background: var(--st-blue-soft);
  border: 2px solid var(--c-blue-edge);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 20px;
  line-height: 1.75;
}

p.meta {
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0 0 22px;
}
p.meta a { color: var(--st-blue-dark); text-decoration: none; font-weight: 700; }

a { color: var(--st-blue-dark); text-decoration: none; }
a:hover { text-decoration: underline; }

ul, ol { margin: 0 0 14px 22px; padding: 0; line-height: 1.9; }
li { margin: 3px 0; }

code, pre {
  /* CJK 回退放在 monospace 泛型前：ASCII 示意图里的中文标注在纯等宽栈下会豆腐字 */
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, "Courier New",
    "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", monospace;
}
code {
  background: var(--st-track);
  color: var(--color-text-primary);
  border-radius: 6px;
  padding: 1px 7px;
  font-size: 13.5px;
}
pre {
  background: #1b273d;
  color: #e8eef8;
  padding: 14px 18px;
  border-radius: 10px;
  border: 2px solid var(--color-border);
  overflow-x: auto;
  line-height: 1.6;
  font-size: 13.5px;
  margin: 14px 0;
}
pre code { background: transparent; padding: 0; color: inherit; font-size: inherit; }

/* 表格（原型 .doc table）：圆角 + 2px 描边 */
table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  margin: 14px 0;
  border: 2px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  font-size: 14px;
}
th {
  background: var(--st-track);
  font-weight: 800;
  text-align: left;
  padding: 9px 13px;
}
td {
  border-top: 2px solid var(--color-border);
  padding: 9px 13px;
  line-height: 1.6;
  vertical-align: top;
}

/* callouts —— 教学强化块（原型 .doc .callout：绿系=核心结论/记忆锚点；
 * 易错点=红、实用技巧=金，语义与答题站状态色一致） */
.callout {
  background: var(--st-green-soft);
  border: 2px solid var(--c-green-edge);
  border-radius: 12px;
  padding: 12px 16px;
  margin: 14px 0;
  line-height: 1.75;
  font-size: 14.5px;
}
.callout b, .callout strong { color: var(--st-green-ink); }
.callout-warn {
  background: var(--st-red-soft);
  border-color: var(--st-red-border);
}
.callout-warn b, .callout-warn strong { color: var(--st-red-ink); }
.callout-tip {
  background: var(--st-gold-soft);
  border-color: var(--st-gold-border);
}
.callout-tip b, .callout-tip strong { color: var(--st-gold-ink); }
.callout-ok {
  background: var(--st-green-soft);
  border-color: var(--c-green-edge);
}
.callout-ok b, .callout-ok strong { color: var(--st-green-ink); }
.callout p:last-child, .callout ul:last-child { margin-bottom: 0; }

/* 对照块（teach 产物的 A/B 对照）：双列卡片，H5 单列 */
.compare {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 14px 0;
}
.compare > div {
  border: 2px solid var(--color-border);
  border-radius: 12px;
  padding: 10px 14px;
  background: var(--color-bg-surface);
}
.compare h4 { margin: 0 0 6px; color: var(--st-blue-ink); }
.compare p:last-child { margin-bottom: 0; }

/* 题目对应框（teach 课尾考点锚点，四对齐校验的消费面） */
.quiz-anchor {
  border: 2px dashed var(--color-border);
  background: var(--st-track);
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 14px;
  color: var(--color-text-secondary);
  margin: 18px 0;
}
.quiz-anchor::before {
  content: "📚 本节对应题目：";
  font-weight: 700;
  color: var(--color-text-primary);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 14px auto;
  border: 2px solid var(--color-border);
  border-radius: 12px;
}

svg { display: block; margin: 14px 0; }

hr {
  border: none;
  border-top: 2px solid var(--color-border);
  margin: 24px 0;
}

/* sources —— 课尾出处回链块（原型 .doc .src：「以参考材料建概念」的产物面） */
.sources {
  margin-top: 26px;
  border-top: 2px dashed var(--color-border);
  padding-top: 12px;
  font-size: 12.5px;
  color: var(--color-text-secondary);
  line-height: 1.8;
}
.sources p { margin: 0; }
.sources b { color: var(--color-text-primary); }
.sources a { color: var(--st-blue-dark); }

footer {
  margin-top: 24px;
  padding-top: 12px;
  border-top: 2px solid var(--color-border);
  color: var(--color-text-faint);
  font-size: 12.5px;
}
footer p { margin: 0; }

/* H5（≤640px，与答题站共享基线同宽）：收版心边距、对照块单列 */
@media (max-width: 640px) {
  main { padding: 18px 16px 20px; }
  .compare { grid-template-columns: 1fr; }
  h1 { font-size: 21px; }
}

@media print {
  body { background: white; color: #1f2937; }
  main { padding: 1rem; max-width: none; }
  pre, .callout, .compare > div, table { page-break-inside: avoid; }
}
`;
}
