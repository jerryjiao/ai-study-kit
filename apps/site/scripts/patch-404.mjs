// patch-404.mjs — astro build 之后的产物后处理，两件事：
//
// 1. fallback 页 noindex + sitemap 剪除（2026-09-15 SEO 审计决策）：
// 未翻译页走 Starlight 中文 fallback——html lang 标 <lang>、canonical 自指、正文却是中文，
// 语言信号错位。这里从内容目录源推导 fallback 集合（zh 有而 <lang> 无对应 .md），对产物
// HTML 注入 noindex 并从 sitemap 剪除；补了真译本后自动恢复，无需维护名单。
//
// 2. GitHub Pages SPA 深链兜底（wayfinder #12 第 5 点）：
// Pages 只认站点根的 404.html，public/demo/404.html 不会被用作 /demo/* 的回退。所以把
// 「demo 深链救援」脚本注入 Starlight 生成的根 404 页：访问 /demo/flashcards 这类未命中
// 路径时，先把目标路由存进 sessionStorage，再跳回 demo 首页；quiz-app 的 DeepLinkRestore
// 组件启动时恢复路由。非 demo 路径不受影响，仍显示 Starlight 的 404 页面。
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEMO_BASE } from '../site.config.mjs';

const siteRoot = dirname(dirname(fileURLToPath(import.meta.url)));

// —— fallback noindex：zh 内容 = docs 根目录的 .md（排除语言目录），逐一检查各语言目录 ——
const LANGS = ['en', 'es', 'ru', 'ja'];
const docsDir = resolve(siteRoot, 'src/content/docs');

function collectSlugs(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (LANGS.includes(entry.name)) continue;
    const rel = prefix ? `${prefix}/${entry.name.replace(/\.md$/, '')}` : entry.name.replace(/\.md$/, '');
    if (entry.isDirectory()) out.push(...collectSlugs(join(dir, entry.name), rel));
    else if (entry.name.endsWith('.md')) out.push(rel === 'index' ? '' : rel);
  }
  return out;
}

const zhSlugs = collectSlugs(docsDir);
const fallbackUrls = [];
for (const lang of LANGS) {
  for (const slug of zhSlugs) {
    const translated = existsSync(resolve(docsDir, lang, slug ? `${slug}.md` : 'index.md'));
    const builtPage = resolve(siteRoot, 'dist', lang, slug, 'index.html');
    if (translated || !existsSync(builtPage)) continue;
    let page = readFileSync(builtPage, 'utf8');
    if (!page.includes('name="robots"')) {
      page = page.replace('</head>', '<meta name="robots" content="noindex" />\n</head>');
      writeFileSync(builtPage, page);
    }
    fallbackUrls.push(`https://aistudykit.dev/${lang}/${slug ? `${slug}/` : ''}`);
  }
}
if (fallbackUrls.length) {
  console.log(
    `patch-404: fallback 页注入 noindex × ${fallbackUrls.length}\n  ${fallbackUrls.join('\n  ')}`,
  );
} else {
  console.log('patch-404: 无 fallback 页，五语内容齐整');
}

// sitemap 剪除：noindex 的 URL 留在 sitemap 里是矛盾信号，按上面的集合同步删
const sitemapPath = resolve(siteRoot, 'dist/sitemap-0.xml');
if (fallbackUrls.length && existsSync(sitemapPath)) {
  let sitemap = readFileSync(sitemapPath, 'utf8');
  const before = sitemap;
  for (const url of fallbackUrls) {
    sitemap = sitemap.replace(
      new RegExp(`<url><loc>${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</loc>.*?</url>`, 'g'),
      '',
    );
  }
  if (sitemap !== before) {
    writeFileSync(sitemapPath, sitemap);
    console.log('patch-404: sitemap 已剪除 fallback URL');
  }
}

// —— 404 深链兜底（幂等：已注入过就不再动 404.html）——
const target = resolve(siteRoot, 'dist/404.html');
let html = readFileSync(target, 'utf8');
if (html.includes('ask-demo-route')) {
  console.log('patch-404: 深链兜底已注入过，跳过');
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
