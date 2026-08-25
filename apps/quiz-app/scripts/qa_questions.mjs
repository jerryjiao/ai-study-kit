/**
 * 题库质量校验脚本——出题后必跑，防"最长即答案"等系统性质量缺陷。
 *
 * 检查项（FAIL 会以非零退出码退出，可在 CI/部署前阻断）：
 *   1. 最长即答案占比（single/multi，排除长度全等题）> 30% → FAIL
 *   2. 答案分布：某选项（A/B/C/D）作正确答案占比 > 40% → FAIL
 *   3. 选项长度方差：同题选项长度极差过大（正确项长度异常突出）→ WARN
 *
 * 品牌词扫描由仓库根的 `scripts/brand-scan.py` 负责（更强、可配置），
 * 本脚本不重复——出题后建议两脚本都跑。
 *
 * 用法：
 *   node apps/quiz-app/scripts/qa_questions.mjs                      # 扫 src/data/questions.json
 *   node apps/quiz-app/scripts/qa_questions.mjs --file path/to.json  # 扫指定文件
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const fileIdx = args.indexOf('--file');
const explicitFile = fileIdx >= 0 ? args[fileIdx + 1] : null;
// 检查1 阈值（最长即答案占比上限）。默认 0.3 针对 AI 出题纪律（选项等长防线索泄露）；
// 真题库的正确项长度由命题组决定，是客观分布而非纪律缺陷，可用 --max-longest 0.5 放宽。
const mlIdx = args.indexOf('--max-longest');
const MAX_LONGEST_RATIO = mlIdx >= 0 ? parseFloat(args[mlIdx + 1]) : 0.3;

// ── 加载题目 ──────────────────────────────────────────────
const file = explicitFile ?? 'src/data/questions.json';
const pool = JSON.parse(readFileSync(resolve(root, file), 'utf-8'));
console.log(`\n📦 扫描文件：${file}　题数：${pool.length}\n`);

// ── 检查 1：最长即答案 ────────────────────────────────────
function checkLongestAnswer() {
  const hits = [];
  let valid = 0;
  for (const q of pool) {
    if (!q.options || q.type === 'judge') continue;
    const entries = Object.entries(q.options).map(([k, v]) => ({ k, len: (v || '').length }));
    if (entries.length < 2) continue;
    const max = Math.max(...entries.map((e) => e.len));
    const min = Math.min(...entries.map((e) => e.len));
    if (max === min) continue; // 长度全等，无信号
    valid++;
    const ansKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
    const allLongest = ansKeys.every((ak) => entries.find((e) => e.k === ak)?.len === max);
    if (allLongest) hits.push(q.id);
  }
  const ratio = valid ? hits.length / valid : 0;
  const pass = ratio <= MAX_LONGEST_RATIO;
  console.log(`${pass ? '✅' : '❌'} 检查1·最长即答案：${hits.length}/${valid} = ${(ratio * 100).toFixed(0)}%（阈值 ≤${(MAX_LONGEST_RATIO * 100).toFixed(0)}%）${pass ? '' : ' FAIL'}`);
  if (!pass && hits.length <= 30) console.log(`   命中：${hits.join(', ')}`);
  return pass;
}

// ── 检查 2：答案分布 ──────────────────────────────────────
function checkAnswerDist() {
  const dist = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
  let total = 0;
  for (const q of pool) {
    if (!q.options || q.type === 'judge') continue;
    const ansKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
    for (const k of ansKeys) {
      if (dist[k] !== undefined) { dist[k]++; total++; }
    }
  }
  const main = ['A', 'B', 'C', 'D'].map((k) => ({ k, n: dist[k], ratio: total ? dist[k] / total : 0 }));
  const over = main.filter((x) => x.ratio > 0.4);
  const pass = over.length === 0;
  console.log(`${pass ? '✅' : '❌'} 检查2·答案分布（共${total}个答案键）：` +
    main.map((x) => `${x.k}=${x.n}(${(x.ratio * 100).toFixed(0)}%)`).join(' ') +
    `（阈值 单项≤40%）${pass ? '' : ' FAIL'}`);
  if (!pass) console.log(`   超限：${over.map((x) => x.k).join(', ')}`);
  return pass;
}

// ── 检查 3：选项长度极差 ──────────────────────────────────
function checkOptionLenSpread() {
  const warns = [];
  for (const q of pool) {
    if (!q.options || q.type === 'judge') continue;
    const lens = Object.values(q.options).map((v) => (v || '').length);
    if (lens.length < 2) continue;
    const ansKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
    const ansAvg = ansKeys.reduce((s, k) => s + (q.options[k] || '').length, 0) / ansKeys.length;
    const distractorLens = Object.entries(q.options)
      .filter(([k]) => !ansKeys.includes(k))
      .map(([, v]) => (v || '').length);
    const distractorAvg = distractorLens.length ? distractorLens.reduce((s, x) => s + x, 0) / distractorLens.length : 0;
    if (distractorAvg > 0 && ansAvg / distractorAvg > 2) {
      warns.push(`${q.id}(正确${ansAvg.toFixed(0)}字/干扰${distractorAvg.toFixed(0)}字)`);
    }
  }
  console.log(`${warns.length === 0 ? '✅' : '⚠️ '} 检查3·选项长度：${warns.length} 题正确答案明显比干扰项长（>2倍，可疑）`);
  if (warns.length) console.log(`   ${warns.slice(0, 15).join(', ')}${warns.length > 15 ? ' ...' : ''}`);
  return true;
}

// ── 汇总 ──────────────────────────────────────────────────
console.log('─'.repeat(60));
const results = [
  checkLongestAnswer(),
  checkAnswerDist(),
  checkOptionLenSpread(),
];
const allPass = results.every(Boolean);
console.log('─'.repeat(60));
console.log(`${allPass ? '🎉 全部硬约束通过' : '❌ 存在 FAIL 项，请修正后重跑'}\n`);
console.log('💡 提示：品牌词扫描请另外跑 `python3 scripts/brand-scan.py`（在仓库根）。');
process.exit(allPass ? 0 : 1);
