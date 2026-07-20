import { readFileSync, writeFileSync, mkdirSync, accessSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// 复用 classify.mjs 的 BA/IA/指标 subtopic 分类器，给非 coze 源（0417题库/岗位矩阵T4补题）
// 补上原子 subtopic——这些题走 _xls/_text 路径进来，原本只有 topic 没 subtopic。
import { classifyBASubtopic, classifyIASubtopic, classifyMetSubtopic, classifyTestSubtopic } from './classify.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const exists = (p) => { try { accessSync(join(root, p)); return true; } catch { return false; } };
const load = (p) => JSON.parse(readFileSync(join(root, p), 'utf-8'));
const loadOpt = (p) => (exists(p) ? load(p) : []);

// 源文件：BA 方向重构后（删了网络题、删了产品设计全量练习题）
const text = loadOpt('scripts/_text_questions.json');    // A-(100客观) + EA-(矩阵补题) + 云原生/AI 补题
const xls = loadOpt('scripts/_xls_questions.json');      // C- (0417题库, BA 体系)
// IMG- 图片题已停用：30 道全部与 COZE- 文字题完全重复（应用架构课件题 coze 已收全），
// 且图片是题目文字截图（无架构图等视觉信息），还含"中国一汽"品牌名违反发布红线。
// 原始识图数据保留在 _image_questions.json 存档，此处不再读入。
// 如需恢复：把下行注释打开，并恢复去重段 IMG- 优先保留逻辑。
const imgs = []; // loadOpt('scripts/_image_questions.json');
const ba = loadOpt('scripts/_ba_questions.json');        // COZE- (coze 1060 题, BA 官方题库)
const cn = loadOpt('scripts/_cn_questions.json');        // CN- (云原生官方平台术语补题)
const tests = loadOpt('scripts/_test_questions.json');   // T- (测试理论补题，软质T3兜底)
const net = loadOpt('scripts/_net_questions.json');      // NET- (网络安全补题，安全岗四能力项硬缺口)
const cards = loadOpt('scripts/_flashcards.json');       // FC- 闪卡

// 题库清洗决策表：删超纲/重复 + 给 C/CN/EA 系列补 day（详见 _day_assignment.json 注释）
// 加载位置：所有源读完后，mapText/mapXls 第 58/67 行注入 day；第 105 行 filter 按 delete_ids 删
const plan = loadOpt('scripts/_day_assignment.json');
const delSet = new Set(plan.delete_ids || []);
const dayMap = {};
for (const [d, ids] of Object.entries(plan.day_assignment || {}))
  for (const id of ids) dayMap[id] = d;

/**
 * topic 归一化：BA 方向新主题体系
 *   业务架构 / 信息架构 / 指标架构 / 应用架构 / 云原生 / 人工智能 / 产品设计 / 测试
 *
 * - coze (ba) 题 source='BA官方题库'，topic 已是最终值，直接透传
 * - text 100道客观题 → 业务架构（应用架构类题归业务架构）; 产品设计类→产品设计
 * - xls 0417题库 → 全部业务架构（业务单元/能力/流程/组件/价值流 都是 BA 体系）
 */
function normalizeTopic(source, rawTopic) {
  if (source === 'BA官方题库') return rawTopic;
  if (source.startsWith('云原生')) return '云原生';
  if (source === 'AI通用力补题') return '人工智能';
  if (source === '测试理论') return '测试';
  if (source === '网络安全补题') return '网络安全';
  if (source === '指标架构') return '指标架构';
  if (source === '岗位矩阵T4补题-信息架构') return '信息架构';
  if (source === '岗位矩阵T4补题-业务架构') return '业务架构';
  if (source === '0417题库') return '业务架构';
  if (source === '100道客观题') {
    const t = rawTopic || '';
    return t.startsWith('产品设计') ? '产品设计' : '业务架构';
  }
  if (source === '应用架构课上习题') return '业务架构';
  // fallback：若 rawTopic 已是合法 topic（如「指标架构·0005课」source 配 topic=「指标架构」），尊重它
  const KNOWN_TOPICS = ['业务架构','信息架构','指标架构','应用架构','云原生','人工智能','产品设计','测试'];
  if (rawTopic && KNOWN_TOPICS.includes(rawTopic)) return rawTopic;
  return '业务架构';
}

function mapText(q) {
  const out = {
    id: q.id, source: q.source, topic: normalizeTopic(q.source, q.topic), type: q.type,
    question: q.question, options: q.options, answer: q.answer || [],
    analysis: q.analysis || '',
  };
  // day：优先用 _day_assignment.json 的 dayMap 注入（C/CN/EA 系列原本无 day），
  // 否则透传源文件自带的 day（如 _test_questions.json 的 T- 题）。
  const d = dayMap[q.id] || q.day; if (d) out.day = d;
  return out;
}
function mapXls(q) {
  const out = {
    id: q.id, source: q.source, topic: normalizeTopic(q.source, q.topic), type: q.type,
    question: q.question, options: q.options, answer: q.answer || [],
    difficulty: q.difficulty || '', analysis: q.analysis || '', examPoint: q.examPoint || '',
  };
  const d = dayMap[q.id] || q.day; if (d) out.day = d;
  return out;
}
function mapImage(item, qi, q) {
  const imgNum = item.image.replace(/\D/g, '');
  return {
    id: `IMG-${imgNum.padStart(2, '0')}-q${qi}`,
    source: '应用架构课上习题', topic: normalizeTopic('应用架构课上习题', item.topic),
    type: q.type || 'single',
    question: q.question, options: q.options || {}, answer: q.answer || [],
    imageRef: item.image,
    autoGradable: !!(q.answer && q.answer.length > 0),
    analysis: '', note: item.note || '',
  };
}
/** coze BA 题透传（topic 已最终值，带 day 字段） */
function mapBa(q) {
  return {
    id: q.id, source: q.source, topic: q.topic, day: q.day || '', type: q.type,
    question: q.question, options: q.options, answer: q.answer || [],
    analysis: q.analysis || '',
    ...(q.subtopic ? { subtopic: q.subtopic } : {}),
  };
}
function mapFlashcard(c) {
  return {
    id: c.id, front: c.front, back: c.back,
    source: c.source || '', topic: normalizeTopic(c.source || '', c.topic),
    ...(c.fromQuestionId ? { fromQuestionId: c.fromQuestionId } : {}),
  };
}

const out = [
  ...text.map(mapText),
  ...xls.map(mapXls),
  ...ba.map(mapBa),
  ...cn.map(mapText),
  ...tests.map(mapText),   // T- 测试理论补题（已带 day/topic，mapText 透传）
  ...net.map(mapText),     // NET- 网络安全补题（已带 day/topic，mapText 透传）
  ...imgs.flatMap((item) => (item.questions || []).map((q, i) => mapImage(item, i + 1, q))),
].filter((q) => q.topic !== '产品设计'   // ⭐ 删超纲：产品设计（两岗矩阵都不含，来自100道客观题A-043~072）
        && !q.id.startsWith('A-')      // ⭐ 删超纲：A 系列 70 道应用架构（BA 岗矩阵 §2.9 七能力项不含应用架构设计力）
        && !delSet.has(q.id));         // ⭐ 删重复：_day_assignment.json 的 delete_ids（C/CN/EA 与 COZE 重复的题）

// —— 去重：按题干指纹（去标点空格取前15字）去重，coze 题库(COZE-) 优先保留。
// 原因：A-100客观题 / C-0417题库 部分题目与 coze 官方题库重复（同一批题源），
// 不去重会导致一题两份记录、刷题重复、统计虚高。coze 是主弹药，保留其版本。
// fp 用白名单式：只保留汉字、字母、数字，其余全去掉。比黑名单去标点更彻底，
// 不会被任何标点漏网（曾因漏掉半角冒号、弯引号“”导致同题指纹不同、去重失效）。
const fp = (s) => (s || '').replace(/[^\u4e00-\u9fa5A-Za-z0-9]/g, '').slice(0, 15);
const cozeFps = new Set(out.filter((q) => q.id.startsWith('COZE-')).map((q) => fp(q.question)));
let dropped = 0;
let deduped = out.filter((q) => {
  if (q.id.startsWith('COZE-')) return true; // coze 优先保留
  if (cozeFps.has(fp(q.question))) { dropped++; return false; } // 与 coze 重复则丢弃
  return true;
});

// —— 第二层去重：coze 内部也有重复（同一题在不同 module 各收一遍）。
// 按"题干指纹 + 答案"组合去重：完全相同的只保留 id 最小的一题；
// 题干同但答案不同的视为不同题（不同考点），保留。
const fullKey = (q) => fp(q.question) + '|' + [...(q.answer || [])].sort().join(',');
const seen = new Map(); // key → 已保留的 id
let droppedInner = 0;
deduped = deduped.filter((q) => {
  if (!q.id.startsWith('COZE-')) return true; // 非 coze 不在此层处理
  const k = fullKey(q);
  if (seen.has(k)) { droppedInner++; return false; } // 已有同题，丢弃
  seen.set(k, q.id);
  return true;
});

// —— 第三层去重：题干问法变体（"是什么"vs"含义是"、"核心组件"vs"治理的核心组件"等措辞差异）。
// 第二层只抓前15字指纹完全相同的；但 coze 有少量"考点/答案全一致只差题干措辞"的变体。
// 这类措辞差异无法靠正则安全归一化（激进会误并不同考点，如"哪一范式"vs"必须满足的范式"答案都是第三范式），
// 因此不在此层自动处理，由 fix_coze_dupes.mjs 按人工核实清单从源删除。
// （曾经尝试过 题型+答案内容集 做 key，会误删答案碰巧相同但考点不同的题，已废弃。）

if (dropped > 0) console.log(`去重：丢弃与 coze 重复的 ${dropped} 题（保留 COZE- 版本）`);
if (droppedInner > 0) console.log(`去重：丢弃 coze 内部重复的 ${droppedInner} 题（同题同答案，保留 id 最小者）`);
out.length = 0;
out.push(...deduped); // 用去重后的结果替换 out，后续验证/写入都用它

// ─────────────────────────────────────────────────────────────
// subtopic 细分：云原生（61 题，颗粒太粗，拆 3 簇方便按考点练）
//   与 build_coze.mjs 的 BA/IA/指标 subtopic 同思路，但因云原生题来自三个源
//   （COZE 经 build_coze / CN+EA 经 mapText），统一在此处注入最干净。
//   命名规范：`CN·总论与平台架构`（与 BA·/IA·/指标· 同前缀+中点）。
//   算法：元数据授权 / 总论平台 两类强信号优先判（含 DDD/schema 的元数据题
//   不被总论拉走、API网关题不被"账号"误判到元数据），剩余走交付与运营，兜底总论。
// ─────────────────────────────────────────────────────────────
const CN_META_AUTH_KW = [
  '元数据树','元数据体系','元数据功能授权','元数据管理','元数据与容器','数字资产的主数据库','树形层级',
  '功能授权','数据授权','企业空间','管理域','RBAC','授权的核心原则','授权粒度','功能授权和数据授权',
  '基于业务owner','业务owner授权',
  '微服务」层级下的 schema','schema 对应','业务实体','安全操作','删除企业空间',
  '账号来源是什么', // CN-039 独有题干，避开 EA-020 选项里的"管理用户账号"
];
const CN_PLATFORM_KW = [
  '5A架构','5A客户旅程','平台的主要职责','建设目标','核心技术理念','核心要素','核心优势','典型应用场景',
  '矩阵对云原生','能力（T5）','能力要求',
  'API网关','网关策略','作用域','全局作用域',
  '微服务治理','微服务架构','Spring Cloud Alibaba','Service Mesh','服务网格','中间件','消息队列','消息中间件','数据库选型','AP类','选型原则',
  '通用语言','领域驱动','E-MAP','DevOps',
];
const CN_DELIVERY_KW = [
  '容器平台','容器化','容器镜像','镜像仓库','制品库','Maven','流水线','静态代码','卡点','持续部署','CD','多环境','晋升',
  '发版','发布策略','无感知','副本','集群策略','探针','滚动','灰度','蓝绿','金丝雀','日均','500次','底层技术栈','源码交付',
  '监控','三驾马车','链路','排障','Trace','日志','可观测','智慧运管',
  '查洗打','SLA','服务可用性','资源使用率','资源效能','质量保障','质量打分','返工','需求质量','统一任务台',
];
function classifyCNSubtopic(q) {
  const blob = JSON.stringify(q);
  if (CN_META_AUTH_KW.some((kw) => blob.includes(kw))) return 'CN·元数据与授权治理';
  if (CN_PLATFORM_KW.some((kw) => blob.includes(kw))) return 'CN·总论与平台架构';
  if (CN_DELIVERY_KW.some((kw) => blob.includes(kw))) return 'CN·交付与运营';
  return 'CN·总论与平台架构';
}
for (const q of out) {
  if (q.topic === '云原生') q.subtopic = classifyCNSubtopic(q);
}
// 补 BA/IA/指标 subtopic：coze 源（_ba_questions.json）在 build_coze.mjs 里已分好，
// 但 0417题库(_xls)和岗位矩阵T4补题(_text)进来时只有 topic 没 subtopic。
// 这里对"有 topic 但无 subtopic"的题补分类（!q.subtopic 守卫，已有 subtopic 的 coze 题不动）。
// 分类器靠关键词打分（JSON.stringify 覆盖全字段含 analysis），不依赖 coze 专属字段。
for (const q of out) {
  if (q.subtopic) continue;
  if (q.topic === '业务架构') q.subtopic = classifyBASubtopic(q);
  else if (q.topic === '信息架构') q.subtopic = classifyIASubtopic(q);
  else if (q.topic === '指标架构') q.subtopic = classifyMetSubtopic(q);
  else if (q.topic === '测试') q.subtopic = classifyTestSubtopic(q);
}

// ─────────────────────────────────────────────────────────────
// 大子主题分块（2026-07-10）：题量 > SPLIT_THRESHOLD 的 subtopic 按 BATCH 题一批拆成
// "BA·价值流灯塔一/二/三/四"等，首页可直接点进任意一批。进度按题 id 存（不碰 subtopic），
// 重命名不影响答题记录。
//   排序：官方题库(source 含 '官方'/'COZE' 或 id 以 COZE-/CN-/T-/EA- 开头)优先，
//   再按 id 升序兜底 → 第一批是体系化考点题，补充练习(0417/T4)排后面。
//   中文序号用数组查表（一/二/三...十一），不依赖 locale。
// ─────────────────────────────────────────────────────────────
const SPLIT_THRESHOLD = 40;
const BATCH = 25;
const CN_NUMS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
// 官方/体系化题优先的排序键：权重小的排前
const officialWeight = (q) => {
  const isOfficial = q.source.includes('官方') || /^COZE-/.test(q.id) || /^CN-/.test(q.id) || /^T-/.test(q.id) || /^EA-/.test(q.id);
  return isOfficial ? 0 : 1;
};
// 按 subtopic 分组
const bySub = {};
for (const q of out) {
  if (!q.subtopic) continue;
  (bySub[q.subtopic] ??= []).push(q);
}
for (const [sub, qs] of Object.entries(bySub)) {
  if (qs.length <= SPLIT_THRESHOLD) continue;
  // 组内排序：官方优先，再按 id
  qs.sort((a, b) => {
    const w = officialWeight(a) - officialWeight(b);
    if (w !== 0) return w;
    return a.id.localeCompare(b.id, 'en');
  });
  // 每 BATCH 题一批，subtopic 追加中文序号
  const batches = Math.ceil(qs.length / BATCH);
  for (let i = 0; i < batches; i++) {
    const suffix = CN_NUMS[i] ?? String(i + 1);
    const newSub = sub + suffix;
    for (const q of qs.slice(i * BATCH, (i + 1) * BATCH)) q.subtopic = newSub;
  }
}

const flashcards = cards.map(mapFlashcard);

// ─────────────────────────────────────────────────────────────
// 品牌名中性化（发布红线）：对所有源的题统一替换真实企业名。
// coze 源在 build_coze.mjs 已处理一遍，这里对非 coze 源（0417题库/岗位矩阵T4补题等）
// 再做兜底——任何含品牌名的题都逃不过这一层。
// ─────────────────────────────────────────────────────────────
const NEUTRALIZE_PAIRS = [
  [/中国一汽/g, '某大型车企'],
  [/一汽(?!红旗)/g, '某大型车企'],   // "一汽"但不跟"红旗"
  [/红旗/g, '某大型车企'],
  [/FAW/g, '某大型车企'],
  [/国家电投/g, '某新能源企业'],
  [/华为《数字化转型之道》/g, '某权威数字化转型方法论著作'],
];
const neutralizeText = (s) => {
  if (typeof s !== 'string' || !s) return s;
  let r = s;
  for (const [re, rep] of NEUTRALIZE_PAIRS) r = r.replace(re, rep);
  return r;
};
let neutralizedCount = 0;
for (const q of out) {
  // 题干、分析、examPoint
  for (const f of ['question', 'analysis', 'examPoint', 'difficulty', 'note']) {
    if (q[f]) q[f] = neutralizeText(q[f]);
  }
  // 选项（对象 {A:..., B:...}）
  if (q.options && typeof q.options === 'object' && !Array.isArray(q.options)) {
    for (const k of Object.keys(q.options)) {
      q.options[k] = neutralizeText(q.options[k]);
    }
  }
}
// 闪卡也管
for (const c of flashcards) {
  for (const f of ['front', 'back']) {
    if (c[f]) c[f] = neutralizeText(c[f]);
  }
}

// 验证：题 id 唯一 + 可判分题须有答案
const ids = new Set();
for (const q of out) {
  if (ids.has(q.id)) throw new Error('重复题 id: ' + q.id);
  ids.add(q.id);
  if (q.autoGradable !== false && (!q.answer || q.answer.length === 0))
    console.warn('警告: 可判分题缺答案 ' + q.id);
}
const cardIds = new Set();
for (const c of flashcards) {
  if (cardIds.has(c.id)) throw new Error('重复卡 id: ' + c.id);
  if (ids.has(c.id)) throw new Error('卡 id 与题 id 冲突: ' + c.id);
  cardIds.add(c.id);
  if (!c.front || !c.back) console.warn('警告: 闪卡缺 front/back ' + c.id);
}

const typeCount = (t) => out.filter((q) => q.type === t).length;
console.log(`合并完成: 题 ${out.length} 张, 卡 ${flashcards.length} 张`);
console.log(`  单选 ${typeCount('single')} / 多选 ${typeCount('multi')} / 判断 ${typeCount('judge')}`);
console.log(`  自评模式(autoGradable=false): ${out.filter((q) => q.autoGradable === false).length}`);
console.log(`  topic 分布:`, out.reduce((m, q) => (m[q.topic] = (m[q.topic] || 0) + 1, m), {}));
console.log(`  source 分布:`, out.reduce((m, q) => (m[q.source] = (m[q.source] || 0) + 1, m), {}));
const subStat = {};
out.forEach((q) => { if (q.subtopic) subStat[q.subtopic] = (subStat[q.subtopic] || 0) + 1; });
console.log(`  subtopic 分布:`, subStat);
console.log(`  卡来源分布:`, flashcards.reduce((m, c) => (m[c.source] = (m[c.source] || 0) + 1, m), {}));

mkdirSync(join(root, 'src', 'data'), { recursive: true });
writeFileSync(join(root, 'src', 'data', 'questions.json'),
  JSON.stringify(out, null, 2), 'utf-8');
console.log('写入 src/data/questions.json');

writeFileSync(join(root, 'src', 'data', 'flashcards.json'),
  JSON.stringify(flashcards, null, 2), 'utf-8');
writeFileSync(join(root, 'src', 'data', 'flashcards.ts'),
  `import type { Flashcard } from '../types';\nimport raw from './flashcards.json';\nexport const flashcards = raw as Flashcard[];\n`, 'utf-8');
console.log('写入 src/data/flashcards.json + flashcards.ts');
