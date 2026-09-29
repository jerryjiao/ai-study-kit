#!/usr/bin/env node
/**
 * gen-course-styles.mjs — 课程站样式表生成器（v0.25 票④「课程令牌同源」，spec #110）。
 *
 * 从 apps/quiz-app/src/index.css 的设计令牌（:root / .dark——与答题站 Tailwind
 * 同一份单源）确定性生成课程小站的 assets/styles.css。teach 产物零内联样式、
 * 只链 `../assets/styles.css`，换本样式表即整体换肤，课程 HTML 零改动。
 *
 * 用法：
 *   node apps/quiz-app/scripts/gen-course-styles.mjs                 # 写激活主题的 assets/styles.css
 *   node apps/quiz-app/scripts/gen-course-styles.mjs --out <path>    # 写指定路径
 *   node apps/quiz-app/scripts/gen-course-styles.mjs --theme <name|path>
 *
 * 部署侧（public/study/）的覆盖发生在 sync-study.mjs 里（同一生成器，拷贝后重写），
 * 本 CLI 负责仓库内示例主题的副本与人工重生成。
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseDesignTokens, buildCourseStyles } from './lib/course-theme.mjs';
import { resolveThemeDir, detectStickyTheme } from './lib/theme-path.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── 参数：--out <path> / --theme <name|path> ─────────────────────────
const args = process.argv.slice(2);
const outIdx = args.indexOf('--out');
const themeIdx = args.indexOf('--theme');

const INDEX_CSS = join(__dirname, '..', 'src', 'index.css');

const tokens = parseDesignTokens(readFileSync(INDEX_CSS, 'utf-8'));
const css = buildCourseStyles(tokens);

// 输出路径：--out 显式优先；否则激活主题（EXAMPLE_THEME > 粘滞 > dev-intro，与
// sync-study 同口径）的 assets/styles.css——外部主题包路径同样支持（--theme 含
// 路径分隔符即外部形态，见 lib/theme-path.mjs）。
const THEME_RAW = detectStickyTheme(join(__dirname, '..', 'src', 'data'), resolve(__dirname, '..', '..', '..'));
const { dir: THEME_DIR, name: THEME_NAME } = resolveThemeDir(
  themeIdx >= 0 ? args[themeIdx + 1] : THEME_RAW,
  resolve(__dirname, '..', '..', '..'),
);
const OUT = resolve(outIdx >= 0 ? args[outIdx + 1] : join(THEME_DIR, 'assets', 'styles.css'));

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, css, 'utf-8');
console.log(`[gen-course-styles] src/index.css 令牌（light ${Object.keys(tokens.light).length} / dark ${Object.keys(tokens.dark).length} 枚）`);
console.log(`[gen-course-styles] → ${OUT}（主题：${THEME_NAME}，${css.length} 字节）`);
