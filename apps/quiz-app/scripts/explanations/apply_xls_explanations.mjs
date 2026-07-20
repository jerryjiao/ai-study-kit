/**
 * 把解析注入到 quiz-app/scripts/_xls_questions.json（C- 题源料）。
 * 与 apply_explanations.mjs 类似，但目标是 _xls_questions.json，字段名是 analysis。
 *
 * 规则：只填空 analysis（已有非空不覆盖），找不到 id 警告。
 * 应用后需重跑 merge.mjs（_xls_questions.json → src/data/questions.json）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..', '..');
const xlsPath = join(root, 'quiz-app', 'scripts', '_xls_questions.json');

const patchFile = process.argv[2];
if (!patchFile) {
  console.error('用法: apply_xls_explanations.mjs <patch.json>');
  process.exit(1);
}

const patch = JSON.parse(readFileSync(patchFile, 'utf-8'));
console.log(`加载 ${Object.keys(patch).length} 条解析`);

const xls = JSON.parse(readFileSync(xlsPath, 'utf-8'));
const byId = new Map(xls.map((q) => [q.id, q]));

let applied = 0, skippedHas = 0, notFound = 0;
for (const [id, exp] of Object.entries(patch)) {
  const q = byId.get(id);
  if (!q) { notFound++; console.warn(`⚠️ 找不到题 ${id}`); continue; }
  if (q.analysis && q.analysis.trim()) { skippedHas++; continue; }
  q.analysis = exp.trim();
  applied++;
}

writeFileSync(xlsPath, JSON.stringify(xls, null, 2), 'utf-8');
console.log(`应用 ${applied} 条，跳过(已有解析) ${skippedHas} 条，未找到 ${notFound} 条`);
console.log(`已写回 ${xlsPath}`);
