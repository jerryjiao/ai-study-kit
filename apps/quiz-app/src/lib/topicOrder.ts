import type { Question } from '../types';
import { themeConfig, LAYER_TOPICS, type Layer, type ThemeConfig } from './themeConfig';
export type { Layer } from './themeConfig';
export { LAYER_TOPICS };

/** 题集排序/显示的共享定义——Home（展示顺序）与 Practice（"下一题集"跳转）共用同一份，
 *  避免两处各定义一份 topic/subtopic 顺序而漂移。顺序语义：由浅入深的学习日程序。
 *
 *  ⭐ 本模块不持任何主题数据：全部读 examples/<theme>/theme-config.json（sync-examples 拷到
 *  src/data/theme-config.json，见 lib/themeConfig.ts 与 docs/theming.md）。各函数的 cfg 参数
 *  缺省用同步配置，仅供测试注入 fixture——消费方一律不传。
 *
 *  无配置时的回退语义：原始 topic id / 大类按字母序 / 不展开子主题 /
 *  来源原样显示 / 无层概念（全部题算计划内）。 */

/** topic 中文显示名：topic 字段是数据层的稳定标识（题库 URL/进度/排序都依赖它），
 *  界面展示统一走 topicLabel()。未登记的 topic 原样显示（自定义主题不强制翻译）。 */
export function topicLabel(topic: string, cfg: ThemeConfig = themeConfig): string {
  return cfg.topicLabels?.[topic] ?? topic;
}

/** 剥掉 subtopic 的 topic 前缀（'git-basics·工作流' → '工作流'），无前缀原样返回。
 *  前缀限定 ASCII 标识符（topic 命名规范 [a-z0-9-]）——不能把 '-'、':' 一律当分隔符，
 *  否则带连字符的 topic（如 'git-basics'）会被剥成 'basics·工作流'（'-' 是 topic 自身的连字符）。
 *  分隔符支持 · : - 三种历史写法，但仅当前缀整体是 ASCII 标识符时才剥。 */
export function stripSubtopicPrefix(sub: string): string {
  return sub.replace(/^[A-Za-z0-9_-]+[·:-]/, '');
}

/** 顶层大类顺序（由浅入深的学习日程）——配置的 topicOrder。
 *  未列出的 topic 落到末尾（按字母序）；无配置时全部按字母序。
 *  用 readonly string[] 而非 as const tuple——后者会把 indexOf 参数收窄成字面量 union，
 *  导致传入运行时 string（如 q.topic）报类型错。 */
export const TOPIC_ORDER: readonly string[] = themeConfig.topicOrder ?? [];

/** 来源显示名：把题库 source 原始码翻成人话，答题卡徽标用。未登记的原样显示。 */
export const SOURCE_LABELS: Record<string, string> = themeConfig.sourceLabels ?? {};

/** 层（学习优先级，非难度）：由 source 派生（配置的 sourceLayers）；无映射的来源无层概念。
 *  筛选 chip 与答题卡徽标共用；有层概念的大类清单见 layerTopics。 */
export function layerOf(source: string, cfg: ThemeConfig = themeConfig): Layer | null {
  return cfg.sourceLayers?.[source] ?? null;
}

/** 计划内题（主进度口径）：除拓展层外全部计入——核心（必做）与无层来源都算，
 *  拓展层（弱区补刷弹药）不进首页计数/进度分母，经练习页"拓展"chip 手动放行。
 *  用"非拓展"而非白名单枚举：无层概念的来源（无配置主题）自动全算计划内，
 *  随机 20 / computeStats / readCount / 覆盖明细共用同一口径。 */
export function isPlanned(q: Pick<Question, 'topic' | 'source'>, cfg: ThemeConfig = themeConfig): boolean {
  return layerOf(q.source, cfg) !== '拓展';
}

/** 考点深度徽标：查配置的 epDepth，先剥掉分块后缀（'线性表一' -> '线性表'）再按 base 名查表，
 *  未命中返回 null（无徽标）。 */
export function epDepthOf(subDisplayName: string, cfg: ThemeConfig = themeConfig): string | null {
  const base = subDisplayName.replace(/[一二三四五]$/, '');
  return cfg.epDepth?.[base] ?? null;
}

// 分块后缀排序：中文序号 一<二<...<十一（localeCompare 对中文数字不可靠，用查表）
const CN_NUM_ORDER = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
function cnNumIdx(s: string): number {
  const m = s.match(/[一二三四五六七八九十]+$/);
  return m ? CN_NUM_ORDER.indexOf(m[0]) : -1;
}

/** 某 topic 下实际存在的 subtopic，按学习深度序（base 顺序 + 同 base 下分块按中文序号）。
 *  无子主题定义的 topic 返回空数组（首页整卡一条，无二级导航）。 */
export function orderedSubtopics(topic: string, qs: Question[], cfg: ThemeConfig = themeConfig): string[] {
  const bases = cfg.subtopics?.[topic];
  if (!bases) return [];
  const actual = new Set<string>();
  for (const q of qs) if (q.topic === topic && q.subtopic) actual.add(q.subtopic);
  const ordered: string[] = [];
  for (const base of bases) {
    const chunks = [...actual].filter((s) => s === base || s.startsWith(base));
    chunks.sort((a, b) => {
      const ia = cnNumIdx(a),
        ib = cnNumIdx(b);
      return (ia === -1 ? -1 : ia) - (ib === -1 ? -1 : ib);
    });
    ordered.push(...chunks);
    for (const c of chunks) actual.delete(c);
  }
  ordered.push(...actual); // 兜底：base 表未覆盖的 subtopic 追加到末尾
  return ordered;
}

/** 题集的扁平有序列表，与首页"按主题练习"网格的点击顺序一致：
 *  按 topicOrder → 有子主题的大类逐 subtopic、无子主题的大类整体一条。
 *  用于 Practice 完成 summary 的"下一题集"跳转：给定当前 (topic, subtopic) 找下一个。
 *  每条 { topic, subtopic }（subtopic='' 表示无子主题的大类整体）。 */
export function buildAtomicOrder(qs: Question[], cfg: ThemeConfig = themeConfig): { topic: string; subtopic: string }[] {
  const order = cfg.topicOrder ?? [];
  const out: { topic: string; subtopic: string }[] = [];
  for (const topic of order) {
    const subs = orderedSubtopics(topic, qs, cfg);
    if (subs.length > 0) {
      for (const subtopic of subs) out.push({ topic, subtopic });
    } else if (qs.some((q) => q.topic === topic)) {
      out.push({ topic, subtopic: '' });
    }
  }
  // 兜底：topicOrder 未列出的 topic（用户自定义主题）按字母序追加
  const extras = new Set(
    qs.map((q) => q.topic).filter((t): t is string => !!t && !order.includes(t))
  );
  for (const topic of [...extras].sort()) {
    const subs = orderedSubtopics(topic, qs, cfg);
    if (subs.length > 0) {
      for (const subtopic of subs) out.push({ topic, subtopic });
    } else {
      out.push({ topic, subtopic: '' });
    }
  }
  return out;
}

/** 题集显示名：去掉子主题前缀（如 'git-basics·工作流' → '工作流'）；无子主题时用大类名。
 *  与 stripSubtopicPrefix 同一口径（前缀限定 ASCII 标识符），改其一须同步另一处。 */
export function atomicLabel(topic: string, subtopic: string): string {
  if (!subtopic) return topic;
  return stripSubtopicPrefix(subtopic);
}
