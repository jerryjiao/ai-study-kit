// sync-docs.mjs — 把仓库根 docs/*.md 同步成 Starlight 内容页（site 内为生成物，勿手编）。
// 处理：抽首行 H1 为 frontmatter title（避免与页面头重复）、注入 sidebar 顺序、
// 已英译的两篇（methodology / four-alignment）去掉文首 "> **EN**: ..." 摘要引用块。
// 运行：apps/site 的 predev/prebuild 自动跑，或 pnpm run sync:docs。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(siteRoot, '../..');
const docsDir = resolve(repoRoot, 'docs');
const outBase = resolve(siteRoot, 'src/content/docs');

// 源文件 → [目标相对路径, sidebar 顺序, 是否去 EN 摘要]
const MAP = [
  ['methodology.md', 'method/methodology.md', 1, true],
  ['four-alignment.md', 'method/four-alignment.md', 2, true],
  ['ai-cli-guide.md', 'ai/ai-cli.md', 1, false],
  ['study-coach.md', 'ai/study-coach.md', 2, false],
  ['configuration.md', 'ai/configuration.md', 3, false],
  ['bidirectional-check.md', 'maintain/bidirectional-check.md', 1, false],
];

let count = 0;
for (const [src, dest, order, stripEn] of MAP) {
  let text = readFileSync(resolve(docsDir, src), 'utf8');

  // 0) 站内交叉链接重写：docs/ 里的相对 .md 链接 → Starlight 站内路径
  const LINK_MAP = {
    'methodology.md': '/method/methodology/',
    'four-alignment.md': '/method/four-alignment/',
    'bidirectional-check.md': '/maintain/bidirectional-check/',
    'ai-cli-guide.md': '/ai/ai-cli/',
    'study-coach.md': '/ai/study-coach/',
    'configuration.md': '/ai/configuration/',
  };
  text = text.replace(/\(\.?\/([a-z-]+\.md)\)/g, (m, file) =>
    LINK_MAP[file] ? `(${LINK_MAP[file]})` : m);

  // 1) 抽 H1 当 title，并从正文移除（Starlight 自己渲染标题头）
  const m = text.match(/^#\s+(.+)\n?/);
  if (!m) throw new Error(`${src}: 找不到首行 H1 标题`);
  const title = m[1].trim();
  text = text.slice(m[0].length);

  // 2) 已英译篇目：去掉紧随标题的英文摘要引用块（官网有完整英文版，摘要冗余）
  if (stripEn) {
    text = text.replace(/^(\s*>\s*\*\*EN\*\*[^>]*\n(?:\s*>.*\n)*)\s*\n?/, '\n');
  }

  // 3) 注入 frontmatter
  const fm = `---\ntitle: ${JSON.stringify(title)}\nsidebar:\n  order: ${order}\n---\n\n`;
  const out = resolve(outBase, dest);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, fm + text.trimStart() + '\n');
  count++;
  console.log(`sync: docs/${src} -> ${dest}`);
}
console.log(`sync-docs: ${count} 篇完成`);
