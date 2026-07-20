/**
 * 选项重排脚本——治"最长即答案"和"答案集中在某位置"两个系统性质量缺陷。
 *
 * 原理：对每题的选项 key 做基于 id 的确定性伪随机重排（Fisher-Yates）。
 *   - 答案分布：打乱后正确答案均匀落在 A/B/C/D（期望各 25%）
 *   - 最长即答案：打乱后正确答案碰巧是最长选项的概率降到随机基线（约 25%）
 *   - 确定性：同一份输入每次跑结果一致（种子 = 题号哈希），可重复、可追溯
 *
 * 覆盖范围：只重排 _test_questions.json 的 single/multi 题（judge 只有"正确/错误"
 * 两项固定语义，不重排）。其他题源（COZE/EA/C/NET/CN）不动——它们是真题/已有题。
 *
 * 用法：node scripts/shuffle_options.mjs   # 重排后写回原文件
 *        node scripts/shuffle_options.mjs --check   # 只统计不写，看重排前分布
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const filePath = resolve(root, 'scripts/_test_questions.json');
const args = process.argv.slice(2);
const checkOnly = args.includes('--check');

// 确定性伪随机：用题 id 的 sha256 前 4 字节做种子，mulberry32 PRNG
function seededRandom(seedStr) {
  const h = createHash('sha256').update(seedStr).digest();
  let a = h.readUInt32LE(0);
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleKeys(keys, seedStr) {
  const rng = seededRandom(seedStr);
  const arr = [...keys];
  // Fisher-Yates
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const questions = JSON.parse(readFileSync(filePath, 'utf-8'));

// 重排前统计
function stats(label, pool) {
  let longestHit = 0, valid = 0;
  const dist = { A: 0, B: 0, C: 0, D: 0 };
  let totalAns = 0;
  for (const q of pool) {
    if (!q.options || q.type === 'judge') continue;
    const entries = Object.entries(q.options);
    const lens = entries.map(([, v]) => (v || '').length);
    if (Math.max(...lens) === Math.min(...lens)) continue;
    valid++;
    const max = Math.max(...lens);
    const ansKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
    if (ansKeys.every((k) => (q.options[k] || '').length === max)) longestHit++;
    for (const k of ansKeys) if (dist[k] !== undefined) { dist[k]++; totalAns++; }
  }
  console.log(`\n[${label}] 有效题 ${valid}　最长即答案 ${longestHit}/${valid} = ${(valid ? longestHit / valid * 100 : 0).toFixed(0)}%`);
  console.log(`  答案分布: ${Object.entries(dist).map(([k, n]) => `${k}=${n}(${(totalAns ? n / totalAns * 100 : 0).toFixed(0)}%)`).join(' ')}`);
}

stats('重排前', questions);

if (checkOnly) process.exit(0);

// 重排
let shuffled = 0;
for (const q of questions) {
  if (!q.options || q.type === 'judge') continue;
  const oldKeys = Object.keys(q.options);
  if (oldKeys.length < 2) continue;
  const oldAnsKeys = Array.isArray(q.answer) ? q.answer : [q.answer];

  // 基于 id 做种子的重排顺序
  const newOrder = shuffleKeys(oldKeys, q.id);
  // 建立 old→new 的映射
  const oldToNew = {};
  oldKeys.forEach((ok, i) => { oldToNew[ok] = newOrder[i]; });

  // 构造新 options（按 A,B,C,D 字母序填入重排后的内容）
  const newOptions = {};
  oldKeys.forEach((_, i) => {
    newOptions[oldKeys[i]] = q.options[newOrder[i]];
  });
  // 重映射答案
  const newAns = oldAnsKeys.map((k) => oldToNew[k]);

  q.options = newOptions;
  q.answer = newAns;
  shuffled++;
}

console.log(`\n✅ 重排 ${shuffled} 题（judge 题不动）`);
stats('重排后', questions);

writeFileSync(filePath, JSON.stringify(questions, null, 2) + '\n', 'utf-8');
console.log(`\n已写回 ${filePath}`);
