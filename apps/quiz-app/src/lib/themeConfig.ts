import type { LucideIcon } from 'lucide-react';
import {
  Boxes,
  Layers,
  BookOpen,
  Shuffle,
  Timer,
  Cpu,
  AppWindow,
  Globe,
  ShieldCheck,
  Database,
  Workflow,
  GitBranch,
  Shapes,
  Binary,
  Code2,
  Gauge,
  Cloud,
  FlaskConical,
  History,
  ListChecks,
  Repeat,
  Sparkles,
  Lock,
} from 'lucide-react';
import raw from '../data/theme-config.json';

/** 层：题目的学习优先级属性（核心=必做 / 拓展=弱区加练），由 source 派生。
 *  呈现为答题卡徽标 + 练习页筛选 chip，不占导航维度。 */
export type Layer = '核心' | '拓展';

/** 主题显示配置——examples/&lt;theme&gt;/theme-config.json（sync-examples 拷到 src/data/，同步产物禁手编）。
 *  全字段可选，缺什么回退什么：无 labels → 原样显示 topic id；无 topicOrder → 未列出的大类按字母序；
 *  无 subtopics → 不展开子主题；无 sourceLabels → 原样显示 source；无 sourceLayers → layerOf 返回 null、
 *  所有题算计划内；无 topicStyles → 默认样式；无 layerTopics → 无任何主题有层概念。
 *  字段语义与示例见 docs/theming.md。允许 $comment 等说明键（读取侧忽略未知键）。 */
export interface ThemeConfig {
  topicLabels?: Record<string, string>;
  /** 大类学习顺序（由浅入深）；未列出的 topic 落末尾按字母序 */
  topicOrder?: string[];
  /** 考点深度序的 subtopic 全名表（含分块后缀"一/二"） */
  subtopics?: Record<string, string[]>;
  sourceLabels?: Record<string, string>;
  sourceLayers?: Record<string, Layer>;
  /** subtopic 显示名（剥分块后缀后）→ 掌握/理解/了解 */
  epDepth?: Record<string, '掌握' | '理解' | '了解'>;
  topicStyles?: Record<string, { cls: string; childCls: string; icon: string }>;
  /** 有层概念的大类清单（练习页层 chips / 首页深度徽标的作用域）；缺省 = 无 */
  layerTopics?: string[];
  /** 课 → 题集直达映射（可选）："<lesson文件名>" → 题库 topic id。
   *  sync-examples 把命中项写进 courses.json 每节课的 topic 字段；课程页学完一课后
   *  「去刷这课的题」按它直达对应题集。缺省时课程页回退「文件名与 topic 同名」约定，
   *  再解析不出就不渲染跳转（见 lib/courseProgress.practiceTopicForLesson）。 */
  lessonTopics?: Record<string, string>;
}

export const themeConfig = raw as ThemeConfig;

/** topicStyles.icon 的字符串名 → lucide 组件。配置是 JSON 数据、图标是代码组件，此表是两者的桥。
 *  只收录白名单图标（tree-shaking 只打包用到的）；未知名回退 Boxes。扩充映射 = 改这里。 */
const ICON_MAP: Record<string, LucideIcon> = {
  Boxes,
  Layers,
  BookOpen,
  Shuffle,
  Timer,
  Cpu,
  AppWindow,
  Globe,
  ShieldCheck,
  Database,
  Workflow,
  GitBranch,
  Shapes,
  Binary,
  Code2,
  Gauge,
  Cloud,
  FlaskConical,
  History,
  ListChecks,
  Repeat,
  Sparkles,
  Lock,
};

export function iconFor(name: string | undefined): LucideIcon {
  return (name && ICON_MAP[name]) || Boxes;
}

/** 有层概念的大类（Practice 层 chips、Home 深度徽标的渲染作用域）。无配置 = 空表 = 现状回退。 */
export const LAYER_TOPICS: readonly string[] = themeConfig.layerTopics ?? [];
