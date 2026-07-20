/**
 * 把人工补写的解析（patch JSON，按 id → explanation）幂等注入到 docs/coze-exam/coze-questions.json。
 *
 * 用法：
 *   node quiz-app/scripts/explanations/apply_explanations.mjs <patch.json> [patch2.json ...]
 *
 * patch JSON 格式：{ "<题id>": "<解析文本>", ... }
 *
 * 规则：
 *   - 只填空：若源题已有非空 explanation，跳过（不覆盖人工已有解析），打印警告。
 *   - 找不到题 id：打印警告，不报错。
 *   - 应用后，会原地重写 coze-questions.json（保持 2-space 缩进）。
 *
 * 补完解析后，下一步：
 *   node quiz-app/scripts/build_coze.mjs   # 重建 _ba_questions.json（analysis 字段透传）
 *   node quiz-app/scripts/merge.mjs        # 合并到 src/data/questions.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..', '..');
const cozePath = join(root, 'docs', 'coze-exam', 'coze-questions.json');

const patchFiles = process.argv.slice(2);
if (patchFiles.length === 0) {
  console.error('用法: apply_explanations.mjs <patch.json> [patch2.json ...]');
  process.exit(1);
}

// 合并所有 patch（后者不覆盖前者已应用的 id，仅记录冲突）
const patch = {};
for (const pf of patchFiles) {
  const p = JSON.parse(readFileSync(pf, 'utf-8'));
  for (const [id, exp] of Object.entries(p)) {
    if (typeof exp !== 'string' || !exp.trim()) {
      console.warn(`⚠️ ${pf}: id=${id} 解析为空，跳过`);
      continue;
    }
    if (patch[id] && patch[id] !== exp) {
      console.warn(`⚠️ id=${id} 在多个 patch 中冲突，保留首个`);
      continue;
    }
    patch[id] = exp.trim();
  }
}
console.log(`加载 ${Object.keys(patch).length} 条解析`);

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));
const byId = new Map(coze.map((q) => [q.id, q]));

let applied = 0, skippedHas = 0, notFound = 0;
for (const [id, exp] of Object.entries(patch)) {
  const q = byId.get(id);
  if (!q) { notFound++; console.warn(`⚠️ 找不到题 ${id}`); continue; }
  if (q.explanation && q.explanation.trim()) { skippedHas++; continue; }
  q.explanation = exp;
  applied++;
}

writeFileSync(cozePath, JSON.stringify(coze, null, 2), 'utf-8');
console.log(`应用 ${applied} 条，跳过(已有解析) ${skippedHas} 条，未找到 ${notFound} 条`);
console.log(`已写回 ${cozePath}`);
