#!/usr/bin/env node
// sync-plugin.mjs — 把 skills/（多 skill 单一事实源：ask-coach 主入口 + 薄命令）打包成
// zcode/Claude plugin 结构，供 marketplace 分发：plugins/ai-study-kit/（committed sync 产物，勿手编）。
//
// 产物结构（对照本机解剖的官方插件 github@0.1.1 / cloudflare@1.0.0）：
//   plugins/ai-study-kit/
//     .zcode-plugin/plugin.json    # zcode manifest
//     .claude-plugin/plugin.json   # Claude Code 兼容（同内容）
//     .codex-plugin/plugin.json    # Codex CLI 清单（该目录只放这一个文件，Codex 约束）
//     plugin.json                  # Agent Plugins 1.0 标准清单（agent-plugins.org）
//     skills/<skill-name>/...      # skills/ 下每个含 SKILL.md 的源目录原样拷入（多 skill：v0.13 起）
//     kit/                         # 迷你仓库快照（apps/quiz-app + examples/dev-intro 跟踪面）
//     icon.png                     # 插件包根图标
//     README.md                    # 插件包 README（定位/五命令/安装入口；DESCRIPTION 同源顺产）
//     CHANGELOG.md                 # 根 CHANGELOG 全文拷贝（F13「落后 N 版」数它；每版重生成）
//   .claude-plugin/marketplace.json  # repo 根市集清单（add marketplace 用仓库完整 URL）
//   .agents/plugins/marketplace.json # repo 根 Codex 市集清单（codex plugin marketplace add <owner>/<repo>）
//
// 「一份内容、多清单」：插件本体（skills + kit/）不动，各生态清单由本脚本顺产，
// 布局逐字段对齐 openai/role-specific-plugins（.agents/plugins/marketplace.json +
// 每插件 .codex-plugin/plugin.json）与 Agent Plugins 1.0 schema（插件根 plugin.json）。
//
// 命名约定：**插件名 ai-study-kit 终身不变**（市集名不可改）；skill 名即命令名——
// 主入口 ask-coach（原 skill 名 ai-study-kit，v0.13 更名，市集装出后敲 /ask-coach），
// 薄命令一律 study- 前缀（v0.16 起：study-coach / study-doctor / study-recap / study-podcast
// 各自一个源目录；coach 原为裸名，v0.16 统一改名 study-coach，干净切不留别名）。
//
// 版本：默认取根 package.json 的 version（发版改一处，plugin 跟随）；--version 可临时覆盖。
//
// 用法：node scripts/sync-plugin.mjs [--version 0.4.0] [--allow-missing]
//   --allow-missing：工作树缺跟踪文件时降级为警告继续（默认 exit 1）。只在明确知道自己在
//   删文件且暂未 staged 的场合用；正常流程应当 git add 后重跑，保持快照完整。
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
const allowMissing = args.includes('--allow-missing');
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
const DESCRIPTION = '/ask-coach 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、陪练记录、考期、AI 配置、kit 版本漂移），推荐下一步该学什么、做什么——初始化、开新主题、陪练教学、考前冲刺、每日刷题、错题串讲、播客、改内容、校验、部署、升级。 Study coach for ai-study-kit: scans your learning state and tells you what to do next.';
const KEYWORDS = ['study', 'learning', 'flashcards', 'srs', 'spaced-repetition', 'quiz', 'tutor', 'ai-study-kit'];
// 插件图标：源是仓库根 assets/logo.png（与 quiz-app/官网三端同源）。marketplace 的 icon 走 jsDelivr
// 绝对 URL（zcode 官方源同款做法；raw.githubusercontent 直连会撞 429/墙，jsDelivr 是 CDN 更稳）。
const ICON_URL = 'https://cdn.jsdelivr.net/gh/jerryjiao/ai-study-kit@main/assets/logo.png';

const manifest = {
  name: PLUGIN_NAME,
  version: VERSION,
  description: DESCRIPTION,
  description_i18n: {
    en: 'Study coach for ai-study-kit: scans your learning state (theme, progress, due flashcards, wrong questions, tutoring records, sprint deadline, AI config, kit version drift) and tells you what to do next — bootstrap, new theme, coached tutoring, pre-deadline sprint, daily study, wrong-question grill, podcast, content edits, verify, deploy, upgrade.',
    'zh-CN': 'ai-study-kit 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、陪练记录、考期、AI 配置、kit 版本漂移），推荐下一步该学什么、做什么——初始化、开新主题、陪练教学、考前冲刺、每日刷题、错题串讲、播客、改内容、校验、部署、升级。',
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
mkdirSync(join(PLUGIN_DIR, '.codex-plugin'), { recursive: true });
const manifestJson = JSON.stringify(manifest, null, 2) + '\n';
writeFileSync(join(PLUGIN_DIR, '.zcode-plugin', 'plugin.json'), manifestJson);
writeFileSync(join(PLUGIN_DIR, '.claude-plugin', 'plugin.json'), manifestJson);

// Codex CLI 清单（对照 openai/role-specific-plugins 的 sales 示例）。
// Codex 约束：.codex-plugin/ 目录里只放 plugin.json，别的东西都在插件根。
const codexManifest = {
  name: PLUGIN_NAME,
  version: VERSION,
  description: DESCRIPTION,
  author: manifest.author,
  homepage: manifest.homepage,
  repository: 'https://github.com/jerryjiao/ai-study-kit/tree/main/plugins/ai-study-kit',
  license: 'MIT',
  keywords: KEYWORDS,
  skills: './skills/',
  interface: {
    displayName: 'ai-study-kit',
    shortDescription: 'Study coach: turn any topic into a full learning loop',
    developerName: 'ai-study-kit',
    category: 'Productivity',
    capabilities: ['Interactive', 'Read', 'Write'],
    websiteURL: 'https://aistudykit.dev/',
  },
};
writeFileSync(join(PLUGIN_DIR, '.codex-plugin', 'plugin.json'), JSON.stringify(codexManifest, null, 2) + '\n');

// Agent Plugins 1.0 标准清单（开放标准，2026-08-06 起；Cursor/Vercel/GitHub/AWS/Microsoft 签署）。
// schema: https://agent-plugins.org/schemas/1.0.0/plugin.schema.json（必填仅 $schema+name，
// additionalProperties:false，author 只认 name/email/url——别塞别的键）。
const agentPluginsManifest = {
  $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
  name: PLUGIN_NAME,
  version: VERSION,
  description: DESCRIPTION,
  author: manifest.author,
  homepage: manifest.homepage,
  repository: 'https://github.com/jerryjiao/ai-study-kit/tree/main/plugins/ai-study-kit',
  license: 'MIT',
  keywords: KEYWORDS,
};
writeFileSync(join(PLUGIN_DIR, 'plugin.json'), JSON.stringify(agentPluginsManifest, null, 2) + '\n');

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
if (missing.length) {
  const lines = missing.join('\n  ');
  if (!allowMissing) {
    console.error(`[sync-plugin] ✗ 工作树缺失（删除未 staged？）——快照会缺文件，已中止：\n  ${lines}\n  确认在删文件请先 git add 后重跑；确要带着缺口出包，加 --allow-missing。`);
    process.exit(1);
  }
  console.error(`[sync-plugin] ⚠⚠ --allow-missing 生效：以下工作树缺失文件被排除出快照（仅限明确有意的删除场景）：\n  ${lines}`);
}
console.log(`[sync-plugin] apps/quiz-app + examples/dev-intro 跟踪面 ${tracked.length - missing.length} 文件 → plugins/${PLUGIN_NAME}/kit/`);

// kit-version.json：kit 快照的版本标记（ADR-0006）——每个装出去/拷出去的 kit 由此「自报版本」。
// F1 拷贝自然带进用户项目；skill 读用户项目与插件快照两处 diff 判版本漂移；
// 存量项目无此文件 = 版本未知，按最老处理。打包断言见
// apps/quiz-app/scripts/lib/kit-version.test.mjs（node:test 带）。
writeFileSync(
  join(KIT_DST, 'kit-version.json'),
  JSON.stringify({ version: VERSION }, null, 2) + '\n'
);
console.log(`[sync-plugin] → kit/kit-version.json  (v${VERSION})`);

// icon.png 拷进插件包根（对照 cloudflare 插件带 logo.svg 的做法，覆盖从插件包找图标的消费方）
copyFileSync(join(REPO_ROOT, 'assets', 'logo.png'), join(PLUGIN_DIR, 'icon.png'));

// CHANGELOG.md 全文拷进插件包根（每版重生成）：F13 升级流「落后 N 版」要数 CHANGELOG，
// 发行物里此前没有——市集用户只看得到版本号，看不到每版改了什么。
copyFileSync(join(REPO_ROOT, 'CHANGELOG.md'), join(PLUGIN_DIR, 'CHANGELOG.md'));
console.log(`[sync-plugin] → plugins/${PLUGIN_NAME}/CHANGELOG.md`);

// README.md（DESCRIPTION 同源顺产）：市集详情页/插件目录给用户看的定位 + 命令面 + 安装入口。
// 部分宿主（zcode）给命令加插件命名空间前缀（/ai-study-kit:ask-coach），写明免得用户找不到命令。
const README = `# ${PLUGIN_NAME} — 学习教练 skill 套件

${DESCRIPTION}

## 命令（五件）

| 命令 | 直入什么 |
|------|----------|
| \`/ask-coach\` | 主入口：探测学习状态 → 快照+推荐 → 带执行（其余四件都是它的直入快捷方式） |
| \`/study-coach\` | 陪练直入：坐下就学（F10 陪练教学） |
| \`/study-doctor\` | 一站式体检：四门校验 + 环境探测 |
| \`/study-recap\` | 错题串讲直入（F4） |
| \`/study-podcast\` | 播客直入（F5） |

部分宿主会给命令加插件命名空间前缀，如 zcode 下敲 \`/ai-study-kit:ask-coach\`（薄命令同理：\`/ai-study-kit:study-coach\` 等）。

## 安装 / 更新 / 文档

- 安装协议（Claude Code / zcode / Codex / 手动通用）：https://aistudykit.dev/install.md
- 官网 https://aistudykit.dev · 仓库 https://github.com/jerryjiao/ai-study-kit · 更新日志 [CHANGELOG.md](./CHANGELOG.md)
`;
writeFileSync(join(PLUGIN_DIR, 'README.md'), README);
console.log(`[sync-plugin] → plugins/${PLUGIN_NAME}/README.md`);

// repo 根市集：marketplace.json（zcode/Claude 添加 marketplace 时读这份清单）
mkdirSync(join(REPO_ROOT, '.claude-plugin'), { recursive: true });
const marketplace = {
  name: 'ai-study-kit',
  description: 'ai-study-kit 插件市集：/ask-coach 学习教练（+ /study-coach /study-doctor /study-recap /study-podcast 薄命令）。',
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

// repo 根 Codex 市集清单（字段照 openai/role-specific-plugins 的 .agents/plugins/marketplace.json；
// policy 值取官方样本现状 ON_USE）。`codex plugin marketplace add jerryjiao/ai-study-kit` 读这份。
mkdirSync(join(REPO_ROOT, '.agents', 'plugins'), { recursive: true });
const codexMarketplace = {
  name: 'ai-study-kit',
  interface: { displayName: 'ai-study-kit' },
  plugins: [
    {
      name: PLUGIN_NAME,
      source: { source: 'local', path: `./plugins/${PLUGIN_NAME}` },
      policy: { installation: 'AVAILABLE', authentication: 'ON_USE' },
      category: 'Productivity',
    },
  ],
};
writeFileSync(join(REPO_ROOT, '.agents', 'plugins', 'marketplace.json'), JSON.stringify(codexMarketplace, null, 2) + '\n');

console.log(`[sync-plugin] skills/（${skillDirs.length} 个：${skillDirs.join(', ')}）→ plugins/${PLUGIN_NAME}/  (v${VERSION})`);
console.log('[sync-plugin] → .claude-plugin/marketplace.json  (repo-root marketplace)');
console.log('[sync-plugin] → .agents/plugins/marketplace.json + .codex-plugin/plugin.json + plugin.json  (Codex / Agent Plugins 1.0)');
console.log('[sync-plugin] 安装：zcode / Claude Code 添加 marketplace https://github.com/jerryjiao/ai-study-kit 后装 ai-study-kit；Codex 走 codex plugin marketplace add jerryjiao/ai-study-kit；改 skill 源后重跑本脚本再提交。');
