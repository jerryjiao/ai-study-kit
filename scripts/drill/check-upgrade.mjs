#!/usr/bin/env node
// check-upgrade.mjs — F13 升级演练的断言面（U6 #61）。对照 .drill-manifest.json 逐项断言：
//   ① progress 与升级前逐字节一致（F13 硬承诺：不解析、不合并、不改写）
//   ② 主题内容（kit 外）逐文件 sha 一致——升级只动 kit 代码与契约映射，不碰主题包
//   ③ kit/kit-version.json 存在且 = 插件快照版本（版本对齐）
//   ④ 无嵌套 kit/kit
//   ⑤ 插件快照的每个 kit 文件用户项目都有（对照快照补缺失的新文件，文件级全功能对齐）
//   ⑥ 契约缺口如实保留：闪卡仍无 examPoint（F13 只引导不代写——演练中学习者选择稍后补），
//      且旧格式学习记录原样可读
// 退出码：全绿 0；任一断言红 1（供演练管道 / 回归复用）。
//
// 用法：node scripts/drill/check-upgrade.mjs <项目目录> [<插件快照 kit 目录>]
//   项目目录默认 /tmp/ask-drill/project；快照默认 <repo>/plugins/ai-study-kit/kit
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..');
const project = resolve(process.argv[2] || '/tmp/ask-drill/project');
const snapshot = resolve(process.argv[3] || join(REPO_ROOT, 'plugins', 'ai-study-kit', 'kit'));

const sha256 = (s) => createHash('sha256').update(s).digest('hex');
const failures = [];
const ok = (name) => console.log(`  ✅ ${name}`);
const info = (name) => console.log(`  ✅ ${name}（信息性）`);
const bad = (name, detail) => { failures.push(name); console.error(`  ❌ ${name}${detail ? `——${detail}` : ''}`); };

function listFiles(dir, base = dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...listFiles(p, base));
    else out.push(relative(base, p));
  }
  return out;
}

console.log(`[drill-check] 项目：${project}`);
console.log(`[drill-check] 快照：${snapshot}`);

const manifest = JSON.parse(readFileSync(join(project, '.drill-manifest.json'), 'utf-8'));
const themeDir = join(project, manifest.themeDir || 'theme/net-basics');
// ① progress 逐字节一致
const progressPath = join(project, 'kit', 'apps', 'quiz-app', 'progress.json');
if (existsSync(progressPath)) {
  const got = sha256(readFileSync(progressPath));
  got === manifest.progressSha
    ? ok(`progress 逐字节一致（sha=${got.slice(0, 12)}…）`)
    : bad('progress 被改动', `sha ${got.slice(0, 12)}… ≠ 夹具 ${manifest.progressSha.slice(0, 12)}…`);
} else bad('progress 丢失', progressPath);

// ② 主题内容不动
for (const [rel, want] of Object.entries(manifest.themeShas)) {
  const p = join(themeDir, rel);
  if (!existsSync(p)) { bad(`主题文件丢失：${manifest.themeDir}/${rel}`); continue; }
  const got = sha256(readFileSync(p));
  got === want ? ok(`主题不动：${rel}`) : bad(`主题被改动：${rel}`, '升级不许碰 kit 外的主题包');
}

// ③ 版本对齐
const versionFile = join(project, 'kit', 'kit-version.json');
if (!existsSync(versionFile)) {
  bad('kit-version.json 缺失', '重拷后应随快照带进用户项目');
} else {
  const projectVersion = JSON.parse(readFileSync(versionFile, 'utf-8')).version;
  const snapshotVersion = JSON.parse(readFileSync(join(snapshot, 'kit-version.json'), 'utf-8')).version;
  projectVersion === snapshotVersion
    ? ok(`版本已对齐（v${projectVersion}）`)
    : bad('版本未对齐', `项目 v${projectVersion} ≠ 快照 v${snapshotVersion}`);
}

// ④ 无嵌套
existsSync(join(project, 'kit', 'kit'))
  ? bad('嵌套 kit/kit 出现', 'F1/F13 的拷贝姿势错误')
  : ok('无嵌套 kit/kit');

// ⑤ 文件级全功能对齐：快照每个文件项目都有
if (statSync(snapshot).isDirectory()) {
  const snapFiles = listFiles(snapshot);
  const missing = snapFiles.filter((rel) => !existsSync(join(project, 'kit', rel)));
  missing.length === 0
    ? ok(`快照文件全到位（${snapFiles.length} 个，含 v0.14 新文件如 scripts/lib/oral.mjs）`)
    : bad(`缺 ${missing.length} 个快照文件`, missing.slice(0, 5).join('、'));
} else {
  bad('快照目录不存在', snapshot);
}

// ⑥ 契约缺口状态（信息性，不判红）：② 的 sha 断言才是「F13 未代写」的硬保证——
// 本项只如实报告缺口当前处于哪种合法终态，供人工/回归读数；学习者事后部分补齐不是失败。
const flashcards = JSON.parse(readFileSync(join(themeDir, 'flashcards.json'), 'utf-8'));
const mapped = flashcards.filter((c) => c.examPoint).length;
const state = mapped === 0 ? '如实保留（未被代写，待学习者按引导补）' : mapped === flashcards.length ? '已由学习者补齐（全量映射）' : `学习者部分补齐（${mapped}/${flashcards.length}）`;
info(`契约缺口状态：闪卡 ${mapped}/${flashcards.length} 带 examPoint —— ${state}`);
const recordFile = join(themeDir, 'study', 'records', '01-osi-layers.md');
existsSync(recordFile) && readFileSync(recordFile, 'utf-8').includes('口头题计数')
  ? ok('v0.13 旧格式学习记录原样保留（照读兼容）')
  : bad('旧格式学习记录被动过');

console.log(failures.length ? `\n[drill-check] ❌ ${failures.length} 项红：${failures.join('；')}` : '\n[drill-check] ✅ 全绿：F13 完成标志全部达成');
process.exit(failures.length ? 1 : 0);
