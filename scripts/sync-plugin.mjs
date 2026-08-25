#!/usr/bin/env node
// sync-plugin.mjs — 把 skills/study-coach/（单一事实源）打包成 zcode/Claude plugin 结构，
// 供 marketplace 分发：plugins/study-coach/（committed sync 产物，勿手编）。
//
// 产物结构（对照本机解剖的官方插件 github@0.1.1 / cloudflare@1.0.0）：
//   plugins/study-coach/
//     .zcode-plugin/plugin.json    # zcode manifest
//     .claude-plugin/plugin.json   # Claude Code 兼容（同内容）
//     skills/study-coach/SKILL.md + references/   # 从 skills/study-coach/ 原样拷贝
//   .claude-plugin/marketplace.json  # repo 根市集清单（add marketplace 用仓库完整 URL）
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
const SKILL_NAME = 'study-coach';
const SRC = join(REPO_ROOT, 'skills', SKILL_NAME);
const PLUGIN_DIR = join(REPO_ROOT, 'plugins', SKILL_NAME);

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

if (!existsSync(join(SRC, 'SKILL.md'))) {
  console.error(`[sync-plugin] 源缺失：${SRC}/SKILL.md（在仓库根目录执行）`);
  process.exit(1);
}

const DESCRIPTION = 'Study coach for ai-study-kit: scans your learning state (theme, progress, due flashcards, wrong questions, courses read, AI config) and coaches you through daily study, wrong-question grilling, podcasts, course generation, and release. /study-coach 学习教练：扫描学习状态，推荐下一步该学什么、带你执行。';
const KEYWORDS = ['study', 'learning', 'flashcards', 'srs', 'spaced-repetition', 'quiz', 'tutor', 'ai-study-kit'];

const manifest = {
  name: SKILL_NAME,
  version: VERSION,
  description: DESCRIPTION,
  description_i18n: {
    en: 'Study coach for ai-study-kit: scans your learning state (theme, progress, due flashcards, wrong questions, courses read, AI config) and coaches you through daily study, wrong-question grilling, podcasts, course generation, and release.',
    'zh-CN': 'ai-study-kit 学习教练：扫描学习状态（主题、进度、到期闪卡、错题、课程已读、AI 配置），带你执行每日学习、错题串讲、播客、产课到发版的全流程。',
  },
  author: { name: 'ai-study-kit', url: 'https://github.com/jerryjiao/ai-study-kit' },
  homepage: 'https://github.com/jerryjiao/ai-study-kit',
  keywords: KEYWORDS,
};

// plugin 目录：清重建（skills 拷贝 + app 源码快照 + 双 manifest）
rmSync(PLUGIN_DIR, { recursive: true, force: true });
mkdirSync(join(PLUGIN_DIR, 'skills', SKILL_NAME), { recursive: true });
copyTree(SRC, join(PLUGIN_DIR, 'skills', SKILL_NAME));
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
const tracked = execFileSync('git', ['ls-files', '--', 'apps/quiz-app', 'examples/dev-intro'], { cwd: REPO_ROOT })
  .toString()
  .split('\n')
  .filter(Boolean);
for (const rel of tracked) {
  const dest = join(KIT_DST, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(REPO_ROOT, rel), dest);
}
console.log(`[sync-plugin] apps/quiz-app + examples/dev-intro 跟踪面 ${tracked.length} 文件 → plugins/${SKILL_NAME}/kit/`);

// repo 根市集：marketplace.json（zcode/Claude 添加 marketplace 时读这份清单）
mkdirSync(join(REPO_ROOT, '.claude-plugin'), { recursive: true });
const marketplace = {
  name: 'ai-study-kit',
  description: 'ai-study-kit plugin marketplace: the /study-coach learning coach skill.',
  owner: { name: 'ai-study-kit', url: 'https://github.com/jerryjiao/ai-study-kit' },
  plugins: [
    {
      name: SKILL_NAME,
      source: `./plugins/${SKILL_NAME}`,
      description: manifest.description,
      version: VERSION,
      author: manifest.author,
      homepage: manifest.homepage,
      keywords: KEYWORDS,
      category: 'learning',
    },
  ],
};
writeFileSync(join(REPO_ROOT, '.claude-plugin', 'marketplace.json'), JSON.stringify(marketplace, null, 2) + '\n');

console.log(`[sync-plugin] skills/${SKILL_NAME} → plugins/${SKILL_NAME}  (v${VERSION})`);
console.log('[sync-plugin] → .claude-plugin/marketplace.json  (repo-root marketplace)');
console.log('[sync-plugin] 安装：zcode / Claude Code 添加 marketplace https://github.com/jerryjiao/ai-study-kit 后装 study-coach；改 skill 源后重跑本脚本再提交。');
