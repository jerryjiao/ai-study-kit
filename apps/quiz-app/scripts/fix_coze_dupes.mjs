/**
 * fix_coze_dupes.mjs — 删除 coze 题库里的人工核实纯重复题
 *
 * 这些重复是逐题审计后确认的"同考点+选项内容实质相同+答案相同"的纯重复，
 * 题干常只差问法措辞（"是什么"vs"含义是"）、引号样式（弯引号vs直引号）、
 * 或修饰词（"核心组件"vs"治理的核心组件"）。
 *
 * 为什么不用 merge 自动去重：merge 的指纹去重只抓前15字完全相同的；
 * 归一化去重试过会误伤（"哪一范式"vs"必须满足的范式"答案都是第三范式但考点不同）。
 * 所以这类措辞变体重复由本脚本按人工核实清单从源删除，最安全准确。
 *
 * 每组保留 id 最小者。删除后重跑 build_coze + merge 即可生效。
 *
 * 用法：
 *   node quiz-app/scripts/fix_coze_dupes.mjs          # dry-run
 *   node quiz-app/scripts/fix_coze_dupes.mjs --write   # 实际写回
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cozePath = join(__dirname, '..', '..', 'docs', 'coze-exam', 'coze-questions.json');
const write = process.argv.includes('--write');

// 待删题 ID 清单（每道均经逐题审计确认是纯重复，保留同组 id 更小者）
// 来源：D4 全量逐题审（17组）+ 全库同题型同答案内容聚类（22组，去重后合并）
const TO_DELETE = [
  // —— single 题 ——
  'COZE-0292', 'COZE-0930', 'COZE-0501', 'COZE-0967', 'COZE-0524', 'COZE-0970',
  'COZE-0528', 'COZE-0968', 'COZE-0957', 'COZE-0572', 'COZE-0602', 'COZE-0963',
  'COZE-0964', 'COZE-0710', 'COZE-0605', 'COZE-0973', 'COZE-0974',
  // —— multi 题 ——
  'COZE-0764', 'COZE-0966', 'COZE-0777', 'COZE-0767', 'COZE-0778', 'COZE-0779',
  'COZE-0775', 'COZE-0781', 'COZE-0971', 'COZE-0771', 'COZE-0790', 'COZE-0791',
  'COZE-0792', 'COZE-0793', 'COZE-0794', 'COZE-0795', 'COZE-0796', 'COZE-0797',
  'COZE-0798', 'COZE-0799', 'COZE-0800', 'COZE-0801', 'COZE-0802', 'COZE-0803',
  'COZE-0804', 'COZE-0805', 'COZE-0806',
];

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));
const before = coze.length;
const delSet = new Set(TO_DELETE);
const missing = TO_DELETE.filter((id) => !coze.some((q) => q.id === id));
const removed = coze.filter((q) => delSet.has(q.id));

console.log(`待删 ${TO_DELETE.length} 道`);
console.log(`源中找不到的（可能已删）: ${missing.length} ${missing.length ? missing.join(',') : ''}`);
console.log(`实际将删除: ${removed.length}`);

if (write) {
  const filtered = coze.filter((q) => !delSet.has(q.id));
  writeFileSync(cozePath, JSON.stringify(filtered, null, 2) + '\n', 'utf-8');
  console.log(`✓ 已写回 ${cozePath}`);
  console.log(`  题数 ${before} → ${filtered.length}（-${before - filtered.length}）`);
} else {
  console.log('\n（dry-run，加 --write 实际写回）');
  // 列出删除的题（抽样）
  console.log('\n删除清单（按 id 排序）:');
  for (const q of removed.sort((a, b) => a.id.localeCompare(b.id))) {
    console.log(`  ${q.id} [${q.type}] ${q.question.slice(0, 50)}`);
  }
}
