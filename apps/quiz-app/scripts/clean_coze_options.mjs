/**
 * clean_coze_options.mjs — 清洗 COZE 题库里混进 options 的脏数据
 *
 * 脏数据来源：docs/coze-exam/coze-questions.json 是 coze 导出产物，导出时
 * 把两类文本误塞进了 options 数组：
 *   类A（解析泄漏）：答案解析口吻，如 "B、C准确描述了…正确答案是A、B、C"（多为 F 项）
 *   类B（元选项）：引用其他选项字母的复合判断，如 "A、B、C都正确"（多为 E 项）
 * 这些项是 coze 导出 bug 产物，不是真实考点选项，留着会让学生刷到无意义的
 * "选 E" 干扰，部分元选项（COZE-0206/0213）还混进了 answer 造成判分矛盾。
 *
 * 清洗规则（精确匹配，避免误伤正常选项）：
 *   - 类A：含 "正确答案是" / "选项X不对" / "准确描述了/区分了/反映了" 等解析口吻
 *   - 类B：以引用字母组合（A、B / A和B / 所有描述都…）开头 + 断言"都X"
 *
 * 删选项后同步修正 answer 索引：删除点之后的索引全部 -1，并在答案里的删点直接移除。
 *
 * 用法：
 *   node quiz-app/scripts/clean_coze_options.mjs          # dry-run（默认，只打印不写）
 *   node quiz-app/scripts/clean_coze_options.mjs --write   # 实际写回源文件
 *
 * 幂等：重复运行安全，已删的选项不会再匹配，dry-run 会显示 "已干净"。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cozePath = join(__dirname, '..', '..', 'docs', 'coze-exam', 'coze-questions.json');
const write = process.argv.includes('--write');

// 类A：解析泄漏口吻（确凿脏数据）—— 必须整句是解析结构，避免误伤正常选项
// 真正的泄漏项都是 "B、C准确描述了…正确答案是A、B、C" 这种解析长句，
// 而非单独的 "准确描述了"（COZE-0121 A="符合，准确描述了数据管理的核心活动" 是正常选项）。
// 用强信号 "正确答案是" 作为主锚点，辅以解析长句特征。
const leakPat = /正确答案是|选项[A-Z]不对|选项[A-Z]过于|选项[A-Z]混淆|分别准确定义/;

// 类B：纯复合元选项 —— 引用其他选项字母 + 断言"都X"
function isMetaLeak(s) {
  const t = String(s).trim();
  // 命中1：引用字母组合开头 + 都X 断言
  if (/^(A[、和与及][BCD]|B[、和与及][CD]|A、B、[CD]|A、C、D|A、B、C、D)/.test(t)
      && /都(正确|符合|准确|规范|合理|是|体现|属于|需要|必须|是好的|是.*因子|是.*价值|是.*表述|恰当)/.test(t)) return true;
  // 命中2：所有(描述|分类|选项|要素)都X
  if (/^所有(描述|分类|选项|要素)都(正确|符合|准确|规范|合理|体现|定义|恰当)/.test(t)) return true;
  return false;
}

function isDirty(s) {
  return leakPat.test(String(s)) || isMetaLeak(s);
}

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));
let totalRemoved = 0;
let answerFixed = 0;
const report = [];

for (const q of coze) {
  const dirtyIdx = [];
  q.options.forEach((o, i) => {
    if (isDirty(o)) dirtyIdx.push(i);
  });
  if (dirtyIdx.length === 0) continue;

  // 记录待删项（用于报告）
  dirtyIdx.forEach(i => {
    report.push({
      id: q.id,
      opt: String.fromCharCode(65 + i),
      inAns: q.answer.includes(i),
      txt: String(q.options[i]).slice(0, 50),
    });
  });

  if (write) {
    // 记录是否需要修 answer
    const wasInAns = dirtyIdx.some(i => q.answer.includes(i));
    // 重算 answer：删掉脏索引，对之后的索引 -1
    const dirtySet = new Set(dirtyIdx);
    const newAns = q.answer
      .filter(i => !dirtySet.has(i))
      .map(i => {
        // i 后面有几个脏点，索引就减几
        const shift = dirtyIdx.filter(d => d < i).length;
        return i - shift;
      });
    if (wasInAns) answerFixed++;
    q.answer = newAns;
    // 删 options（从后往前删，避免索引错乱）
    [...dirtyIdx].reverse().forEach(i => q.options.splice(i, 1));
  }
  totalRemoved += dirtyIdx.length;
}

const inAnsN = report.filter(r => r.inAns).length;
console.log(`扫描 ${coze.length} 题`);
console.log(`命中脏数据：${report.length} 项（分布在 ${new Set(report.map(r => r.id)).size} 题）`);
console.log(`  其中在 answer 里需同步修正：${inAnsN} 项`);

if (report.length === 0) {
  console.log('✓ 已干净，无需处理');
} else if (write) {
  writeFileSync(cozePath, JSON.stringify(coze, null, 2) + '\n', 'utf-8');
  console.log(`✓ 已写回 ${cozePath}`);
  console.log(`  删除选项 ${totalRemoved} 个，修正 answer 的题 ${answerFixed} 道`);
} else {
  console.log('\n（dry-run，加 --write 实际写回）');
  console.log('\n待删清单:');
  for (const r of report) {
    console.log(`  ${r.id} ${r.opt}${r.inAns ? '[答案]' : ''} | ${r.txt}`);
  }
}
