// sync-docs.mjs — 把仓库根 docs/*.md 同步成 Starlight 内容页（site 内为生成物，勿手编）。
// 四语同步：docs/<name>.md（中文基准，挂站根）+ docs/<name>.<lang>.md（en/es/ru 译本，挂 /<lang>/），
// 译本缺哪篇就跳哪篇（Starlight 对未翻译页自动回退中文 + 提示条）。
// 处理：抽首行 H1 为 frontmatter title（避免与页面头重复）、注入 sidebar 顺序、
// 剥 GitHub 用的语言切换栏（站内用 Starlight 自带的语言切换 UI）、
// docs 间的相对 .md 链接（含 .<lang>.md 后缀）重写为站内绝对路径（带 SITE_BASE 前缀，
// Pages 子路径下可达；<lang> 页里的裸 .md 链接也升级到同语言路径）。
// 运行：apps/site 的 predev/prebuild 自动跑，或 pnpm run sync:docs。
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE } from '../site.config.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(siteRoot, '../..');
const docsDir = resolve(repoRoot, 'docs');
const outBase = resolve(siteRoot, 'src/content/docs');

const LANGS = ['en', 'es', 'ru'];

/** 同步清单：源文件 → 目标路径 + sidebar 顺序；fromRoot=true 源在仓库根（CHANGELOG），title 可覆盖 H1 */
const SYNC = [
  { src: 'methodology.md', dest: 'method/methodology.md', order: 1 },
  { src: 'four-alignment.md', dest: 'method/four-alignment.md', order: 2 },
  { src: 'ai-cli-guide.md', dest: 'ai/ai-cli.md', order: 1 },
  { src: 'ai-study-kit.md', dest: 'ai/ai-study-kit.md', order: 2 },
  { src: 'configuration.md', dest: 'ai/configuration.md', order: 3 },
  { src: 'bidirectional-check.md', dest: 'maintain/bidirectional-check.md', order: 1 },
  { src: 'CHANGELOG.md', dest: 'changelog.md', fromRoot: true, title: '更新日志', order: 1 },
];

/** 站内交叉链接表（按页面语言）：链接里的文件名（可带 .<lang>.md 后缀）→ 站内路径。
 *  中文页的 (./xxx.md) → /<dest>/；<lang> 页的 (./xxx.<lang>.md) 与裸 (./xxx.md) → /<lang>/<dest>/。
 *  从 SYNC 派生，加文档只需改 SYNC 一处。CHANGELOG 只有中文版，不进语言表。 */
const LINK_MAPS = { zh: {} };
for (const lang of LANGS) LINK_MAPS[lang] = {};
for (const { src, dest, fromRoot } of SYNC) {
  if (fromRoot) continue;
  const base = src.replace(/\.md$/, '');
  const path = `${SITE_BASE}/${dest.replace(/\.md$/, '')}/`;
  LINK_MAPS.zh[`${base}.md`] = path;
  for (const lang of LANGS) {
    const langPath = `${SITE_BASE}/${lang}/${dest.replace(/\.md$/, '')}/`;
    LINK_MAPS[lang][`${base}.${lang}.md`] = langPath;
    LINK_MAPS[lang][`${base}.md`] = langPath;
  }
}

/** GitHub 用的语言切换栏（**简体中文** · [English](…) · … 四语互链行）站内剥掉。
 *  行内同时含 简体中文/English/Español 三个标记即认定是切换栏；`.`
 *  不跨行，m 标志让 ^ 对齐到行首。 */
function stripLangSwitcher(text) {
  return text.replace(/^.*简体中文.*English.*Español.*\n?/m, '');
}

function render({ src, dest, order, fromRoot, title: titleOverride, lang = 'zh' }) {
  const fileName = lang === 'zh' ? src : src.replace(/\.md$/, `.${lang}.md`);
  const srcPath = fromRoot ? resolve(repoRoot, src) : resolve(docsDir, fileName);
  let text = readFileSync(srcPath, 'utf8');

  // 剥语言切换栏（先剥再重写链接，切换栏里的相对链接不会漏网）
  text = stripLangSwitcher(text);

  // 站内交叉链接重写：./xxx.md / xxx.md / ./xxx.<lang>.md → 带前缀的站内路径
  const map = LINK_MAPS[lang];
  text = text.replace(/\((\.?\/)?([A-Za-z-]+(?:\.(?:en|es|ru))?\.md)\)/g, (m, _prefix, file) =>
    map[file] ? `(${map[file]})` : m);

  // 抽 H1 当 title，并从正文移除（Starlight 自己渲染标题头）
  const m = text.match(/^#\s+(.+)\n?/);
  if (!m) throw new Error(`${fileName}: 找不到首行 H1 标题`);
  const title = titleOverride ?? m[1].trim();
  text = text.slice(m[0].length);

  const fm = `---\ntitle: ${JSON.stringify(title)}\nsidebar:\n  order: ${order}\n---\n\n`;
  const out = resolve(outBase, lang === 'zh' ? dest : `${lang}/${dest}`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, fm + text.trimStart() + '\n');
  console.log(`sync: ${lang === 'zh' ? '' : `${lang} · `}${src} -> ${dest}`);
}

let count = 0;
for (const entry of SYNC) {
  render(entry);
  count++;
  if (entry.fromRoot) continue;
  for (const lang of LANGS) {
    if (!existsSync(resolve(docsDir, entry.src.replace(/\.md$/, `.${lang}.md`)))) continue;
    render({ ...entry, lang });
    count++;
  }
}
console.log(`sync-docs: ${count} 篇完成`);
