/**
 * dedup_coze_answers.mjs — 清理 coze 源 answer 数组里的重复索引
 *
 * coze 导出的 answer 数组常有重复索引（如 [0,0,1,1,3,3]），
 * build_coze.mjs 转换时会用 new Set 兜底去重，但源数据本身脏应该清干净，
 * 避免直接看源时困惑、也避免下游脚本误判。
 *
 * 去重策略：[...new Set(arr)] 保留首次出现顺序，与 build_coze 第 111 行一致，
 * 保证去重前后 build_coze 输出完全不变（幂等、无副作用）。
 *
 * 顺手校验：answer 元素必须是 0..options.length-1 范围内的整数，否则报错（不静默修）。
 *
 * 用法：
 *   node quiz-app/scripts/dedup_coze_answers.mjs          # dry-run
 *   node quiz-app/scripts/dedup_coze_answers.mjs --write   # 实际写回
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cozePath = join(__dirname, '..', '..', 'docs', 'coze-exam', 'coze-questions.json');
const write = process.argv.includes('--write');

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));
let dedupN = 0;
let removedN = 0;
const invalid = [];

for (const q of coze) {
  // 校验：元素必须是 [0, options.length) 范围的整数
  for (const i of q.answer) {
    if (!Number.isInteger(i) || i < 0 || i >= q.options.length) {
      invalid.push({ id: q.id, val: i, optN: q.options.length });
    }
  }
  if (invalid.length) continue; // 有非法值先不处理这题，等人工

  const u = [...new Set(q.answer)];
  if (u.length !== q.answer.length) {
    dedupN++;
    removedN += q.answer.length - u.length;
    if (write) q.answer = u;
  }
}

console.log(`扫描 ${coze.length} 题`);
if (invalid.length) {
  console.log(`\n⚠️ 发现 ${invalid.length} 处非法 answer 值（未处理，需人工）:`);
  for (const v of invalid) console.log(`  ${v.id}: answer 含 ${v.val}（options 仅 ${v.optN} 项）`);
}
console.log(`\nanswer 含重复索引: ${dedupN} 题，共冗余 ${removedN} 个索引`);
if (write) {
  writeFileSync(cozePath, JSON.stringify(coze, null, 2) + '\n', 'utf-8');
  console.log(`✓ 已写回 ${cozePath}（去重后）`);
} else {
  console.log('（dry-run，加 --write 实际写回）');
}
