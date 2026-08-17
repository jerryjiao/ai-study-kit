// sync-docs.mjs — 把仓库根 docs/*.md 同步成 Starlight 内容页（site 内为生成物，勿手编）。
// 处理：抽首行 H1 为 frontmatter title（避免与页面头重复）、注入 sidebar 顺序、
// 已英译的两篇（methodology / four-alignment）去掉文首 "> **EN**: ..." 摘要引用块、
// docs 间的相对 .md 链接重写为站内绝对路径（带 SITE_BASE 前缀，Pages 子路径下可达）。
// 运行：apps/site 的 predev/prebuild 自动跑，或 pnpm run sync:docs。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SITE_BASE } from '../site.config.mjs';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(siteRoot, '../..');
const docsDir = resolve(repoRoot, 'docs');
const outBase = resolve(siteRoot, 'src/content/docs');

/** 同步清单：源文件 → 目标路径 + sidebar 顺序 + 是否去 EN 摘要 */
const SYNC = [
  { src: 'methodology.md', dest: 'method/methodology.md', order: 1, stripEn: true },
  { src: 'four-alignment.md', dest: 'method/four-alignment.md', order: 2, stripEn: true },
  { src: 'ai-cli-guide.md', dest: 'ai/ai-cli.md', order: 1, stripEn: false },
  { src: 'study-coach.md', dest: 'ai/study-coach.md', order: 2, stripEn: false },
  { src: 'configuration.md', dest: 'ai/configuration.md', order: 3, stripEn: false },
  { src: 'bidirectional-check.md', dest: 'maintain/bidirectional-check.md', order: 1, stripEn: false },
];

/** 文档间交叉链接表：docs/<文件名> → 站内路径（从 SYNC 派生，加文档只需改 SYNC 一处） */
const LINK_MAP = Object.fromEntries(
  SYNC.map(({ src, dest }) => [src, `${SITE_BASE}/${dest.replace(/\.md$/, '')}/`]),
);

for (const { src, dest, order, stripEn } of SYNC) {
  let text = readFileSync(resolve(docsDir, src), 'utf8');

  // 站内交叉链接重写：./xxx.md 或 /xxx.md → 带前缀的站内路径
  text = text.replace(/\(\.?\/([a-z-]+\.md)\)/g, (m, file) =>
    LINK_MAP[file] ? `(${LINK_MAP[file]})` : m);

  // 抽 H1 当 title，并从正文移除（Starlight 自己渲染标题头）
  const m = text.match(/^#\s+(.+)\n?/);
  if (!m) throw new Error(`${src}: 找不到首行 H1 标题`);
  const title = m[1].trim();
  text = text.slice(m[0].length);

  // 已英译篇目：去掉紧随标题的英文摘要引用块（官网有完整英文版，摘要冗余）。
  // [^>\n] 不跨行——EN 行后直接接正文（无 > 中文引用行）时，[^>] 会一路吞到下一个 >。
  if (stripEn) {
    text = text.replace(/^(\s*>\s*\*\*EN\*\*[^>\n]*\n(?:\s*>.*\n)*)\s*\n?/, '\n');
  }

  const fm = `---\ntitle: ${JSON.stringify(title)}\nsidebar:\n  order: ${order}\n---\n\n`;
  const out = resolve(outBase, dest);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, fm + text.trimStart() + '\n');
  console.log(`sync: docs/${src} -> ${dest}`);
}
console.log(`sync-docs: ${SYNC.length} 篇完成`);
