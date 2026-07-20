import type { Question } from '../types';

/** 题集排序的共享定义——Home（展示顺序）与 Practice（"下一题集"跳转）共用同一份，
 *  避免两处各定义一份 topic/subtopic 顺序而漂移。顺序语义：由浅入深的学习日程序。
 *
 *  顶层大类顺序——你可以在 examples/<theme>/questions.json 里用任意 `topic` 字段，
 *  这里控制它们在首页的展示顺序。未列出的 topic 落到末尾（按字母序）。
 *  用 readonly string[] 而非 as const tuple——后者会把 indexOf 参数收窄成字面量 union，
 *  导致传入运行时 string（如 q.topic）报类型错。 */
export const TOPIC_ORDER: readonly string[] = [
  'git-basics',
  'linux-commands',
];

/** 子主题"base 名"学习深度序（不含分块后缀"一/二/三"）。
 *  - 出题量大的 topic 可以用 subtopic 字段做内部分块（如 'git-basics·工作流'）
 *  - orderedSubtopics 运行时从 questions 数据派生实际 subtopic（含后缀）按 base 归位
 *  默认示例 dev-intro 不演示 subtopic 分块，留空记录让 base = topic 本身。 */
export const BASE_SUBTOPIC_ORDER: Record<string, string[]> = {};

// 分块后缀排序：中文序号 一<二<...<十一（localeCompare 对中文数字不可靠，用查表）
const CN_NUM_ORDER = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
function cnNumIdx(s: string): number {
  const m = s.match(/[一二三四五六七八九十]+$/);
  return m ? CN_NUM_ORDER.indexOf(m[0]) : -1;
}

/** 某 topic 下实际存在的 subtopic，按学习深度序（base 顺序 + 同 base 下分块按中文序号）。
 *  无子主题定义的 topic 返回空数组。 */
export function orderedSubtopics(topic: string, qs: Question[]): string[] {
  const bases = BASE_SUBTOPIC_ORDER[topic];
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
 *  按 TOPIC_ORDER → 有子主题的大类逐 subtopic、无子主题的大类整体一条。
 *  用于 Practice 完成 summary 的"下一题集"跳转：给定当前 (topic, subtopic) 找下一个。
 *  每条 { topic, subtopic }（subtopic='' 表示无子主题的大类整体）。 */
export function buildAtomicOrder(qs: Question[]): { topic: string; subtopic: string }[] {
  const out: { topic: string; subtopic: string }[] = [];
  for (const topic of TOPIC_ORDER) {
    const subs = orderedSubtopics(topic, qs);
    if (subs.length > 0) {
      for (const subtopic of subs) out.push({ topic, subtopic });
    } else if (qs.some((q) => q.topic === topic)) {
      out.push({ topic, subtopic: '' });
    }
  }
  // 兜底：TOPIC_ORDER 未列出的 topic（用户自定义主题）按字母序追加
  const extras = new Set(
    qs.map((q) => q.topic).filter((t): t is string => !!t && !TOPIC_ORDER.includes(t))
  );
  for (const topic of [...extras].sort()) {
    const subs = orderedSubtopics(topic, qs);
    if (subs.length > 0) {
      for (const subtopic of subs) out.push({ topic, subtopic });
    } else {
      out.push({ topic, subtopic: '' });
    }
  }
  return out;
}

/** 题集显示名：去掉子主题前缀（如 'git-basics·工作流' → '工作流'）；无子主题时用大类名。 */
export function atomicLabel(topic: string, subtopic: string): string {
  if (!subtopic) return topic;
  // 兼容多种前缀写法：'TOPIC·sub'、'TOPIC:sub'、'TOPIC-sub'
  return subtopic.replace(/^[^·:-]+[·:-]/, '');
}
