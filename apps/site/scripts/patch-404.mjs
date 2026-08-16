// patch-404.mjs — GitHub Pages SPA 深链兜底（astro build 之后跑，改 dist/404.html）。
//
// 背景（wayfinder #12 第 5 点）：Pages 只认站点根的 404.html，public/demo/404.html
// 不会被用作 /demo/* 的回退。所以把「demo 深链救援」脚本注入 Starlight 生成的根
// 404 页：访问 /ai-study-kit/demo/flashcards 这类未命中路径时，先把目标路由存进
// sessionStorage，再跳回 demo 首页；quiz-app 的 DeepLinkRestore 组件启动时恢复路由。
// 非 demo 路径不受影响，仍显示 Starlight 的 404 页面。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_BASE } from '../site.config.mjs';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const target = resolve(siteRoot, 'dist/404.html');

let html = readFileSync(target, 'utf8');
if (html.includes('ask-demo-route')) {
  console.log('patch-404: 已注入过，跳过');
  process.exit(0);
}

const script = `<script>(function () {
  var base = ${JSON.stringify(DEMO_BASE)};
  var p = location.pathname;
  if (p === base || p === base + '/' || p.indexOf(base + '/') !== 0) return;
  try {
    sessionStorage.setItem('ask-demo-route', p.slice(base.length) || '/');
  } catch (e) { /* 隐私模式等：直接跳首页 */ }
  location.replace(base + '/');
})();</script>`;

if (!html.includes('</head>')) throw new Error('dist/404.html 缺少 </head>，无法注入');
html = html.replace('</head>', script + '\n</head>');
writeFileSync(target, html);
console.log(`patch-404: 已为 ${DEMO_BASE}/* 深链注入 SPA 兜底`);
