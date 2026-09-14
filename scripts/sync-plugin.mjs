#!/usr/bin/env node
// sync-plugin.mjs — 把 skills/（多 skill 单一事实源：ask-coach 主入口 + 薄命令）打包成
// zcode/Claude plugin 结构，供 marketplace 分发：plugins/ai-study-kit/（committed sync 产物，勿手编）。
//
// 产物结构（对照本机解剖的官方插件 github@0.1.1 / cloudflare@1.0.0）：
//   plugins/ai-study-kit/
//     .zcode-plugin/plugin.json    # zcode manifest
//     .claude-plugin/plugin.json   # Claude Code 兼容（同内容）
//     skills/<skill-name>/...      # skills/ 下每个含 SKILL.md 的源目录原样拷入（多 skill：v0.13 起）
//     kit/                         # 迷你仓库快照（apps/quiz-app + examples/dev-intro 跟踪面）
//     icon.png                     # 插件包根图标
//   .claude-plugin/marketplace.json  # repo 根市集清单（add marketplace 用仓库完整 URL）
//
// 命名约定：**插件名 ai-study-kit 终身不变**（市集名不可改）；skill 名即命令名——
// 主入口 ask-coach（原 skill 名 ai-study-kit，v0.13 更名，市集装出后敲 /ask-coach），
// 薄命令 coach / doctor / recap 各自一个源目录。
//
// 版本：默认取根 package.json 的 version（发版改一处，plugin 跟随）；--version 可临时覆盖。
//
// 用法：node scripts/sync-plugin.mjs [--version 0.4.0]
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const SKILLS_SRC = join(REPO_ROOT, 'skills');
const PLUGIN_NAME = 'ai-study-kit';          // 插件名（市集终身名，不随 skill 更名变）
const MAIN_SKILL = 'ask-coach';              // 主入口 skill（描述/关键词以它为准）
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', PLUGIN_NAME);

// 逐文件复制替代 cpSync 递归：同 sync-study.mjs 的坑——部分 Windows/受限环境下
// cpSync 目录级递归会被安全策略直接终止进程（exit 127 无输出，此前已把 plugin 目录清到一半）。
function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  for (const e of readdirSync(src, { withFileTypes: true })) {
    const s = join(src, e.name);
    const d = join(dest, e.name);
    if (e.isDirectory()) copyTree(s, d);
    else copyFileSync(s, d);
  }
}

const args = process.argv.slice(2);
const vIdx = args.indexOf('--version');
const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf-8'));
const VERSION = vIdx >= 0 ? args[vIdx + 1] : pkg.version;

// 多 skill 源发现：skills/ 下每个含 SKILL.md 的目录都是一个 skill（名字 = 目录名 = 命令名）
if (!existsSync(SKILLS_SRC) || !readdirSync(SKILLS_SRC).length) {
  console.error(`[sync-plugin] 源缺失：${SKILLS_SRC}/ 下没有任何 skill 目录（在仓库根目录执行）`);
  process.exit(1);
}
const skillDirs = readdirSync(SKILLS_SRC, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS_SRC, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .sort();
if (!skillDirs.includes(MAIN_SKILL)) {
  console.error(`[sync-plugin] 主 skill 缺失：skills/${MAIN_SKILL}/SKILL.md`);
  process.exit(1);
}

// 主 description 中文为主（与 README/官网默认语言一致），尾缀一句英文给国际市集可发现性；
// en/zh-CN 全文分存在 description_i18n（zcode 客户端按 locale 取）。
const DESCRIPTION = '/ask-coach 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、陪练记录、考期、AI 配置），推荐下一步该学什么、做什么——初始化、开新主题、陪练教学、考前冲刺、每日刷题、错题串讲、播客、改内容、校验、部署。 Study coach for ai-study-kit: scans your learning state and tells you what to do next.';
const KEYWORDS = ['study', 'learning', 'flashcards', 'srs', 'spaced-repetition', 'quiz', 'tutor', 'ai-study-kit'];
// 插件图标：源是仓库根 assets/logo.png（与 quiz-app/官网三端同源）。marketplace 的 icon 走 jsDelivr
// 绝对 URL（zcode 官方源同款做法；raw.githubusercontent 直连会撞 429/墙，jsDelivr 是 CDN 更稳）。
const ICON_URL = 'https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png';

const manifest = {
  name: PLUGIN_NAME,
  version: VERSION,
  description: DESCRIPTION,
  description_i18n: {
    en: 'Study coach for ai-study-kit: scans your learning state (theme, progress, due flashcards, wrong questions, tutoring records, sprint deadline, AI config) and tells you what to do next — bootstrap, new theme, coached tutoring, pre-deadline sprint, daily study, wrong-question grill, podcast, content edits, verify, deploy.',
    'zh-CN': 'ai-study-kit 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、陪练记录、考期、AI 配置），推荐下一步该学什么、做什么——初始化、开新主题、陪练教学、考前冲刺、每日刷题、错题串讲、播客、改内容、校验、部署。',
  },
  author: { name: 'ai-study-kit', url: 'https://github.com/jerryjiao/ai-study-kit' },
  homepage: 'https://github.com/jerryjiao/ai-study-kit',
  keywords: KEYWORDS,
};

// plugin 目录：清重建（skills 拷贝 + app 源码快照 + 双 manifest）
rmSync(PLUGIN_DIR, { recursive: true, force: true });
for (const skill of skillDirs) {
  copyTree(join(SKILLS_SRC, skill), join(PLUGIN_DIR, 'skills', skill));
  console.log(`[sync-plugin] skills/${skill} → plugins/${PLUGIN_NAME}/skills/${skill}/`);
}
mkdirSync(join(PLUGIN_DIR, '.zcode-plugin'), { recursive: true });
mkdirSync(join(PLUGIN_DIR, '.claude-plugin'), { recursive: true });
const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
writeFileSync(join(PLUGIN_DIR, '.zcode-plugin', 'plugin.json'), manifestJson);
writeFileSync(join(PLUGIN_DIR, '.claude-plugin', 'plugin.json'), manifestJson);

// kit/ = 迷你仓库快照（发行形态：装插件即得可构建的答题站 + dev-intro 演示，用户零 clone）。
// 只拷 git 跟踪文件——跟踪面天然排除 node_modules/dist/同步产物(.json)/.env/progress.json，
// 指纹门禁保证零私人内容。必须保留 apps/examples 的相对结构：scripts 的 REPO_ROOT 约定是
// `../../..`（apps/quiz-app/scripts → 仓库根），examples/dev-intro 是无 EXAMPLE_THEME 时的回落主题。
// skill 的 F1 流把整个 kit/ 拷进用户项目（见 references/flows.md）。
const KIT_DST = join(PLUGIN_DIR, 'kit');
// ls-files 默认 core.quotePath=true 会把非 ASCII 文件名转成带八进制转义的引号串
// （"cluster-01-git-\346\217\220…"），按字面 stat 必然「工作树缺失」——中文文件名
// （如 grill 产出的中文主题 cluster 页）会整批漏出快照。用 -z 按原文拿路径。
const tracked = execFileSync('git', ['ls-files', '-z', '--', 'apps/quiz-app', 'examples/dev-intro'], { cwd: REPO_ROOT })
  .toString()
  .split('\0')
  .filter(Boolean);
// 工作树缺文件（已跟踪但删除未 staged / rm 未 add）跳过并记名：快照取的是工作树现状，
// 硬拷会 ENOENT 崩掉整个 sync（v0.8→v0.9 期间 wrong-questions/ 迁往 study/ 时踩中）。
const missing = [];
for (const rel of tracked) {
  const src = join(REPO_ROOT, rel);
  if (!existsSync(src)) {
    missing.push(rel);
    continue;
  }
  const dest = join(KIT_DST, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
if (missing.length) console.warn(`[sync-plugin] ⚠ 工作树缺失（删除未 staged？快照不含）：\n  ${missing.join('\n  ')}`);
console.log(`[sync-plugin] apps/quiz-app + examples/dev-intro 跟踪面 ${tracked.length - missing.length} 文件 → plugins/${PLUGIN_NAME}/kit/`);

// icon.png 拷进插件包根（对照 cloudflare 插件带 logo.svg 的做法，覆盖从插件包找图标的消费方）
copyFileSync(join(REPO_ROOT, 'assets', 'logo.png'), join(PLUGIN_DIR, 'icon.png'));

// repo 根市集：marketplace.json（zcode/Claude 添加 marketplace 时读这份清单）
mkdirSync(join(REPO_ROOT, '.claude-plugin'), { recursive: true });
const marketplace = {
  name: 'ai-study-kit',
  description: 'ai-study-kit 插件市集：/ask-coach 学习教练（+ /coach /doctor /recap 薄命令）。',
  owner: { name: 'ai-study-kit', url: 'https://github.com/jerryjiao/ai-study-kit' },
  plugins: [
    {
      name: PLUGIN_NAME,
      source: `./plugins/${PLUGIN_NAME}`,
      description: manifest.description,
      version: VERSION,
      author: manifest.author,
      homepage: manifest.homepage,
      keywords: KEYWORDS,
      category: 'learning',
      icon: ICON_URL,
    },
  ],
};
writeFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n');

console.log(`[sync-plugin] skills/（${skillDirs.length} 个：${skillDirs.join(', ')}）→ plugins/${PLUGIN_NAME}/  (v${VERSION})`);
console.log('[sync-plugin] → .claude-plugin/marketplace.json  (repo-root marketplace)');
console.log('[sync-plugin] 安装：zcode / Claude Code 添加 marketplace https://github.com/jerryjiao/ai-study-kit 后装 ai-study-kit；改 skill 源后重跑本脚本再提交。');
