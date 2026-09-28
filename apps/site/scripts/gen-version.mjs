// gen-version.mjs — 从仓库根 package.json 写 apps/site/public/version.json（spec #99/#100 假绿探测）。
// 内容与插件 kit-version.json 同构：{"version":"<版本>"}。它是探测协议第三处「最新发布」的取数源
// （skills/references/state.md §8）：站点构建时生成、随 push main 经 GitHub Actions 部署上线——
// 版本真源唯一（根 package.json），零手工同步。
// 运行：apps/site 的 prebuild 自动跑。产物是生成物（.gitignore 排除 public/version.json），勿手编。
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const siteRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = resolve(siteRoot, '../..');
const { version } = JSON.parse(readFileSync(resolve(repoRoot, 'package.json'), 'utf-8'));
writeFileSync(resolve(siteRoot, 'public/version.json'), JSON.stringify({ version }) + '\n');
console.log(`gen-version: v${version} -> public/version.json`);
