// command-surface.test.mjs — 命令面一致性门（v0.16 起，#64）：
// skills/ 目录名集合 = 主入口 SKILL.md 直入命令清单 = CONTEXT.md skill 词条计数 = AGENTS.md 命令面行提法。
// 先例同 i18n key 完整性测试与 kit-version 测试：人工并行结构的一致性由测试看住漂移——
// 加/改/删 skill 目录后，任何一处提法没跟上这里就红。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const SKILLS_DIR = join(REPO_ROOT, 'skills');
const MAIN_SKILL = 'ask-coach';

// 中文数字 → 数值（命令面计数用；超过十直接 fail 提示扩表）
const ZH_NUM = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 };
function zhNumToVal(zh, where) {
  const v = ZH_NUM[zh];
  assert.ok(v, `${where} 计数「${zh}」超出测试的中文数字表——请扩 ZH_NUM`);
  return v;
}

// 源头：skills/ 下每个含 SKILL.md 的目录就是一个 skill（名字 = 目录名 = 命令名）
const skillDirs = readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(SKILLS_DIR, e.name, 'SKILL.md')))
  .map((e) => e.name)
  .sort();
const thinDirs = skillDirs.filter((n) => n !== MAIN_SKILL);

// 从一段文本里抽反引号包裹的 /命令名
function backtickCommands(text) {
  return [...text.matchAll(/`\/([a-z][a-z0-9-]*)`/g)].map((m) => m[1]).sort();
}

test('skills/ 目录名 = SKILL.md frontmatter name（改名漏改 frontmatter 会红）', () => {
  for (const dir of skillDirs) {
    const md = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf-8');
    const name = md.match(/^name:\s*(\S+)/m)?.[1];
    assert.equal(name, dir, `skills/${dir}/SKILL.md frontmatter name 是「${name}」——目录名与命令名必须一致`);
  }
});

test('主入口 SKILL.md 直入命令清单 = 薄命令目录集合', () => {
  const md = readFileSync(join(SKILLS_DIR, MAIN_SKILL, 'SKILL.md'), 'utf-8');
  const paren = md.match(/常用动作另有直入命令（([^）]+)）/)?.[1];
  assert.ok(paren, '主入口 SKILL.md 找不到「常用动作另有直入命令（…）」清单——文案改了的话同步更新本测试的锚点');
  assert.deepEqual(backtickCommands(paren), thinDirs, '主入口直入命令清单与 skills/ 薄命令目录不一致');
});

test('CONTEXT.md skill 词条计数与命令面一致', () => {
  const md = readFileSync(join(REPO_ROOT, 'CONTEXT.md'), 'utf-8');
  const entry = md.split('\n').find((l) => l.includes('装进 agent 环境'));
  assert.ok(entry, 'CONTEXT.md 找不到 skill 词条行');
  const total = entry.match(/仓库内共([一二三四五六七八九十]+)个/)?.[1];
  assert.ok(total, 'CONTEXT.md skill 词条缺「仓库内共 N 个」计数——锚点变了同步更新本测试');
  assert.equal(zhNumToVal(total, 'CONTEXT.md'), skillDirs.length, `CONTEXT.md 计数「${total}个」≠ skills/ 实际 ${skillDirs.length} 个目录`);
  const thinSeg = entry.match(/\+ ([一二三四五六七八九十]+)个薄命令(.*)/)?.[2].split('，')[0];
  assert.ok(thinSeg, 'CONTEXT.md skill 词条缺「+ N 个薄命令」提法');
  assert.deepEqual(backtickCommands(thinSeg), thinDirs, 'CONTEXT.md 薄命令清单与 skills/ 薄命令目录不一致');
});

test('AGENTS.md 命令面行提法与 skills/ 目录一致', () => {
  const md = readFileSync(join(REPO_ROOT, 'AGENTS.md'), 'utf-8');
  const line = md.split('\n').find((l) => l.includes('命令面') && l.includes('薄命令'));
  assert.ok(line, 'AGENTS.md 找不到命令面约定行');
  const count = line.match(/命令面([一二三四五六七八九十]+)件/)?.[1];
  assert.ok(count, 'AGENTS.md 命令面行缺「命令面 N 件」计数');
  assert.equal(zhNumToVal(count, 'AGENTS.md'), skillDirs.length, `AGENTS.md 命令面「${count}件」≠ skills/ 实际 ${skillDirs.length} 个目录`);
  const seg = line.split('；')[0];
  assert.deepEqual(backtickCommands(seg), skillDirs, 'AGENTS.md 命令面行命令清单与 skills/ 目录不一致');
});
