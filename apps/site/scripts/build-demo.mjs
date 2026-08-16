// build-demo.mjs — 构建「可玩 demo」（wayfinder #11/#12）：
// 1) 以 QUIZ_BASE=/ai-study-kit/demo/ 构建 quiz-app 静态产物（vite base + BrowserRouter basename 跟随）
// 2) 拷进 apps/site/public/demo/（Starlight 原样托管）
// 3) index.html 复制为 404.html——GitHub Pages 对未命中路径回退到它，SPA 深链刷新不 404
// 运行：pnpm run build:demo（apps/site），CI 部署前必跑。
import { execSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const quizRoot = resolvePath(siteRoot, '../quiz-app');
const DEMO_BASE = '/ai-study-kit/demo/';

console.log(`[build-demo] 构建 quiz-app（QUIZ_BASE=${DEMO_BASE}）…`);
execSync('pnpm run build', {
  cwd: quizRoot,
  env: { ...process.env, QUIZ_BASE: DEMO_BASE },
  stdio: 'inherit',
});

const src = resolvePath(quizRoot, 'dist');
if (!existsSync(src)) throw new Error(`未找到 quiz-app 构建产物：${src}`);
const dest = resolvePath(siteRoot, 'public/demo');

console.log('[build-demo] 拷贝到 apps/site/public/demo/ …');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
cpSync(src, dest, { recursive: true });

// GitHub Pages SPA 回退：深链刷新（如 /demo/flashcards）由 404.html 兜底启动应用
copyFileSync(resolvePath(dest, 'index.html'), resolvePath(dest, '404.html'));
console.log('[build-demo] 完成（含 404.html SPA 回退）');
