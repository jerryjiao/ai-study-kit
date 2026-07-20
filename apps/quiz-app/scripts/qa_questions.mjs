/**
 * 题库质量校验脚本（出题后必跑，防"最长即答案"等系统性质量缺陷重犯）。
 *
 * 起因：2026-07-17 发现旧 50 道 T- 题里 64% 正确答案是最长选项（系统性偷懒），
 * 重出软测题后必须用此脚本把关。脚本可保留供后续所有出题复用。
 *
 * 用法：
 *   node scripts/qa_questions.mjs              # 默认扫 questions.json 里 topic==='测试'
 *   node scripts/qa_questions.mjs --all        # 扫全量
 *   node scripts/qa_questions.mjs --file scripts/_test_questions.json   # 扫指定源文件
 *
 * 检查项（FAIL 会以非零退出码退出，可在 CI/部署前阻断）：
 *   1. 最长即答案占比（single/multi，排除长度全等题）> 30% → FAIL
 *   2. 答案分布：某选项（A/B/C/D）作正确答案占比 > 40% → FAIL
 *   3. 分类关键词覆盖：题干不含任一 subtopic 关键词 → WARN（会被兜底分类）
 *   4. 选项长度方差：同题选项长度极差过大（正确项长度异常突出）→ WARN
 *   5. 品牌词命中 → FAIL（AGENTS.md 红线）
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const scanAll = args.includes('--all');
const fileIdx = args.indexOf('--file');
const explicitFile = fileIdx >= 0 ? args[fileIdx + 1] : null;

// ── 品牌词（与 AGENTS.md 中性化清单一致）──────────────────
const BRAND_RE = /国家电投|一汽|FAW|红旗|中国一汽|华为|腾讯|阿里巴巴|京东|美团|字节跳动|抖音|拼多多|网易|百度|小米科技|苹果公司|微软|谷歌|亚马逊|特斯拉|比亚迪|蔚来汽车|理想汽车|小鹏汽车|中石化|中石油|国家电网|中国移动|中国电信|中国联通/;

// ── 分类关键词（与 classify.mjs 的 TEST_*_KW 对齐）─────────
const SUBTOPIC_KW = [
  // 用例设计
  '等价类','边界值','判定表','因果图','测试用例','用例设计','预期结果',
  // 测试类型与流程
  '黑盒','白盒','灰盒','回归','冒烟','V模型','单元测试','集成测试','验收测试','UAT',
  '语句覆盖','分支覆盖','路径覆盖','覆盖强度',
  '测试计划','测试策略','测试报告','技术规范','准入准出',
  '需求分析','需求评审',
  // 缺陷
  '缺陷','bug','严重程度','优先级','Severity','Priority','状态流转','生命周期',
  // 工具
  'Jira','Confluence','Xmind','JMeter','LoadRunner','大禹','自动化测试','CI/CD',
  // 安全
  '安全测试','SQL注入','OWASP','接口测试','性能测试',
  // 运维
  'IT运维','事件管理','变更管理','ITIL','DevOps','可观测性',
  // 数据库与SQL
  'SELECT','INSERT','UPDATE','DELETE','JOIN','WHERE','GROUP BY','HAVING',
  '主键','外键','索引','聚合','COUNT','SUM','AVG','ER图','增删改查','数据库',
  // 网络
  'HTTP','HTTPS','状态码','DNS','TCP','UDP','端口','请求','响应','幂等','三次握手','四次挥手',
];

// ── 加载题目 ──────────────────────────────────────────────
let questions;
if (explicitFile) {
  questions = JSON.parse(readFileSync(resolve(root, explicitFile), 'utf-8'));
} else {
  questions = JSON.parse(readFileSync(resolve(root, 'src/data/questions.json'), 'utf-8'));
}
const pool = scanAll ? questions : questions.filter((q) => q.topic === '测试');
console.log(`\n📦 扫描范围：${scanAll ? '全量' : 'topic=测试'}　题数：${pool.length}\n`);

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
  const pass = ratio <= 0.3;
  console.log(`${pass ? '✅' : '❌'} 检查1·最长即答案：${hits.length}/${valid} = ${(ratio * 100).toFixed(0)}%（阈值 ≤30%）${pass ? '' : ' FAIL'}`);
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
  // 只看 A-D（E/F 选项少，统计意义不大）
  const main = ['A', 'B', 'C', 'D'].map((k) => ({ k, n: dist[k], ratio: total ? dist[k] / total : 0 }));
  const over = main.filter((x) => x.ratio > 0.4);
  const pass = over.length === 0;
  console.log(`${pass ? '✅' : '❌'} 检查2·答案分布（共${total}个答案键）：` +
    main.map((x) => `${x.k}=${x.n}(${(x.ratio * 100).toFixed(0)}%)`).join(' ') +
    `（阈值 单项≤40%）${pass ? '' : ' FAIL'}`);
  if (!pass) console.log(`   超限：${over.map((x) => x.k).join(', ')}`);
  return pass;
}

// ── 检查 3：分类关键词覆盖 ────────────────────────────────
function checkSubtopicKw() {
  const misses = [];
  for (const q of pool) {
    const text = (q.question || '') + (q.analysis || '');
    const hit = SUBTOPIC_KW.some((kw) => text.includes(kw));
    if (!hit) misses.push(q.id);
  }
  console.log(`${misses.length === 0 ? '✅' : '⚠️ '} 检查3·分类关键词：${misses.length} 题题干不含任一 subtopic 关键词（会被兜底归到"用例设计方法"）`);
  if (misses.length) console.log(`   缺关键词：${misses.slice(0, 20).join(', ')}${misses.length > 20 ? ' ...' : ''}`);
  return true; // WARN 不阻断
}

// ── 检查 4：选项长度极差 ──────────────────────────────────
function checkOptionLenSpread() {
  const warns = [];
  for (const q of pool) {
    if (!q.options || q.type === 'judge') continue;
    const lens = Object.values(q.options).map((v) => (v || '').length);
    if (lens.length < 2) continue;
    const max = Math.max(...lens);
    const min = Math.min(...lens);
    // 正确答案长度 vs 平均干扰项长度
    const ansKeys = Array.isArray(q.answer) ? q.answer : [q.answer];
    const ansAvg = ansKeys.reduce((s, k) => s + (q.options[k] || '').length, 0) / ansKeys.length;
    const distractorLens = Object.entries(q.options)
      .filter(([k]) => !ansKeys.includes(k))
      .map(([, v]) => (v || '').length);
    const distractorAvg = distractorLens.length ? distractorLens.reduce((s, x) => s + x, 0) / distractorLens.length : 0;
    // 正确答案平均长度比干扰项平均长 2 倍以上 → 可疑（正确项过长突出）
    if (distractorAvg > 0 && ansAvg / distractorAvg > 2) {
      warns.push(`${q.id}(正确${ansAvg.toFixed(0)}字/干扰${distractorAvg.toFixed(0)}字)`);
    }
  }
  console.log(`${warns.length === 0 ? '✅' : '⚠️ '} 检查4·选项长度：${warns.length} 题正确答案明显比干扰项长（>2倍，可疑）`);
  if (warns.length) console.log(`   ${warns.slice(0, 15).join(', ')}${warns.length > 15 ? ' ...' : ''}`);
  return true; // WARN 不阻断
}

// ── 检查 5：品牌词 ────────────────────────────────────────
function checkBrand() {
  const hits = [];
  for (const q of pool) {
    const blob = JSON.stringify(q);
    const m = blob.match(BRAND_RE);
    if (m) hits.push(`${q.id}(${m[0]})`);
  }
  const pass = hits.length === 0;
  console.log(`${pass ? '✅' : '❌'} 检查5·品牌词：${hits.length} 处命中${pass ? '' : ' FAIL（AGENTS.md 红线）'}`);
  if (!pass) console.log(`   ${hits.join(', ')}`);
  return pass;
}

// ── 汇总 ──────────────────────────────────────────────────
console.log('─'.repeat(60));
const results = [
  checkLongestAnswer(),
  checkAnswerDist(),
  checkSubtopicKw(),
  checkOptionLenSpread(),
  checkBrand(),
];
const allPass = results.every(Boolean);
console.log('─'.repeat(60));
console.log(`${allPass ? '🎉 全部硬约束通过' : '❌ 存在 FAIL 项，请修正后重跑'}\n`);
process.exit(allPass ? 0 : 1);
