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

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');  // apps/quiz-app/scripts → repo root
const EXAMPLE_THEME = process.env.EXAMPLE_THEME || 'dev-intro';
const EXAMPLE_DIR = join(REPO_ROOT, 'examples', EXAMPLE_THEME);
const DATA_DIR = resolve(__dirname, '../src/data');

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

// 记录激活主题：Courses 页据此拼课程 URL（study/<theme>/），保证内容与课程永远同主题，
// 也让「切换主题」只需改 EXAMPLE_THEME 一处（原需同步手改 Courses.tsx 的 COURSE_URL）。
writeFileSync(join(DATA_DIR, 'theme.json'), JSON.stringify({ theme: EXAMPLE_THEME }, null, 2) + '\n');
console.log(`[sync-examples] → src/data/theme.json  (theme: ${EXAMPLE_THEME})`);

// 课程清单：examples/<theme>/lessons/*.html → src/data/courses.json。
// Courses 页据此渲染课程目录 + 已读进度；study-coach skill / CLI 据此对账「课全读」
// 完成边界（coursesRead 的 "<theme>/<file>" key 命中清单全集 = 课全读）。
// title 取 lesson 的 <title>（teach 产出必有），取不到时退回文件名。
const lessonsDir = join(EXAMPLE_DIR, 'lessons');
if (existsSync(lessonsDir)) {
  const lessons = readdirSync(lessonsDir)
    .filter((f) => f.endsWith('.html'))
    .sort()
    .map((file) => {
      const html = readFileSync(join(lessonsDir, file), 'utf-8');
      const m = html.match(/<title>([^<]*)<\/title>/i);
      return { file, title: (m?.[1] ?? file).trim() };
    });
  writeFileSync(join(DATA_DIR, 'courses.json'), JSON.stringify({ theme: EXAMPLE_THEME, lessons }, null, 2) + '\n');
  console.log(`[sync-examples] → src/data/courses.json  (${lessons.length} lessons)`);
} else {
  writeFileSync(join(DATA_DIR, 'courses.json'), JSON.stringify({ theme: EXAMPLE_THEME, lessons: [] }, null, 2) + '\n');
  console.warn(`[sync-examples] lessons 目录不存在：${lessonsDir}（courses.json 置空清单）`);
}
