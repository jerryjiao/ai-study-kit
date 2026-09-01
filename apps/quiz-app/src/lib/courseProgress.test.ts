import { describe, it, expect } from 'vitest';
import { emptyProgress, markCourseRead, isCourseRead, mergeProgress } from './progress';
import { applyCourseEvent, practiceTopicForLesson } from './courseProgress';
import type { Progress } from '../types';

/** 课已学完（显式确认制）三断言——新旧行为分水岭，必须钉死：
 *  1. 点击「学完了」→ 该课进入学完进度；
 *  2. 再点一次 → 撤销（移出学完进度，且经同步合并后不复活）；
 *  3. 仅打开课程页 → progress 数据零变化（旧版「打开即自动记已读」已移除）。
 *  全部在数据层（Progress 纯函数）断言外部行为，不测组件实现细节。 */

describe('课已学完（显式确认制）三断言', () => {
  const THEME = 'demo';

  it('点击「学完了」→ 该课进入学完进度', () => {
    const p0 = emptyProgress();
    const p1 = applyCourseEvent(p0, { kind: 'doneToggle', theme: THEME, file: 'a.html' }, 100);
    expect(isCourseRead(p1, THEME, 'a.html')).toBe(true);
    expect(p1.coursesRead?.[`${THEME}/a.html`]).toBe(100);
  });

  it('再点一次 → 撤销：移出学完进度，且同步合并后不复活', () => {
    let p = applyCourseEvent(emptyProgress(), { kind: 'doneToggle', theme: THEME, file: 'a.html' }, 100);
    p = applyCourseEvent(p, { kind: 'doneToggle', theme: THEME, file: 'a.html' }, 200); // 再点 = 撤销
    expect(isCourseRead(p, THEME, 'a.html')).toBe(false);
    // 撤销必须穿过同步机制持久化：服务器旧快照仍带早先的学完记录（无墓碑），
    // read-merge-write 下直接删 key 会被旧快照补回——墓碑必须赢
    const staleRemote = markCourseRead(emptyProgress(), THEME, 'a.html', 100);
    const merged = mergeProgress(p, staleRemote);
    expect(isCourseRead(merged, THEME, 'a.html')).toBe(false);
  });

  it('仅打开课程页 → progress 数据零变化（新旧行为分水岭）', () => {
    const fresh = emptyProgress();
    expect(applyCourseEvent(fresh, { kind: 'open', theme: THEME, file: 'a.html' })).toBe(fresh);
    // 已有其他课学完记录时，打开（含课站内链导航、回到目录 file=null）同样零变化
    const withDone = applyCourseEvent(fresh, { kind: 'doneToggle', theme: THEME, file: 'b.html' }, 100);
    expect(applyCourseEvent(withDone, { kind: 'open', theme: THEME, file: 'a.html' })).toBe(withDone);
    expect(applyCourseEvent(withDone, { kind: 'open', theme: THEME, file: null })).toBe(withDone);
  });
});

describe('课已学完：撤销与跨设备合并', () => {
  const THEME = 'demo';
  const dt = (file: string, at: number) =>
    ({ kind: 'doneToggle', theme: THEME, file }) as const;

  it('撤销后再点「学完了」→ 重新记入（新时间戳新于墓碑，自然复活）', () => {
    let p = applyCourseEvent(emptyProgress(), dt('a.html', 100), 100);
    p = applyCourseEvent(p, dt('a.html', 200), 200); // 撤销
    expect(isCourseRead(p, THEME, 'a.html')).toBe(false);
    p = applyCourseEvent(p, dt('a.html', 300), 300); // 重新学完
    expect(isCourseRead(p, THEME, 'a.html')).toBe(true);
  });

  it('跨设备：撤销墓碑旧于另一设备的新学完标记 → 学完胜出（LWW）', () => {
    const deviceA = applyCourseEvent(
      applyCourseEvent(emptyProgress(), dt('a.html', 100), 100),
      dt('a.html', 200),
      200,
    ); // A：学完@100 → 撤销@200
    const deviceB = markCourseRead(emptyProgress(), THEME, 'a.html', 300); // B：学完@300
    expect(isCourseRead(mergeProgress(deviceA, deviceB), THEME, 'a.html')).toBe(true);
    expect(isCourseRead(mergeProgress(deviceB, deviceA), THEME, 'a.html')).toBe(true);
  });

  it('迁移兼容：旧 coursesRead 数据（无墓碑）视为已确认保留，不清零', () => {
    const legacy: Progress = {
      version: 1,
      answers: {},
      coursesRead: { [`${THEME}/a.html`]: 5, [`${THEME}/b.html`]: 6 },
    };
    expect(isCourseRead(legacy, THEME, 'a.html')).toBe(true);
    expect(isCourseRead(legacy, THEME, 'b.html')).toBe(true);
    // 对别的课做显式操作不影响既有历史数据
    const p = applyCourseEvent(legacy, dt('c.html', 100), 100);
    expect(p.coursesRead?.[`${THEME}/a.html`]).toBe(5);
    expect(p.coursesRead?.[`${THEME}/b.html`]).toBe(6);
    expect(isCourseRead(p, THEME, 'a.html')).toBe(true);
    // 与空快照 merge 也不丢（旧数据经同步链路原样保留）
    expect(isCourseRead(mergeProgress(legacy, emptyProgress()), THEME, 'a.html')).toBe(true);
  });
});

describe('「去刷这课的题」：题集解析（确定性，无模糊匹配）', () => {
  const bankTopics = ['git-basics', 'linux-commands', 'sd-system'];

  it('课程清单显式 topic（theme-config lessonTopics 声明）→ 用显式映射', () => {
    expect(practiceTopicForLesson({ file: '01-system.html', topic: 'sd-system' }, bankTopics)).toBe('sd-system');
  });

  it('无显式映射时：文件名（去 .html）与题库 topic 同名 → 直连（零配置约定）', () => {
    expect(practiceTopicForLesson({ file: 'git-basics.html' }, bankTopics)).toBe('git-basics');
  });

  it('解析不出对应题集 → null（不造错误链接）', () => {
    expect(practiceTopicForLesson({ file: '01-system.html' }, bankTopics)).toBe(null);
    // 显式映射指向题库不存在的 topic（配置漂移）→ 同样拒绝，不产死链
    expect(practiceTopicForLesson({ file: 'a.html', topic: 'not-in-bank' }, bankTopics)).toBe(null);
  });
});
