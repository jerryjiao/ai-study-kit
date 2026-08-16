// build-demo.mjs — 构建「可玩 demo」（wayfinder #11/#12）：
// 1) 以 QUIZ_BASE（见 site.config.mjs DEMO_BASE）构建 quiz-app 静态产物（vite base + BrowserRouter basename 跟随）
// 2) 拷进 apps/site/public/demo/（Starlight 原样托管）
// 注意：GitHub Pages 只认站点根的 404.html，demo 深链兜底由 scripts/patch-404.mjs
// 在 astro build 后注入根 404 页实现（本脚本不再复制 demo/404.html）。
// 运行：pnpm run build:demo（apps/site），CI 部署前必跑。
import { execSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_BASE } from '../site.config.mjs';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const quizRoot = resolvePath(siteRoot, '../quiz-app');
const QUIZ_BASE = `${DEMO_BASE}/`;

console.log(`[build-demo] 构建 quiz-app（QUIZ_BASE=${QUIZ_BASE}）…`);
execSync('pnpm run build', {
  cwd: quizRoot,
  env: { ...process.env, QUIZ_BASE: QUIZ_BASE },
  stdio: 'inherit',
});

const src = resolvePath(quizRoot, 'dist');
if (!existsSync(src)) throw new Error(`未找到 quiz-app 构建产物：${src}`);
const dest = resolvePath(siteRoot, 'public/demo');

console.log('[build-demo] 拷贝到 apps/site/public/demo/ …');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });
console.log('[build-demo] 完成（深链兜底见 patch-404.mjs）');
