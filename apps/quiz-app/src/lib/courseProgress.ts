import type { Progress } from '../types';
import { isCourseRead, markCourseRead, unmarkCourseRead } from './progress';

/** 课已学完（显式确认制）——课程页 UI 事件 → Progress 数据的唯一写路径。
 *
 *  背景（进度失真修复）：旧版课程页「打开即自动记已读」（iframe 每次加载命中清单就写
 *  coursesRead），路过就算学过，完成边界失真。现改为显式确认：
 *  用户点「✓ 学完了」才算（再点撤销），打开本身零写入。
 *
 *  把「事件 → 数据」的映射收在纯函数而非组件内联，是为了让三条外部行为断言
 *  可以在数据层钉死（courseProgress.test.ts）：
 *  点击记入 / 再点撤销（含同步合并后不复活）/ 仅打开零变化（新旧分水岭）。 */
export type CourseEvent =
  /** 打开课程页或课站内链导航到某课（file=null 表示回到目录/参考页）。只更新高亮，零写入。 */
  | { kind: 'open'; theme: string; file: string | null }
  /** 点击「✓ 学完了」按钮：未学完 → 记入；已学完 → 撤销（done 状态从 p 推导，调用方不用传）。 */
  | { kind: 'doneToggle'; theme: string; file: string };

/** 应用一个课程页事件。返回同一引用 = 数据零变化（「打开」恒如此），
 *  调用方（useProgress）据此天然 no-op：不置 dirty、不触发同步 POST。 */
export function applyCourseEvent(p: Progress, ev: CourseEvent, now = Date.now()): Progress {
  if (ev.kind === 'open') return p; // 分水岭：打开零写入
  if (!ev.file) return p;
  return isCourseRead(p, ev.theme, ev.file)
    ? unmarkCourseRead(p, ev.theme, ev.file, now)
    : markCourseRead(p, ev.theme, ev.file, now);
}

/** 「去刷这课的题」跳转解析：lesson → 题库 topic id；null = 解析不出，调用方不渲染跳转。
 *  解析链（全确定性，无模糊匹配）：
 *  1. courses.json 里该课的显式 topic 字段——由 sync-examples 从主题包 theme-config.json
 *     的 lessonTopics（"<lesson文件名>" → topic id）带入，主题作者的权威声明；
 *  2. 文件名（去 .html）恰与题库某 topic 同名 → 直连（零配置约定）；
 *  3. 否则 null——宁可不跳，不造错误链接。两条路径都要求 topic 真实存在于题库。 */
export function practiceTopicForLesson(
  lesson: { file: string; topic?: string },
  bankTopics: readonly string[],
): string | null {
  const bank = new Set(bankTopics);
  if (lesson.topic && bank.has(lesson.topic)) return lesson.topic;
  const basename = lesson.file.replace(/\.html?$/, '');
  return bank.has(basename) ? basename : null;
}
