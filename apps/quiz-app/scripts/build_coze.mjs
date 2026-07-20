/**
 * 把 docs/coze-exam/coze-questions.json (1008题) 转成答题站格式，写入 _ba_questions.json
 *
 * ⭐ 2026-07-06 重构（以能力矩阵为纲）：
 *   对照 岗位/附件3-角色岗位能力矩阵.md（BA岗§2.9 + 软质岗§2.1）逐题核对，删除超纲内容：
 *     1. 整 module 删：应用架构(112) / 产品设计(75) / 项目管理(13) —— 两岗都不含
 *     2. 题内过滤超纲考点：IA 设计/治理实操(277) + 指标数仓/BI(59) + BA 半加器/TAM/ADM详解(49)
 *   超纲判定用 isMatrixCompliant() 关键词规则（对应逐题核对报告的考点分组）。
 *   删超纲后 ~423 题，merge 时再并入 _test_questions.json (30题) → 共 ~453 题。
 *
 * 进度安全：进度按题 id 存，统计以 questions.json 反查 answers，
 *   删题产生的孤儿进度记录被自然忽略，不崩溃不污染正确率（已核实 progress.ts）。
 *
 * module → topic 映射 + day 重排（2026-07-06，对齐 4 天冲刺日程 D7-D10）：
 *   业务架构   → 业务架构, D2/D3（0001/0002 课，已学完）
 *   信息架构   → 信息架构, D4/D5（IA 认知课 0003，已学完，删超纲后只 71 合规题）
 *   指标架构   → 指标架构, D7（重写后的 0005 指标基础课 + 0010 价值图课）
 *   数智化转型 → 业务架构, D9（配 0009 业务演进课）
 *   数据治理   → 信息架构, D5（IA 延伸）
 *   技术架构   → 云原生/AI, D9（CN+AI+安全 汇总到 D9 技术日；运维已并入测试）
 *   运维/安全  → 测试, D9（运维管理题并入测试大类，subtopic=测试·运维管理）
 *   应用架构/产品设计/项目管理 → 整体删除（不在 moduleMap，不进产物）
 *
 * 题型：coze single/multi/judge → single/multi/judge（判断题选项 正确/错误 转 2 选项 single）
 * ID：保留 COZE-NNNN 不变（全局唯一稳定）。
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cozePath = join(__dirname, '..', '..', 'docs', 'coze-exam', 'coze-questions.json');
const outPath = join(__dirname, '_ba_questions.json');

const coze = JSON.parse(readFileSync(cozePath, 'utf-8'));

// module → { topic, day }；删了应用架构/产品设计/项目管理（两岗都不含）
const moduleMap = {
  '业务架构': { topic: '业务架构', day: 'D2' },      // 0001/0002 课，classifyBADay 拆 D2/D3
  '信息架构': { topic: '信息架构', day: 'D4' },      // 0003 IA 认知课，classifyIADay 拆 D4/D5
  '指标架构': { topic: '指标架构', day: 'D7' },      // 重写后的 0005 指标基础课
  '数智化转型': { topic: '业务架构', day: 'D9' },    // 配 0009 业务演进课
  '数据治理': { topic: '信息架构', day: 'D5' },      // IA 延伸
  '技术架构': { topic: '云原生', day: 'D9' },        // 默认云原生，AI 命题下方覆盖；D9 汇总
  '运维管理': { topic: '测试', day: 'D9' },        // 运维题并入测试大类，subtopic=测试·运维管理
  '安全架构': { topic: '网络安全', day: 'D-SEC' },   // 网络安全管理岗（矩阵§2.7.1），12题，配 S4 课
};

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

// 多选题"以上全对"型冗余末选项（语义=前面都对）：剔除后等价于把前面选项全选，
// 留着只会让人无脑全选或因没选它判错。匹配中文"所有/以上/全部…都…"句式。
const ALL_OF_ABOVE_RE = /^(所有(选项|步骤|阶段|类型|要素|方面|内容|维度)?(都)?(是|应该|应|必须|都应|都包含|都属|都是)|以上(都|选项|全部|都正确|都对)|全部(选项|都|都是))/;

// ─────────────────────────────────────────────────────────────
// ⭐ 能力矩阵合规过滤（2026-07-06 新增）
// 判定依据：岗位/附件3-角色岗位能力矩阵.md 逐题核对报告
//   - BA §2.9 T5：流程设计/演进规划/指标设计（认知+操作层）；TOGAF/IA/CN/AI T5空(T6+)
//   - 软质 §2.1 T3：IA/BA/CN/AI 认知+使用；测试理论(自造35题)+运维管理(并入测试)
// 超纲 = 数据管理工程师(§2.5)/业务架构师(T6+)/训练营方法论深水区 的内容
// ─────────────────────────────────────────────────────────────

// IA 超纲考点（数据管理工程师深度，矩阵 IA 设计力只要认知+使用数据工作台）
const IA_OOS_KEYWORDS = [
  // 三范式/逻辑实体设计
  '三范式', '范式', '逻辑数据实体', '逻辑数据模型', '逻辑模型', '主标识符', '外键',
  'ER图', '关系实体', 'M:N', '多对多', '衍生属性', '拆实体', '关系实现',
  // 数据分类 6 类详解
  '基础数据', '主数据', '事务数据', '观测数据', '规则数据', '报告数据', '数据分类',
  // 入湖评价 + 数据湖分层
  '入湖', '数据湖', 'ODS', 'DWD', 'DWS', 'ADS', 'DWI', 'DWR',
  // 数据源认证实操
  '数据源认证', '探源', '数据源4', '首次正式发布',
  // 元数据注册实操
  '元数据注册', '三类元数据', '业务元数据', '技术元数据', '管理元数据',
  // 数据质量 6 维度治理
  '数据质量', '质量管理', '完整性', '准确性', '及时性', '唯一性', '有效性', '一致性',
  // 概念/主题域/业务对象 设计方法
  '概念模型设计', '主题域分组设计', '主题域设计', '命名规则', '字数限制',
  '业务对象识别', '5步法', '4原则', '完整性合理性', 'Crow',
  // 数据标准落地
  '数据标准落地', '三视角', '业务视角', '技术视角', '管理视角', '落标',
  // 六阶十八步实操
  '六阶', '十八步', '第一阶段', '第二阶段', '第三阶段', '第四阶段', '第五阶段', '第六阶段',
  '信息架构构建', '元数据注册阶段', '入湖评价阶段', '数据整合阶段',
  // 物理模型
  '物理模型', '物理设计',
  // 指标数据治理五阶十六步（根本不属于 IA，是独立主题）
  '五阶十六步', '指标数据治理', '指标字典', '指标卡片', '探源认证', '模型服务',
  // 数据治理体系/DCMM（数据管理工程师深度）
  'DCMM', '数据治理体系', '成熟度', '数据基本法', 'Owner机制', '治理主体',
];

// 指标超纲考点（数据工程/BI 工程师深度，矩阵指标设计 T5 只要基础认知+价值图）
const METRICS_OOS_KEYWORDS = [
  // 数仓分层
  '数据仓库', '数仓', 'OLTP', 'OLAP', 'ETL', 'Bill Inmon', 'Inmon',
  // 维度建模
  '维度建模', 'Kimball', '代理键', 'SCD', '缓慢变化维', '星型', '雪花',
  '事实表', '维度表', '粒度声明',
  // 数据血缘
  '数据血缘', '血缘',
  // BI 四场景/可视化
  'BI应用', 'BI 四场景', 'MBI', 'EDA', '探索型', '管理型', '驾驶舱', '大屏',
  '看板', '热力图', '日历热图', '箱线图', '折线图', '柱状图', '分向条形图',
  '可视化', '图表选择', '数据孤岛',
  // 治理实操（数据源认证/探源/质量监控/对数/开发流程/API交付）
  '探源认证', '数据源认证', '质量监控', '对数', '对数五步', '数据开发流程',
  'API 服务', 'API服务', '资产消费', '资产目录1日', '重复开发',
  // 数据中台
  '数据中台', 'Dataphin', '数据工作台定位', '零代码', '数据服务化', '中台开发',
];

// BA 超纲考点（T6+ 业务架构师深度 / 训练营专属方法论，T5 未提）
const BA_OOS_KEYWORDS = [
  // 半加器/全加器（训练营借集成电路类比，矩阵零提及）
  '半加器', '全加器', '握手点',
  // TAM/Value Book/变革生命周期（变革管理工具，T5 只要"协助收集信息"）
  'TAM', 'Value Book', '价值书', 'CDCP', 'PDCP', 'DRR', 'COR',
  '变革6阶段', '变革六阶段', '变革生命周期', '概念阶段', '计划阶段',
  // 12 种武器（价值管理方法论，矩阵未提）
  '12种武器', '十二种武器', '武器盘点',
  // Y 模型深水（设计方法论，T5 没指名）
  'Y模型五步', 'Y模型：',
];

// 训练营离岗内容（行政办公/HCM，commit 449e52f 已删源题，这里是兜底）
const OFFTOPIC_SOURCES = ['破冰培训01-行政办公', '破冰培训02-HCM'];

/**
 * 判定一道题是否符合能力矩阵（BA T5 + 软质 T3 两岗交集）
 * @returns {boolean} true=合规保留, false=超纲删除
 */
function isMatrixCompliant(q) {
  const blob = JSON.stringify(q).replace(/\s+/g, '');
  const module = q.module;
  const source = q.source || '';

  // 离岗内容（行政/HCM）直接删
  for (const s of OFFTOPIC_SOURCES) {
    if (source.includes(s)) return false;
  }

  // 整 module 已从 moduleMap 删（应用架构/产品设计/项目管理）→ convert 阶段根本不会进来
  // 这里仅做 module 内的考点过滤
  // ⭐ BA（业务架构/数智化转型）按用户要求不过滤——课不动，题也全留（半加器/TAM/12武器等虽超纲但保留）
  if (module === '信息架构' || module === '数据治理') {
    return !IA_OOS_KEYWORDS.some((kw) => blob.includes(kw.replace(/\s+/g, '')));
  }
  if (module === '指标架构') {
    return !METRICS_OOS_KEYWORDS.some((kw) => blob.includes(kw.replace(/\s+/g, '')));
  }
  // 业务架构/数智化转型/技术架构/运维/安全 全留
  return true;
}

// ─────────────────────────────────────────────────────────────
// day 分类（保留原逻辑，BA/IA 按内容拆天）
// ─────────────────────────────────────────────────────────────

// BA 按内容拆 D2(0001课) / D3(0002课)
const D3_KW = ['TOGAF','ADM','灯塔','价值流','变革','二维流程','黏合剂','价值管理','业务场景','场景因子','价值主张','利益相关者','价值度量','旅程','北极星'];
const D2_KW = ['Y模型','Y 模型','4A','5A','业务能力','业务组件','业务活动','解耦','高内聚','灵魂','能力类','能力组','EAMAP','结构化','抽象表达','业务架构是将','孤点','环点','业务单元','流程分解','业务模块','业务领域','架构治理','企业战略'];

function classifyBADay(q) {
  const blob = JSON.stringify(q);
  let h3 = 0, h2 = 0;
  for (const kw of D3_KW) h3 += blob.split(kw).length - 1;
  for (const kw of D2_KW) h2 += blob.split(kw).length - 1;
  if (h3 > h2) return 'D3';
  return 'D2';
}

// IA 按内容拆 D4(认知上半) / D5(认知下半)
// 注意：删超纲后 IA 只剩 71 题，主要落在 D4（组件/层级/IP原则认知）
const IA_D5_STRONG = ['数据分布', '信息链', 'CRUD', '数据源', '数据标准', 'IP4', 'IP5'];
function classifyIADay(q) {
  const blob = JSON.stringify(q).replace(/\s+/g, '');
  for (const kw of IA_D5_STRONG) {
    if (blob.includes(kw.replace(/\s+/g, ''))) return 'D5';
  }
  return 'D4';
}

// ─────────────────────────────────────────────────────────────
// subtopic 细分（2026-07-07 新增）：把 BA/IA/指标 三大类按考点拆细
//   分类器（classifyBASubtopic 等）已抽到 classify.mjs，供 build_coze.mjs 与
//   merge.mjs 共用——merge.mjs 需要给 0417题库/岗位矩阵T4补题（非 coze 源）补 subtopic。
//   详见 classify.mjs 头部注释。
import { classifyBASubtopic, classifyIASubtopic, classifyMetSubtopic, classifyTestSubtopic } from './classify.mjs';

function convert(q) {
  // ⭐ 能力矩阵过滤：超纲题不进产物
  if (!isMatrixCompliant(q)) return null;

  const mm = moduleMap[q.module];
  // 不在 moduleMap 的 module（应用架构/产品设计/项目管理）直接丢弃
  if (!mm) return null;

  let topic = mm.topic;
  if (q.module === '技术架构' && q.source && q.source.includes('AI')) topic = '人工智能';

  let day = mm.day;
  if (q.module === '业务架构') day = classifyBADay(q);
  if (q.module === '信息架构') day = classifyIADay(q);

  // subtopic 细分（BA/IA/指标/测试 四大类有，其他返回 undefined）
  let subtopic;
  if (topic === '业务架构') subtopic = classifyBASubtopic(q);
  else if (topic === '信息架构') subtopic = classifyIASubtopic(q);
  else if (topic === '指标架构') subtopic = classifyMetSubtopic(q);
  else if (topic === '测试') subtopic = classifyTestSubtopic(q);

  // ⭐ 多选题去冗余"以上全对"型末选项（2026-07-09）：
  // 形如"所有选项都…/以上都…/全部都…"的末项语义上等于把前面选项全选，
  // 留着它要么变成无脑全选、要么让人因没选它而判错。一律剔除，并把 answer
  // 索引重映射（被删项之后的索引前移）。源料（coze-questions.json）已对 9 道题
  // 改过，这里做兜底：rebuild 时防回退，新增题也自动管住。
  let options = q.options;
  let answer = q.answer;
  if (q.type === 'multi' && options.length >= 2 && ALL_OF_ABOVE_RE.test(options[options.length - 1].trim())) {
    const cutAt = options.length - 1;
    options = options.slice(0, cutAt);
    answer = answer
      .filter((i) => i !== cutAt)          // 丢弃指向被删末项的索引
      .map((i) => (i > cutAt ? i - 1 : i)); // 之后的索引前移（此处末项后无更多，保留逻辑通用）
  }

  const opts = {};
  options.forEach((o, i) => { opts[LETTERS[i]] = o; });
  const ans = [...new Set(answer)]
    .filter((i) => i >= 0 && i < options.length)
    .sort((a, b) => a - b)
    .map((i) => LETTERS[i]);

  // ⭐ 品牌名中性化（发布红线）：coze 源料保留原文品牌名，但进入发布链路前必须中性化。
  // 替换 question/options/analysis 里的真实企业名。与 AGENTS.md 红线一致。
  const neutralize = (s) => (s || '')
    .replace(/中国一汽/g, '某大型车企')
    .replace(/一汽(?!红旗)/g, '某大型车企')  // "一汽"但不跟"红旗"（避免"一汽红旗"拆两次）
    .replace(/红旗/g, '某大型车企')
    .replace(/FAW/g, '某大型车企')
    .replace(/国家电投/g, '某新能源企业')
    .replace(/华为《数字化转型之道》/g, '某权威数字化转型方法论著作');

  return {
    id: q.id,
    source: 'BA官方题库',
    topic,
    day,
    type: q.type,
    question: neutralize(q.question),
    options: Object.fromEntries(Object.entries(opts).map(([k, v]) => [k, neutralize(v)])),
    answer: ans,
    analysis: neutralize(q.explanation || ''),
    ...(subtopic ? { subtopic } : {}),
  };
}

const out = coze.map(convert).filter(Boolean);

// 验证 id 唯一
const ids = new Set();
for (const q of out) {
  if (ids.has(q.id)) throw new Error('重复 id: ' + q.id);
  ids.add(q.id);
  if (!q.answer.length) console.warn('缺答案: ' + q.id);
}

writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');

const stat = {};
out.forEach((q) => { stat[q.topic] = stat[q.topic] || { total: 0 }; stat[q.topic].total++; });
console.log('转换完成:', out.length, '题（删超纲后）');
console.log('topic 分布:');
for (const [t, s] of Object.entries(stat)) console.log('  ', t.padEnd(8), '总' + s.total);
const dayStat = {};
out.forEach((q) => { dayStat[q.day] = (dayStat[q.day] || 0) + 1; });
console.log('day 汇总:', Object.entries(dayStat).sort().map(([d, n]) => `${d}=${n}`).join(' '));
// subtopic 分布（BA/IA/指标 三大类细分）
const subStat = {};
out.forEach((q) => { if (q.subtopic) subStat[q.subtopic] = (subStat[q.subtopic] || 0) + 1; });
console.log('subtopic 分布:');
for (const [s, n] of Object.entries(subStat).sort()) console.log('  ', s.padEnd(20), n);
console.log('写入', outPath);
