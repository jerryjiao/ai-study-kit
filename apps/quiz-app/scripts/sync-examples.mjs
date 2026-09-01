#!/usr/bin/env node
/**
 * sync-examples.mjs — 把 examples/<theme>/ 的题库和闪卡 JSON 复制到 src/data/，
 * 供 quiz-app 运行时 import。
 *
 * 设计原因：
 * - examples/<theme>/ 是「单一事实来源」（用户编辑示例主题的地方）
 * - src/data/*.json 是 quiz-app 运行时 import 的路径（约定）
 * - 这个脚本在 dev/build 前跑一次，桥接两者。
 *
 * 切换主题：改 EXAMPLE_THEME 常量，或抽出成环境变量。
 */
import { copyFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveThemeDir } from './lib/theme-path.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');  // apps/quiz-app/scripts → repo root
const DATA_DIR = resolve(__dirname, '../src/data');

// 防呆：未显式指定 EXAMPLE_THEME 时，沿用已同步主题（src/data/theme.json），
// 防止裸跑 build/dev 把已部署主题的题库覆盖回默认示例。新环境无 theme.json 才回落 dev-intro。
// theme.json 记 { theme, dir? }：仓库内主题只记名字；外部主题包额外记源目录绝对路径
// （只记 basename 会在 examples/ 里找不到 → 误回落 dev-intro，静默切主题）。
function detectTheme() {
  if (process.env.EXAMPLE_THEME) return process.env.EXAMPLE_THEME;
  const themeFile = join(DATA_DIR, 'theme.json');
  if (existsSync(themeFile)) {
    try {
      const t = JSON.parse(readFileSync(themeFile, 'utf-8'));
      if (t.dir && existsSync(t.dir)) return t.dir;          // 外部主题包：粘滞完整路径
      if (t.theme && existsSync(join(REPO_ROOT, 'examples', t.theme))) return t.theme;
    } catch { /* theme.json 损坏则回落默认 */ }
  }
  return 'dev-intro';
}

// 解析主题目录：EXAMPLE_THEME 支持仓库内主题名或外部主题包路径（见 lib/theme-path.mjs）
const THEME_RAW = detectTheme();
const { dir: EXAMPLE_DIR, name: EXAMPLE_THEME, external: EXTERNAL } = resolveThemeDir(THEME_RAW, REPO_ROOT);

if (!existsSync(EXAMPLE_DIR)) {
  console.error(`[sync-examples] example theme not found: ${EXAMPLE_DIR}`);
  process.exit(1);
}

mkdirSync(DATA_DIR, { recursive: true });

const FILES = [
  ['questions.json', 'questions.json'],
  ['flashcards.json', 'flashcards.json'],
];

for (const [src, dst] of FILES) {
  const srcPath = join(EXAMPLE_DIR, src);
  const dstPath = join(DATA_DIR, dst);
  if (!existsSync(srcPath)) {
    console.error(`[sync-examples] source missing: ${srcPath}`);
    process.exit(1);
  }
  copyFileSync(srcPath, dstPath);
  console.log(`[sync-examples] ${src} → src/data/${dst}  (theme: ${EXAMPLE_THEME})`);
}

// 主题显示配置（可选文件）：examples/<theme>/theme-config.json → src/data/theme-config.json。
// 未提供时写空对象 {}——应用按「无配置回退」运行（原始 topic id / 无子主题 / 无层 / 全部计划内 / 默认样式），
// 保证 import 恒可解析。字段语义见 docs/theming.md。
const themeConfigSrc = join(EXAMPLE_DIR, 'theme-config.json');
if (existsSync(themeConfigSrc)) {
  copyFileSync(themeConfigSrc, join(DATA_DIR, 'theme-config.json'));
  console.log(`[sync-examples] theme-config.json → src/data/theme-config.json  (theme: ${EXAMPLE_THEME})`);
} else {
  writeFileSync(join(DATA_DIR, 'theme-config.json'), '{}\n');
  console.log(`[sync-examples] theme-config.json 不存在 → 写空配置（无配置回退行为）  (theme: ${EXAMPLE_THEME})`);
}

// 记录激活主题：Courses 页据此拼课程 URL（study/<theme>/），保证内容与课程永远同主题，
// 也让「切换主题」只需改 EXAMPLE_THEME 一处（原需同步手改 Courses.tsx 的 COURSE_URL）。
// 外部主题包额外记 dir（绝对路径）——detectTheme 粘滞回退靠它，不靠裸名字。
writeFileSync(
  join(DATA_DIR, 'theme.json'),
  JSON.stringify({ theme: EXAMPLE_THEME, ...(EXTERNAL ? { dir: EXAMPLE_DIR } : {}) }, null, 2) + '\n'
);
console.log(`[sync-examples] → src/data/theme.json  (theme: ${EXAMPLE_THEME}${EXTERNAL ? ' · 外部主题包' : ''})`);

// 课程清单：examples/<theme>/lessons/*.html → src/data/courses.json。
// Courses 页据此渲染课程目录 + 学完进度；ai-study-kit skill / CLI 据此对账「课全学完」
// 完成边界（coursesRead 的 "<theme>/<file>" key 命中清单全集 = 课全学完）。
// title 取 lesson 的 <title>（teach 产出必有），取不到时退回文件名。
// topic（可选）：theme-config.json 的 lessonTopics（"<lesson文件名>" → 题库 topic id）命中时带入——
// 课程页「已学完 → 去刷这课的题」按它直达对应题集；未配置则缺省，课程页按文件名同名约定回退。
const lessonTopics = (() => {
  try {
    return existsSync(themeConfigSrc) ? (JSON.parse(readFileSync(themeConfigSrc, 'utf-8')).lessonTopics ?? {}) : {};
  } catch { return {}; } // theme-config 损坏：无映射，等同未配置
})();
const lessonsDir = join(EXAMPLE_DIR, 'lessons');
if (existsSync(lessonsDir)) {
  const lessons = readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((file) => {
      const html = readFileSync(join(lessonsDir, file), 'utf-8');
      const m = html.match(/<title>([^<]*)<\/title>/i);
      const title = (m?.[1] ?? file).trim();
      return lessonTopics[file] ? { file, title, topic: lessonTopics[file] } : { file, title };
    });
  writeFileSync(join(DATA_DIR, 'courses.json'), JSON.stringify({ theme: EXAMPLE_THEME, lessons }, null, 2) + '\n');
  console.log(`[sync-examples] → src/data/courses.json  (${lessons.length} lessons)`);
} else {
  writeFileSync(join(DATA_DIR, 'courses.json'), JSON.stringify({ theme: EXAMPLE_THEME, lessons: [] }, null, 2) + '\n');
  console.warn(`[sync-examples] lessons 目录不存在：${lessonsDir}（courses.json 置空清单）`);
}
