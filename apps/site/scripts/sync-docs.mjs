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

/** 每篇文档的页面 meta description（四语）：不写就用站点级兜底文案——28 个文档页曾被
 *  同一句站描述覆盖（2026-09-15 SEO 审计实锤），这里逐页写。缺译本语言回退中文
 *  （fallback 页本就走 noindex，见 patch-404.mjs）。 */
const DESCRIPTIONS = {
  'methodology.md': {
    zh: '学习方法论：能力大纲定考什么、参考材料建概念、做题验效果——三环脱节即纠偏的学习闭环。',
    en: 'The study methodology: the syllabus defines what to learn, reference materials build concepts, quizzes validate mastery.',
    es: 'La metodología de estudio: el temario define qué aprender, los materiales de referencia construyen conceptos y los cuestionarios validan el dominio.',
    ru: 'Методика обучения: программа определяет объём, справочные материалы строят понятия, тесты проверяют усвоение.',
  },
  'four-alignment.md': {
    zh: '四对齐原则：课程、题目、闪卡、错题记录围绕同一套考点对齐，任一处变动必跑双向校验。',
    en: 'The four-way alignment principle: lessons, questions, flashcards and wrong-answer records stay aligned around the same exam points.',
    es: 'El principio de alineación cuádruple: lecciones, preguntas, tarjetas y errores alineados en los mismos puntos de examen.',
    ru: 'Принцип четырёхстороннего соответствия: уроки, вопросы, карточки и ошибки выровнены по одним пунктам программы.',
  },
  'ai-cli-guide.md': {
    zh: '三个 AI 命令行工具：teach 产课程、grill 产错题精讲、podcast 产双播播客，支持四语输出与 --json 管道。',
    en: 'The three AI CLIs: teach generates lessons, grill writes wrong-answer deep-dives, podcast produces a two-host review show; four output languages and --json supported.',
    es: 'Las tres CLI de IA: teach genera lecciones, grill escribe repasos de errores y podcast produce un programa de repaso; salida en cuatro idiomas y --json.',
    ru: 'Три ИИ-CLI: teach создаёт уроки, grill пишет разборы ошибок, podcast выпускает передачу; четыре языка вывода и --json.',
  },
  'ai-study-kit.md': {
    zh: '/ask-coach 学习教练：只读探测学习状态 → 快照 + 推荐 + 菜单 → 按十三流程 playbook 带执行。',
    en: 'The /ask-coach study coach: read-only state probe → snapshot, recommendation and menu → guided execution through thirteen flows.',
    es: 'El coach de estudio /ask-coach: sondeo del estado → instantánea, recomendación y menú → ejecución guiada en trece flujos.',
    ru: 'Учебный коуч /ask-coach: снятие состояния → снимок, рекомендация и меню → сопровождение по тринадцати процессам.',
  },
  'configuration.md': {
    zh: '配置指南：在 .env 配 LLM/TTS provider——OpenAI 兼容端点、四语输出与语音合成。',
    en: 'Configuration guide: set your LLM/TTS providers in .env — OpenAI-compatible endpoints, four output languages and speech synthesis.',
    es: 'Guía de configuración: define tus proveedores LLM/TTS en .env — puntos compatibles con OpenAI, salida en cuatro idiomas y síntesis de voz.',
    ru: 'Руководство по настройке: провайдеры LLM/TTS в .env — эндпоинты, совместимые с OpenAI, вывод на четырёх языках и синтез речи.',
  },
  'bidirectional-check.md': {
    zh: '双向校验脚本：题→课、课→题、闪卡覆盖三个方向自动检查四对齐。',
    en: 'The bidirectional check script: question→lesson, lesson→question and flashcard-coverage checks keep the four artifacts aligned.',
    es: 'El script de verificación bidireccional: pregunta→lección, lección→pregunta y cobertura de tarjetas mantienen la alineación.',
    ru: 'Скрипт двусторонней проверки: вопрос→урок, урок→вопрос и покрытие карточками сохраняют соответствие.',
  },
  'CHANGELOG.md': {
    zh: '更新日志：每版新契约、老项目缺了会怎样、怎么补，逐版回答「升级与存量影响」。',
  },
};

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

  // 页面 meta description：查 DESCRIPTIONS 表（缺译本语言回退中文），JSON.stringify 安全转义
  const description = DESCRIPTIONS[src]?.[lang] ?? DESCRIPTIONS[src]?.zh;
  const descLine = description ? `description: ${JSON.stringify(description)}\n` : '';
  const fm = `---\ntitle: ${JSON.stringify(title)}\n${descLine}sidebar:\n  order: ${order}\n---\n\n`;
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
