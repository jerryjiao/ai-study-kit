/**
 * BA/IA/指标 三大类的 subtopic（原子考点）分类器——build_coze.mjs 与 merge.mjs 共用。
 *
 * 抽出独立模块的原因：build_coze.mjs 有顶层副作用（读 coze 源、写 _ba_questions.json），
 * merge.mjs 不能直接 import 它（会触发整段 coze 重建）。分类逻辑是纯函数，拎出来两边复用。
 *
 * 设计：
 *   - subtopic 是纯展示/导航维度，不影响 topic/day/进度。
 *   - 命名规范：`BA·价值流灯塔` / `IA·数据标准与分布` / `指标·基础与分类`（前缀+中点）。
 *   - 算法：强信号关键词命中即归类（优先级高的先判），都不命中走兜底（归总论）。
 *   - 入参 q 兼容两种字段口径：coze 原始题用 explanation，合并后题用 analysis。
 *     blob = JSON.stringify(q) 覆盖全字段，关键词打分（主分类依据）对两种题都有效；
 *     text 只用于总论性正则，读 explanation || analysis 兜底。
 */
// ─────────────────────────────────────────────────────────────

// BA 子主题关键词（强信号优先：半加器/TOGAF 独立成簇，避免被价值流打分稀释）
const BA_HALF_ADDER_KW = ['半加器', '全加器', '握手点'];
const BA_TOGAF_KW = ['TOGAF', 'ADM', '架构开发方法', '架构内容框架', '4A', '5A', 'Y模型', 'Y 模型'];
const BA_VALUESTREAM_KW = ['价值流', '灯塔', '变革', '利益相关者', '价值主张', '价值度量', '旅程', '北极星', '价值管理', 'TAM', 'Value Book', '价值书', '12种武器', '十二种武器'];
const BA_CAPABILITY_KW = ['业务能力', '能力地图', '能力类', '能力组', '能力生命周期', 'CBM'];
const BA_ACTIVITY_KW = ['业务活动', '业务单元', '流程分解', '业务模块', '业务领域', '基本单元'];
const BA_COMP_SCENE_KW = ['业务组件', '结构化', 'EAMAP', '孤点', '环点', '抽象表达', '业务场景', '场景因子', '二维流程'];
// BA 总论性表述（题干问业务架构整体定义/作用/灵魂/基础，优先归总论，不被"结构化"等弱词拉走）
const BA_GENERAL_PATTERNS = [
  /业务架构(?:是|通过|主要|的)(?:将|是|通过|对|为)/,
  /(?:企业架构|架构)的(?:基础|灵魂|核心|本质)/,
  /业务架构(?:体系|体系模型|主要回答|设计是)/,
  /架构治理/,
  /业务架构(?:包含|包括)的(?:核心|主要)/,
];

export function classifyBASubtopic(q) {
  const blob = JSON.stringify(q);
  const text = (q.question || '') + (q.explanation || q.analysis || '');
  // 强信号：半加器（训练营借集成电路类比，独立考点簇）
  if (BA_HALF_ADDER_KW.some((kw) => blob.includes(kw))) return 'BA·总论与TOGAF';
  // 强信号：TOGAF/ADM 方法论
  if (BA_TOGAF_KW.some((kw) => blob.includes(kw))) return 'BA·总论与TOGAF';
  // 强信号：业务架构总论性题干（"业务架构是…""企业架构的基础/灵魂"）→ 归总论
  if (BA_GENERAL_PATTERNS.some((re) => re.test(text))) return 'BA·总论与TOGAF';
  // 弱信号：打分取最高
  const val = BA_VALUESTREAM_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const cap = BA_CAPABILITY_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const act = BA_ACTIVITY_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const comp = BA_COMP_SCENE_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const scores = [
    ['BA·价值流灯塔', val],
    ['BA·业务能力', cap],
    ['BA·业务活动与流程', act],
    ['BA·业务组件与场景', comp],
  ];
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  // 都为 0 = 无明确考点信号，归总论
  return best[1] > 0 ? best[0] : 'BA·总论与TOGAF';
}

// IA 子主题关键词。改打分制（非强信号优先），让"信息架构组件/核心作用"类总论题
// 不被单个宽词（如"数据质量""数据资产"）误判到细分簇。
const IA_ASSET_GOV_KW = ['数据资产', '资产目录', 'Owner', '数据治理', 'DCMM', '数据血缘', '数据中台', '治理主体', '数据质量', '数据基本法'];
const IA_STD_DIST_KW = ['数据标准', '数据分布', '信息链', 'CRUD', '数据源', 'IP1', 'IP2', 'IP3', 'IP4', 'IP5', '数据分类', '基础数据', '主数据', '事务数据', '观测数据', '规则数据', '报告数据'];
const IA_BIZ_OBJ_KW = ['业务对象', '概念模型', '主题域', '命名'];
// IA 总论性题干（问信息架构整体/组件/作用/原则，应归总论而非细分簇）
const IA_GENERAL_PATTERNS = [
  /信息架构(?:的)?(?:核心作用|英文|是什么|包含|包括|不包含|组件)/,
  /信息架构组件/,
  /信息架构设计原则/,
  /IP[1-5](?:“|“|的)/,
  /企业架构中/,
];

export function classifyIASubtopic(q) {
  const blob = JSON.stringify(q);
  const text = (q.question || '') + (q.explanation || q.analysis || '');
  // 强信号：IA 总论性题干优先归总论
  if (IA_GENERAL_PATTERNS.some((re) => re.test(text))) return 'IA·总论与IP原则';
  // 打分取最高（避免单宽词误判）
  const gov = IA_ASSET_GOV_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const std = IA_STD_DIST_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const obj = IA_BIZ_OBJ_KW.reduce((n, kw) => n + (blob.split(kw).length - 1), 0);
  const scores = [
    ['IA·数据资产治理', gov],
    ['IA·数据标准与分布', std],
    ['IA·业务对象与概念', obj],
  ];
  const best = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : 'IA·总论与IP原则';
}

// 指标子主题关键词。
//   注意"统计周期/度量单位"在指标名称规则语境（COZE-0284 等）属基础认知，
//   只在治理实操语境（认证数据源/数据工作台/指标字典等）才算治理应用。
//   故 MET_GOV_APP_KW 不放"统计周期"这种跨语境词，靠其他治理强词判定。
const MET_GOV_APP_KW = ['DWD', '认证数据源', '数据资产目录', '探索性数据', '探索性分析', '指标数据治理', '指标字典', '指标卡片', '指标治理', '数据工作台', '填报表', '中间表', '数据问题', '指标口径', '数据开发', '交付形态', '最佳用户', '数据安全共享'];
const MET_METHOD_KW = ['SMART', 'Value Book', '价值书', '指标池', '因子关系', '北极星', '灯塔'];
// 治理实操语境词（与上面 MET_GOV_APP_KW 配合：命中"统计周期"且命中任一治理语境词才归治理）
const MET_GOV_CONTEXT_KW = ['认证', '工作台', '字典', '资产', '开发', '治理', '探索', '分析'];

export function classifyMetSubtopic(q) {
  const blob = JSON.stringify(q);
  // 方法论强信号优先（SMART/Value Book/指标池 是明确的方法论工具）
  if (MET_METHOD_KW.some((kw) => blob.includes(kw))) return '指标·方法论与SMART';
  // 治理应用：要求命中治理强词，或"统计周期/统计频率"+治理语境词
  const hasGovStrong = MET_GOV_APP_KW.some((kw) => blob.includes(kw));
  const hasStatCycle = blob.includes('统计周期') || blob.includes('统计频率');
  const hasGovContext = MET_GOV_CONTEXT_KW.some((kw) => blob.includes(kw));
  if (hasGovStrong || (hasStatCycle && hasGovContext)) return '指标·治理与数仓应用';
  return '指标·基础与分类';
}

// ─────────────────────────────────────────────────────────────
// 测试子主题关键词。覆盖两类题：
//   1. 自造测试理论题（_test_questions.json, T- 系列）：等价类/边界值/判定表/因果图/
//      用例设计/缺陷管理/黑白盒/V模型/工具/安全测试/自动化 + T4 流程/规范/需求/项目/业务。
//   2. coze 运维题（COZE-1039~1048，运维管理 module→topic=测试）：ITIL/事件管理/
//      问题管理/变更管理/DevOps/可观测性。
// 强信号优先判（安全/工具/运维各自独立成簇，不被"用例设计"等宽词拉走）。
// ⭐ 「性能测试/性能指标/接口测试」从安全类移出（2026-07-19）：这三项不属于安全测试，
// 是工具与自动化范畴（性能测试工具如 JMeter、接口测试工具如 Postman）。
// 原放在安全类会导致 T-107（性能测试工具）、T-156（性能指标）、T-158（接口测试 vs UI）误判。
const TEST_SECURITY_KW = ['安全测试','SQL注入','SQL语句','OWASP'];
const TEST_TOOL_KW = [
  'Confluence','Xmind','思维导图','JMeter','LoadRunner','JaCoCo','Istanbul','覆盖率工具',
  '自动化测试','CI/CD','持续集成','测试工具用途','测试工具','大禹','用例管理功能',
  // 编码与自动化工具能力项（2026-07-19 新增，T-139~T-158 系列配套）：
  // 对齐软质矩阵「编码能力」「测试工具能力」——Python 代码识别 / pytest / Selenium / 性能 / CI。
  'Python','pytest','unittest','fixture','parametrize','assertEqual',
  'Selenium','WebDriver','Playwright','Page Object','PO模式','PageObject',
  'xpath','css_selector','WebDriverWait','time.sleep',
  'Ramp-up','Ramp up','吞吐量','TPS','响应时间',
  '接口测试','性能测试','性能指标','压力测试',
];
const TEST_OPS_KW = ['IT运维','运维管理','事件管理','问题管理','变更管理','ITIL','服务台','Service Desk','可观测性','运维自动化','运维监控','DevOps'];
const TEST_DEFECT_KW = ['缺陷','bug','严重程度','优先级','Severity','Priority','状态流转','暂不修复','生命周期'];
// ⭐ 注意：Jira 从 DEFECT 移到 TOOL——Jira 题干可能考缺陷状态(T-018)也可能考工具实操(T-063)，
// 但工具题优先级应高于缺陷（T-063 题干含"缺陷管理工具"但考点是 Jira 状态流转，归工具更准）。
// 不过 T-018(在缺陷管理工具Jira中缺陷状态流转) 归缺陷管理更合适……
// 解决：Jira 不放 TOOL 也不放 DEFECT，靠题干其他词判：含"状态流转/生命周期"→缺陷，含"用例管理/工具"→工具。
// 故 Jira 不作为分类关键词，避免歧义。TEST_TOOL_KW 保留"大禹/用例管理功能"等工具实操词。
const TEST_TYPE_KW = [
  '黑盒','白盒','灰盒','回归','冒烟','V模型','单元测试','集成测试','验收测试','UAT','静态测试','动态测试','测试类型','测试的目的','测试流程',
  '语句覆盖','分支覆盖','路径覆盖','覆盖强度','逻辑覆盖',
  // T4 考点（流程/规范/需求/项目/业务知识）归测试类型与流程
  '测试计划','测试策略','测试的完整流程','测试技术规范','技术规范','准入准出','测试报告',
  '需求分析','需求评审','需求文档','需求描述','需求意图','需求可测试',
  '功能模块','测试点分析','工作步骤','测试任务',
  '业务知识','业务流程','业务逻辑','上下游系统','产品主要业务',
];
const TEST_CASE_DESIGN_KW = ['等价类','边界值','判定表','因果图','测试用例','用例设计','预期结果'];

// 数据库与 SQL 关键词（测试向：软质 T4 测试工具能力要求会数据库管理控制工具）。
//   用 DML/DDL 强信号词，避免与 TEST_SECURITY_KW 里的 "SQL注入/SQL语句" 冲突——
//   "SQL注入"是安全测试题，不含 SELECT/JOIN/GROUP BY 这些 DML 动词，故不会误判。
const TEST_DB_KW = ['SELECT', 'INSERT INTO', 'UPDATE', 'DELETE FROM', 'JOIN', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', '主键', '外键', 'ER图', 'E-R图', '聚合函数', 'COUNT(', 'SUM(', 'AVG(', 'MAX(', 'MIN(', '增删改查', '数据库表', '关系型数据库'];
// 网络基础关键词（软测常考：HTTP 状态码/方法/DNS/端口，非 networking 小站的 TCP 握手深度）。
//   放最前判——HTTP/状态码 是最专属信号，不会被其他分支抢。
const TEST_NET_KW = ['HTTP状态码', '状态码', 'HTTPS', 'GET请求', 'POST请求', 'PUT请求', 'DELETE请求', 'HTTP方法', 'HTTP请求', 'HTTP响应', 'DNS解析', 'DNS', '端口号', '常见端口', '幂等性', '幂等', '请求头', '响应头', '状态行', '200 OK', '404', '500', '503', '301', '302'];

export function classifyTestSubtopic(q) {
  // ⭐ 测试理论题只用题干（q.question）分类，不用 analysis——analysis 里有大量干扰词
  // （如 T-045 SQL注入题的 analysis 提到"安全测试"会误分，T-011 缺陷原因的 analysis
  // 含各种关键词会干扰）。题干本身的考点信号已经足够强。
  // 运维题（COZE-1039~1048）例外：部分题 DevOps/可观测性 只在 analysis 出现，
  // 故运维用 blob（含 analysis）判，且优先级最高先判走。
  // ⭐ subtopic 名不加"测试·"前缀——topic 已叫"测试"，前缀冗余（不同于 BA·/IA·/CN· 是缩写）。
  const blob = JSON.stringify(q);
  if (TEST_OPS_KW.some((kw) => blob.includes(kw))) return '运维管理';
  const qtext = q.question || '';
  if (TEST_NET_KW.some((kw) => qtext.includes(kw))) return '网络基础';
  if (TEST_DB_KW.some((kw) => qtext.includes(kw))) return '数据库与SQL';
  if (TEST_SECURITY_KW.some((kw) => qtext.includes(kw))) return '安全与专项';
  if (TEST_TOOL_KW.some((kw) => qtext.includes(kw))) return '工具与自动化';
  if (TEST_DEFECT_KW.some((kw) => qtext.includes(kw))) return '缺陷管理';
  if (TEST_TYPE_KW.some((kw) => qtext.includes(kw))) return '测试类型与流程';
  if (TEST_CASE_DESIGN_KW.some((kw) => qtext.includes(kw))) return '用例设计方法';
  return '用例设计方法'; // 兜底
}

