/**
 * fix_coze_answers.mjs — 多选题答案/题干脏数据的人工审计修正
 *
 * 来源：325 道多选题逐题审计后发现的"确凿问题"（机械可判的逻辑矛盾/维度冲突/脏数据）。
 * 与 clean_coze_options.mjs 区别：那个做纯结构清洗（正则可识别的解析泄漏/元选项），
 * 本脚本记录需要"内容判断"的人工修正，每条改动附原因，可追溯、可回退（git）。
 *
 * 三类修正：
 *   A. 答案移除错误项（11 道）：答案选了与题干维度冲突/与同题其他项互斥的选项
 *   B. 题干脏数据（3 道）：COZE-0860/0861/0862 题干含"（基于文档3…）"出处标签
 *   C. 漏网元选项（1 道）：COZE-0199 E="A和B属于组织方面"（上轮清洗正则未覆盖"属于方面"）
 *
 * 用法：
 *   node quiz-app/scripts/fix_coze_answers.mjs          # dry-run
 *   node quiz-app/scripts/fix_coze_answers.mjs --write   # 实际写回
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cozePath = join(__dirname, '..', '..', 'docs', 'coze-exam', 'coze-questions.json');
const write = process.argv.includes('--write');

/**
 * 修正清单。每条：id + 要从 answer 移除的选项序号(0-based) + 原因。
 * 部分题还需删选项（metaIdx）或改题干（newQuestion）。
 */
const FIXES = [
  // —— A. 答案移除错误项（idx 为 coze options 数组的 0-based 索引）——
  { id: 'COZE-0196', dropAns: [4], reason: 'E"员工名字"不是业务处理场景因子' },
  { id: 'COZE-0199', dropAns: [3], dropOpts: [4], reason: 'D"实施新IT系统"属技术方面非组织方面；E"A和B属于组织方面"是漏网元选项' },
  { id: 'COZE-0200', dropAns: [1], reason: 'B"订单处理过程"是名词短语非动名词结构' },
  { id: 'COZE-0201', dropAns: [1], reason: 'B"完全相同实现方式"与A"不同实现方式"互斥，违反二维流程架构差异化原则' },
  { id: 'COZE-0204', dropAns: [3], reason: 'D"完全独立不能有任何依赖"与组件可组装可复用原则矛盾' },
  { id: 'COZE-0205', dropAns: [2], reason: 'C"客户满意度提升"是定性价值，题干问定量' },
  { id: 'COZE-0213', dropAns: [2], reason: 'C"Owner可以是执行人员"与A"Owner是掌控战略的高层"矛盾' },
  { id: 'COZE-0218', dropAns: [2], reason: 'C"不能与其他组件有任何关系"与可复用性原则矛盾' },
  { id: 'COZE-0221', dropAns: [1], reason: 'B"客户满意度显著提升"是定性价值，题干问定量非定性' },
  { id: 'COZE-0279', dropAns: [3, 4], reason: 'D"成本降低"E"部门协作效率"不属"稳"(风险)维度' },
  { id: 'COZE-0281', dropAns: [3], reason: 'D"允许没有具体数值"与C"必须有具体数值"互斥；C符合指标池规范' },

  // —— B. 题干脏数据：清出处标签 ——
  { id: 'COZE-0860', stripQuestion: '（基于文档3知识回顾）', reason: '题干含导出处标签，coze导出残留' },
  { id: 'COZE-0861', stripQuestion: '（基于文档3知识回顾）', reason: '同上' },
  { id: 'COZE-0862', stripQuestion: '（基于文档3概要）', reason: '同上' },
  { id: 'COZE-0515', stripQuestion: '（基于入湖标准）', reason: '题干含导出处标签，coze导出残留' },
  { id: 'COZE-0859', stripQuestion: '（基于文档3知识回顾）', reason: '同上' },
];

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));
const byId = new Map(coze.map(q => [q.id, q]));
const log = [];

for (const fix of FIXES) {
  const q = byId.get(fix.id);
  if (!q) { log.push(`✗ ${fix.id} 未找到，跳过`); continue; }

  const before = { ans: [...q.answer], qLen: q.question.length, optN: q.options.length };

  // B. 题干清洗
  if (fix.stripQuestion) {
    q.question = q.question.replace(fix.stripQuestion, '').trim();
  }

  // 约定：FIXES 里 dropAns/dropOpts 都用"原始 options 数组"的 0-based 索引。
  // 必须先移除答案项（用原索引 filter），再删选项（splice 后调整 answer 索引），
  // 否则删选项会导致 answer 里指向后续位置的索引错位。
  if (fix.dropAns) {
    const dropSet = new Set(fix.dropAns);
    q.answer = q.answer.filter(i => !dropSet.has(i));
  }

  if (fix.dropOpts && fix.dropOpts.length) {
    const sortedDesc = [...fix.dropOpts].sort((a, b) => b - a);
    for (const i of sortedDesc) {
      q.options.splice(i, 1);
      // answer 中 >i 的索引全部 -1
      q.answer = q.answer.map(idx => (idx > i ? idx - 1 : idx));
    }
  }

  log.push({
    id: fix.id,
    reason: fix.reason,
    beforeAns: before.ans,
    afterAns: [...q.answer],
    beforeOptN: before.optN,
    afterOptN: q.options.length,
    questionChanged: before.qLen !== q.question.length,
  });
}

console.log(`处理 ${FIXES.length} 条修正`);
for (const entry of log) {
  if (typeof entry === 'string') { console.log(entry); continue; }
  const ansChg = JSON.stringify(entry.beforeAns) !== JSON.stringify(entry.afterAns);
  const optChg = entry.beforeOptN !== entry.afterOptN;
  const flag = (ansChg || entry.questionChanged || optChg) ? '' : ' [无变化]';
  console.log(`${entry.id}${flag} | ${entry.reason}`);
  if (ansChg) console.log(`    答案: ${JSON.stringify(entry.beforeAns)} → ${JSON.stringify(entry.afterAns)}`);
  if (entry.questionChanged) console.log(`    题干: 清除出处标签`);
  if (optChg) console.log(`    选项: ${entry.beforeOptN} → ${entry.afterOptN}（删 ${entry.beforeOptN - entry.afterOptN} 个）`);
}

if (write) {
  writeFileSync(cozePath, JSON.stringify(coze, null, 2) + '\n', 'utf-8');
  console.log(`\n✓ 已写回 ${cozePath}`);
} else {
  console.log('\n（dry-run，加 --write 实际写回）');
}
