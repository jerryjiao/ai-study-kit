import { describe, it, expect } from 'vitest';
import { emptyProgress, applyAnswer, applySrs, computeStats, computeListStats, wrongIds, mergeProgress, markRead, readIds, readCount, nextStreak, nextWrongCount, streakToPass, resetWrong, resetRead, resetSrs, resetAnswersByIds, resetReadByIds, noteNewCard, newCardsToday, dayKey, isAnswerDeleted, isCardDeleted, isRead, isFromRandom, markCourseRead, isCourseRead } from './progress';
import type { Question, Progress, SrsState } from '../types';

const qs: Question[] = [
  { id: 'q1', source: 's', type: 'single', question: 'a', options: { A: 'a', B: 'b' }, answer: ['A'] },
  { id: 'q2', source: 's', type: 'single', question: 'b', options: { A: 'a', B: 'b' }, answer: ['B'] },
  { id: 'q3', source: 's', type: 'single', question: 'c', options: { A: 'a', B: 'b' }, answer: [], autoGradable: false },
];

describe('progress', () => {
  it('emptyProgress', () => {
    expect(emptyProgress()).toEqual({ version: 1, answers: {}, read: {} });
  });
  it('applyAnswer 写入记录', () => {
    const p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });
    expect(p.answers['q1']).toEqual({ selected: ['A'], correct: true, submittedAt: 1 });
  });
  it('computeStats 统计（自评题不计入分母）', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 2 });
    p = applyAnswer(p, 'q3', { selected: ['A'], correct: null, submittedAt: 3 });
    const s = computeStats(p, qs);
    expect(s).toEqual({ total: 3, answered: 3, correct: 1, wrong: 1, accuracy: 0.5 });
  });
  it('wrongIds 返回判错题', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0 });
    expect(wrongIds(p)).toEqual(['q2']);
  });
  it('mergeProgress: 服务器更新时按 submittedAt 取新', () => {
    const local = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 5 });
    const remote = applyAnswer(emptyProgress(), 'q1', { selected: ['B'], correct: false, submittedAt: 10 });
    expect(mergeProgress(local, remote).answers['q1'].correct).toBe(false);
  });
  it('mergeProgress: 本地新于服务器时保留本地', () => {
    const local = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 20 });
    const remote = applyAnswer(emptyProgress(), 'q1', { selected: ['B'], correct: false, submittedAt: 10 });
    expect(mergeProgress(local, remote).answers['q1'].correct).toBe(true);
  });
  it('markRead 记录已看且去重', () => {
    const p1 = markRead(emptyProgress(), 'q1');
    expect(readIds(p1)).toEqual(['q1']);
    const p2 = markRead(p1, 'q1'); // 重复标记不增加
    expect(readIds(p2)).toEqual(['q1']);
  });
  it('readCount 仅统计题库内已看题', () => {
    let p = markRead(emptyProgress(), 'q1');
    p = markRead(p, 'stale-id'); // 题库不存在
    expect(readCount(p, qs)).toBe(1);
  });
  it('computeStats 不受 read 影响', () => {
    let p = markRead(emptyProgress(), 'q1');
    const s = computeStats(p, qs);
    expect(s.answered).toBe(0); // read 不计入已答
    expect(s.accuracy).toBe(0);
  });
  // 总结态正确率接缝：传入子集 list 时统计限定在该子集（而非全库），
  // 用于「答完一个 topic 显示该 topic 累计正确率」。自评题仍不计入分母。
  it('computeStats 子集：限定 list 范围（总结态正确率来源）', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 2 });
    p = applyAnswer(p, 'q3', { selected: ['A'], correct: null, submittedAt: 3 });  // 自评
    // 只看 [q1,q2] 子集：answered=2/graded=2/correct=1，正确率 0.5（q3 自评被排除）
    const sub = computeStats(p, qs.slice(0, 2));
    expect(sub).toEqual({ total: 2, answered: 2, correct: 1, wrong: 1, accuracy: 0.5 });
    // 「本子集是否全答过」= answered === list.length（用于「完成答题」按钮可点判定）
    expect(sub.answered === 2).toBe(true);
    // 未全答的子集：只答了 q1
    const partial = computeStats(p, [qs[0]]);  // [q1]
    expect(partial.answered).toBe(1);
    // 一个空答的子集：q 都没答（用 q3 外的新 id 构造不了，改用全空的 progress）
    const emptySub = computeStats(emptyProgress(), qs.slice(0, 2));
    expect(emptySub.answered).toBe(0);
    expect(emptySub.accuracy).toBe(0);  // graded=0 时 accuracy 兜底为 0，不产生 NaN
  });
  it('mergeProgress: read 按时间戳取新', () => {
    const a: Progress = { version: 1, answers: {}, read: { q1: 5, q2: 20 } };
    const b: Progress = { version: 1, answers: {}, read: { q1: 10, q3: 30 } };
    const m = mergeProgress(a, b);
    expect(m.read).toEqual({ q1: 10, q2: 20, q3: 30 });
  });
  it('mergeProgress: 单边无 read 字段时取存在者', () => {
    const a: Progress = { version: 1, answers: {}, read: { q1: 5 } };
    const b: Progress = { version: 1, answers: {} }; // 旧数据无 read
    expect(mergeProgress(a, b).read).toEqual({ q1: 5 });
    expect(mergeProgress(b, a).read).toEqual({ q1: 5 });
    expect(mergeProgress({ version: 1, answers: {} } as Progress, { version: 1, answers: {} } as Progress).read).toEqual({});
  });

  // 学习偏好（设置面板）：整体对象按 settingsUpdatedAt LWW，同 theme 模式
  it('mergeProgress: settings 整体按 settingsUpdatedAt 取新', () => {
    const a: Progress = { version: 1, answers: {}, settings: { extOn: true, dailyNewCards: 10 }, settingsUpdatedAt: 100 };
    const b: Progress = { version: 1, answers: {}, settings: { extOn: false, autoAdvance: false }, settingsUpdatedAt: 200 };
    const m = mergeProgress(a, b);
    expect(m.settings).toEqual({ extOn: false, autoAdvance: false }); // 整份胜出，不逐字段合并
    expect(m.settingsUpdatedAt).toBe(200);
    // 参数位置不影响结果：200 仍是较新时间戳，交换后 b 依旧胜出
    expect(mergeProgress(b, a).settings).toEqual({ extOn: false, autoAdvance: false });
  });
  it('mergeProgress: 单边无 settings 时取存在者（旧数据兼容）', () => {
    const a: Progress = { version: 1, answers: {}, settings: { extOn: true }, settingsUpdatedAt: 50 };
    const b: Progress = { version: 1, answers: {} };
    expect(mergeProgress(a, b).settings).toEqual({ extOn: true });
    expect(mergeProgress(b, a).settings).toEqual({ extOn: true });
    expect(mergeProgress(a, b).settingsUpdatedAt).toBe(50);
  });
  it('mergeProgress: 相同时间戳时取 local/a（与 answers >= 口径一致）', () => {
    const a: Progress = { version: 1, answers: {}, settings: { extOn: true }, settingsUpdatedAt: 100 };
    const b: Progress = { version: 1, answers: {}, settings: { extOn: false }, settingsUpdatedAt: 100 };
    expect(mergeProgress(a, b).settings).toEqual({ extOn: true });
  });

  it('nextStreak: 答错归0入错题，错题答对累加，从未答错的题答对不维护', () => {
    expect(nextStreak(false, undefined)).toBe(0);     // 首次答错 → 入错题集 streak=0
    expect(nextStreak(false, 2)).toBe(0);             // 错题又答错 → 归0
    expect(nextStreak(true, undefined)).toBeUndefined(); // 从未答错的题答对 → 非错题
    expect(nextStreak(true, 0)).toBe(1);              // 错题答对 → 1
    expect(nextStreak(true, 2)).toBe(3);              // 错题连对 → 3（掌握）
    expect(nextStreak(null, 1)).toBe(1);              // 自评 → 保持原 streak
    expect(nextStreak(null, undefined)).toBeUndefined();
  });

  it('nextWrongCount: 答错累加（只增不减），答对/自评保持原值', () => {
    expect(nextWrongCount(false, undefined)).toBe(1); // 首次答错 → 1
    expect(nextWrongCount(false, 1)).toBe(2);         // 又答错 → 2
    expect(nextWrongCount(false, 5)).toBe(6);         // 多次答错持续累加
    expect(nextWrongCount(true, 3)).toBe(3);          // 答对 → 保持
    expect(nextWrongCount(true, undefined)).toBeUndefined(); // 从未答错的题答对 → 仍 undefined
    expect(nextWrongCount(null, 2)).toBe(2);          // 自评 → 保持原值
    expect(nextWrongCount(null, undefined)).toBeUndefined(); // 自评 + 从未答错 → 仍 undefined
  });

  // —— 随机20题沙盒（fromRandom）：答错进错题本但不计主进度统计 ——
  // 语义：随机练习是纯沙盒自测，对/自评不写记录；答错写一条带 fromRandom 的记录 →
  // 进错题本（wrongIds 保留），但 computeStats/覆盖明细/"上次答到"都跳过。
  // isFromRandom：墓碑记录不算（已删），与 isAnswerDeleted 口径一致。
  it('isFromRandom: fromRandom 且非墓碑才为 true', () => {
    expect(isFromRandom({ selected: ['A'], correct: false, submittedAt: 1, fromRandom: true })).toBe(true);
    expect(isFromRandom({ selected: ['A'], correct: false, submittedAt: 1 })).toBe(false);              // 普通记录
    expect(isFromRandom({ selected: [], correct: null, submittedAt: 1, deletedAt: 1, fromRandom: true })).toBe(false); // 墓碑不算
    expect(isFromRandom(undefined)).toBe(false);
  });

  it('computeStats: fromRandom 记录不计入主进度（已答%/正确率都不含）', () => {
    // q2 在随机模式答错：写了 fromRandom + streak=0，应当进错题本但不进主统计
    let p = applyAnswer(emptyProgress(), 'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0, fromRandom: true });
    const s = computeStats(p, qs);
    expect(s.answered).toBe(0);   // fromRandom 不计入已答
    expect(s.wrong).toBe(0);      // 不计入 wrong 计数
    expect(s.accuracy).toBe(0);
  });

  // —— computeListStats：列表口径（Practice 页头部分子 / canFinish / 完成总结共用）——
  // 与 computeStats 的唯一区别：fromRandom 记录计入 answered/对错。保证"头部 n/n 全答
  // → 完成按钮必出总结"两端同口径，不再出现死点击（2026-08-17 踩过）。
  it('computeListStats: fromRandom 记录计入列表已答与对错（与头部 answeredInList 同口径）', () => {
    // q1 普通答对 + q2 随机沙盒答错（fromRandom）
    const p = applyAnswer(applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 }),
      'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0, fromRandom: true });
    const s = computeListStats(p, qs);
    expect(s.answered).toBe(2);              // 沙盒记录也算"已答"（列表里它就是已作答态）
    expect(s.correct).toBe(1);
    expect(s.wrong).toBe(1);
    expect(s.accuracy).toBe(0.5);
    // 主进度口径不变：仍是 1 已答 0 错（沙盒不污染首页统计）
    expect(computeStats(p, qs).answered).toBe(1);
    expect(computeStats(p, qs).wrong).toBe(0);
  });

  it('computeListStats: 墓碑记录仍视为未答（与 computeStats 一致）', () => {
    const p = applyAnswer(applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 }),
      'q1', { selected: ['A'], correct: true, submittedAt: 2, deletedAt: 3 });
    expect(computeListStats(p, qs).answered).toBe(0);
  });

  it('wrongIds: fromRandom 错题【保留】在错题集（进错题本）', () => {
    // 随机答错的题要在错题重练里复习，故 wrongIds 不过滤 fromRandom
    const p = applyAnswer(emptyProgress(), 'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0, fromRandom: true });
    expect(wrongIds(p)).toEqual(['q2']);  // 在错题集
    expect(wrongIds(p, qs)).toEqual(['q2']); // 题库内也在
  });

  it('随机沙盒混合场景：答对不写 / 答错写 fromRandom / 已答%仍为 0 / 错题本有 1', () => {
    // q1 随机答对 → 不写记录（Practice onSubmit 早退）；这里直接构造"无 q1 记录"模拟
    // q2 随机答错 → 写 fromRandom 记录
    const p = applyAnswer(emptyProgress(), 'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0, fromRandom: true });
    // 主进度：已答 0%（沙盒不污染），但错题本有 1 道
    expect(computeStats(p, qs).answered).toBe(0);
    expect(wrongIds(p, qs)).toEqual(['q2']);
  });

  it('streakToPass: 阈值随 wrongCount 阶梯递增到 3 封顶', () => {
    expect(streakToPass(0)).toBe(1);    // 未错过（兜底）
    expect(streakToPass(1)).toBe(1);    // 错过 1 次 → 连对 1 次
    expect(streakToPass(2)).toBe(2);    // 错过 2 次 → 连对 2 次
    expect(streakToPass(3)).toBe(3);    // 错过 3 次 → 连对 3 次（硬骨头）
    expect(streakToPass(5)).toBe(3);    // 封顶，不再增加
    expect(streakToPass(99)).toBe(3);
  });

  it('wrongIds: 阈值按 wrongCount 自适应（老记录无 wrongCount 按 1 兜底）', () => {
    // 老记录：streak 被维护但无 wrongCount 字段 → 按 wrongCount=1 处理，streak=1 即移出
    let p = applyAnswer(emptyProgress(), 'q2', { selected: ['A'], correct: false, submittedAt: 1, streak: 0 });
    expect(wrongIds(p)).toEqual(['q2']);                 // streak=0 < 1 → 在
    p = applyAnswer(p, 'q2', { selected: ['B'], correct: true, submittedAt: 2, streak: 1 });
    expect(wrongIds(p)).toEqual([]);                     // streak=1 ≥ 1 → 移出
    // 又答错 streak=0 → 回到错题集
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 3, streak: 0 });
    expect(wrongIds(p)).toEqual(['q2']);
  });

  it('wrongIds: wrongCount=2 需连对 2 次，wrongCount=3 需连对 3 次', () => {
    // wrongCount=2 的题：streak=1 仍在，streak=2 才移出
    let p1 = applyAnswer(emptyProgress(), 'a', { selected: ['A'], correct: false, submittedAt: 1, streak: 0, wrongCount: 2 });
    expect(wrongIds(p1)).toEqual(['a']);
    p1 = applyAnswer(p1, 'a', { selected: ['B'], correct: true, submittedAt: 2, streak: 1, wrongCount: 2 });
    expect(wrongIds(p1)).toEqual(['a']);                 // streak=1 < 2 → 仍在
    p1 = applyAnswer(p1, 'a', { selected: ['B'], correct: true, submittedAt: 3, streak: 2, wrongCount: 2 });
    expect(wrongIds(p1)).toEqual([]);                    // streak=2 ≥ 2 → 移出

    // wrongCount=3 的题：streak=2 仍在，streak=3 才移出
    let p2 = applyAnswer(emptyProgress(), 'b', { selected: ['A'], correct: false, submittedAt: 1, streak: 0, wrongCount: 3 });
    p2 = applyAnswer(p2, 'b', { selected: ['B'], correct: true, submittedAt: 2, streak: 2, wrongCount: 3 });
    expect(wrongIds(p2)).toEqual(['b']);                 // streak=2 < 3 → 仍在
    p2 = applyAnswer(p2, 'b', { selected: ['B'], correct: true, submittedAt: 3, streak: 3, wrongCount: 3 });
    expect(wrongIds(p2)).toEqual([]);                    // streak=3 ≥ 3 → 移出
  });

  it('wrongIds: 从未答错的题(streak 未维护)不在错题集', () => {
    const p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });
    expect(wrongIds(p)).toEqual([]);
  });

  it('wrongIds: 自评题(streak 未维护)不在错题集', () => {
    const p = applyAnswer(emptyProgress(), 'q3', { selected: ['A'], correct: null, submittedAt: 1 });
    expect(wrongIds(p)).toEqual([]);
  });

  it('wrongIds: 传 questions 时过滤题库已删除的陈旧 id', () => {
    // q2 答错在错题集；stale-id 也答错但已从题库移除
    let p = applyAnswer(emptyProgress(), 'q2', { selected: ['A'], correct: false, submittedAt: 1, streak: 0 });
    p = applyAnswer(p, 'stale-id', { selected: ['A'], correct: false, submittedAt: 2, streak: 0 });
    // 不传 questions：全部返回（含陈旧）
    expect(wrongIds(p).sort()).toEqual(['q2', 'stale-id']);
    // 传 questions：只返回题库内仍存在的
    expect(wrongIds(p, qs)).toEqual(['q2']);
  });

  it('resetWrong: 对错题打墓碑（保留从未答错的答题记录），读端视为已删', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 1 });          // 从未答错，保留
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 2, streak: 0 });                // 错题，打墓碑
    p = resetWrong(p, 100);
    expect(p.answers['q1']).toBeDefined();
    expect(p.answers['q1'].correct).toBe(true);                  // 未答错的记录原样保留
    // q2 不再是 undefined，而是墓碑记录（deletedAt=100）——墓碑让 writeProgress merge 时删除能持久化
    expect(p.answers['q2'].deletedAt).toBe(100);
    expect(isAnswerDeleted(p.answers['q2'])).toBe(true);
    expect(wrongIds(p)).toEqual([]);                             // 读端过滤墓碑，错题集为空
  });

  it('resetRead: 打墓碑（readTombstones），读端视为未看', () => {
    let p = markRead(emptyProgress(), 'q1');
    p = markRead(p, 'q2');
    // 墓碑时间须 > read 时间戳（Date.now()），读端 isRead 才判定为已删
    const tombTime = Date.now() + 1000;
    p = resetRead(p, tombTime);
    // read 本身保留（防 merge 补回），但 readTombstones 记录删除意图
    expect(p.readTombstones?.q1).toBe(tombTime);
    expect(p.readTombstones?.q2).toBe(tombTime);
    expect(readIds(p)).toEqual([]);                              // 读端过滤后视为未看
    expect(p.answers).toEqual({});                               // 答题不受影响
  });

  // —— 闪卡 SRS ——
  const srs = (over: Partial<SrsState>): SrsState => ({ ease: 2.5, interval: 1, reps: 1, due: 100, updatedAt: 100, phase: 'review', stepIdx: 0, lapses: 0, ...over });

  it('applySrs 写入卡的 SRS 状态', () => {
    const p = applySrs(emptyProgress(), 'FC-001', srs({ interval: 6, reps: 2 }));
    expect(p.srs?.['FC-001']).toEqual(srs({ interval: 6, reps: 2 }));
  });

  it('applySrs 不影响其他卡', () => {
    let p = applySrs(emptyProgress(), 'FC-001', srs({ updatedAt: 1 }));
    p = applySrs(p, 'FC-002', srs({ updatedAt: 2 }));
    expect(p.srs?.['FC-001'].updatedAt).toBe(1);
    expect(p.srs?.['FC-002'].updatedAt).toBe(2);
  });

  it('mergeProgress: srs 按 updatedAt 取新', () => {
    const a: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 5, interval: 1 }) } };
    const b: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 10, interval: 6 }) } };
    expect(mergeProgress(a, b).srs?.['FC-001'].interval).toBe(6);  // 取 updatedAt 新的 b
  });

  it('mergeProgress: srs 单边缺失时取存在者', () => {
    const a: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 5 }) } };
    const b: Progress = { version: 1, answers: {} };  // 老 progress 无 srs 字段
    expect(mergeProgress(a, b).srs?.['FC-001'].updatedAt).toBe(5);
    expect(mergeProgress(b, a).srs?.['FC-001'].updatedAt).toBe(5);
  });

  it('mergeProgress: srs 两边都无时返回 undefined（向后兼容）', () => {
    const a: Progress = { version: 1, answers: {} };
    const b: Progress = { version: 1, answers: {} };
    const m = mergeProgress(a, b);
    expect(m.srs).toEqual({});  // mergeSrs 返回空对象
  });

  // —— 每日新卡配额（srsMeta）——
  const DAY0 = new Date(2026, 6, 5, 12, 0, 0).getTime();   // 2026-07-05 本地正午（固定基准）
  const DAY1 = new Date(2026, 6, 6, 12, 0, 0).getTime();   // 次日正午
  const k = (t: number) => dayKey(t);

  it('newCardsToday: 无 srsMeta 时返回 0（向后兼容旧数据）', () => {
    expect(newCardsToday(emptyProgress(), DAY0)).toBe(0);
  });

  it('noteNewCard: 同日累加、跨天归零重计', () => {
    let p = noteNewCard(emptyProgress(), DAY0);
    expect(p.srsMeta).toEqual({ newToday: 1, newTodayDate: k(DAY0) });
    p = noteNewCard(p, DAY0);
    expect(p.srsMeta?.newToday).toBe(2);
    // 跨天：归零为 1，日期更新
    p = noteNewCard(p, DAY1);
    expect(p.srsMeta).toEqual({ newToday: 1, newTodayDate: k(DAY1) });
  });

  it('newCardsToday: 跨天后旧计数作废，返回 0', () => {
    let p = noteNewCard(emptyProgress(), DAY0);
    p = noteNewCard(p, DAY0);  // 今日 2 张
    expect(newCardsToday(p, DAY0)).toBe(2);
    // 次日查询：昨日计数不计入"今日"
    expect(newCardsToday(p, DAY1)).toBe(0);
  });

  it('resetSrs: 对所有卡打墓碑 + srsMeta 清零（读端 isCardDeleted 视为新卡）', () => {
    let p = applySrs(emptyProgress(), 'FC-001', srs({ updatedAt: 5 }));
    p = noteNewCard(p, DAY0);
    expect(p.srsMeta).toBeDefined();
    p = resetSrs(p, 100);
    // srs 卡保留但带墓碑（防 merge 补回），isCardDeleted 判定为已删
    expect(p.srs?.['FC-001'].deletedAt).toBe(100);
    expect(isCardDeleted(p.srs?.['FC-001'])).toBe(true);
    expect(p.srsMeta).toBeUndefined();
    expect(newCardsToday(p, DAY0)).toBe(0);
  });

  it('mergeProgress: srsMeta 同日取 newToday 较大者（两设备各学几张取并集）', () => {
    const a: Progress = { version: 1, answers: {}, srsMeta: { newToday: 3, newTodayDate: k(DAY0) } };
    const b: Progress = { version: 1, answers: {}, srsMeta: { newToday: 5, newTodayDate: k(DAY0) } };
    expect(mergeProgress(a, b).srsMeta?.newToday).toBe(5);
  });

  it('mergeProgress: srsMeta 不同日取日期较新者（YYYY-MM-DD 字典序=时间序）', () => {
    const a: Progress = { version: 1, answers: {}, srsMeta: { newToday: 9, newTodayDate: k(DAY0) } };
    const b: Progress = { version: 1, answers: {}, srsMeta: { newToday: 1, newTodayDate: k(DAY1) } };
    const m = mergeProgress(a, b);
    expect(m.srsMeta?.newTodayDate).toBe(k(DAY1));
    expect(m.srsMeta?.newToday).toBe(1);
  });

  it('mergeProgress: 单边无 srsMeta 时取存在者（向后兼容）', () => {
    const a: Progress = { version: 1, answers: {}, srsMeta: { newToday: 4, newTodayDate: k(DAY0) } };
    const b: Progress = { version: 1, answers: {} };
    expect(mergeProgress(a, b).srsMeta?.newToday).toBe(4);
    expect(mergeProgress(b, a).srsMeta?.newToday).toBe(4);
    expect(mergeProgress({ version: 1, answers: {} } as Progress, { version: 1, answers: {} } as Progress).srsMeta).toBeUndefined();
  });

  // —— 墓碑删除（tombstone）：修复「重做本题集」等 reset 操作在 read-merge-write 下失效 ——
  // 根因：writeProgress 合并时取 answers 并集，删 key 会被旧快照补回。墓碑让"删除意图"
  // 携带时间戳参与 merge 定序，删除才持久化到磁盘。

  it('resetAnswersByIds: 命中题打墓碑（保留其他题），读端视为已删', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 10 });
    p = applyAnswer(p, 'q2', { selected: ['A'], correct: false, submittedAt: 20, streak: 0 });
    p = applyAnswer(p, 'q3', { selected: ['B'], correct: true, submittedAt: 30 });
    p = resetAnswersByIds(p, ['q1', 'q2'], 100);
    expect(isAnswerDeleted(p.answers['q1'])).toBe(true);
    expect(isAnswerDeleted(p.answers['q2'])).toBe(true);
    expect(isAnswerDeleted(p.answers['q3'])).toBe(false);  // 不在 id 集合，保留
    expect(p.answers['q3'].correct).toBe(true);
    // 读端：computeStats 跳过墓碑
    expect(computeStats(p, qs).answered).toBe(1);
    expect(wrongIds(p)).toEqual([]);
  });

  it('resetAnswersByIds: 命中但本就无记录的 id 也打墓碑（防服务器旧快照补回）', () => {
    // q1 无记录，但 resetAnswersByIds 也要给它打墓碑——否则服务器磁盘有 q1 旧记录时 merge 会补回
    const p = resetAnswersByIds(emptyProgress(), ['q1'], 100);
    expect(p.answers['q1'].deletedAt).toBe(100);
  });

  it('mergeProgress: 墓碑新于记录 → 删除生效（修复「重做本题集」核心）', () => {
    // 模拟真实链路：本地 reset 后 incoming = {q1: 墓碑@100}，服务器旧快照 base = {q1: 记录@50}
    // merge 必须让墓碑（100）胜出，否则下次 load 会读到旧记录（复活）
    const base = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 50 });
    const incoming = applyAnswer(emptyProgress(), 'q1', { selected: [], correct: null, submittedAt: 100, deletedAt: 100 });
    const merged = mergeProgress(base, incoming);
    expect(merged.answers['q1'].deletedAt).toBe(100);   // 墓碑胜
    expect(isAnswerDeleted(merged.answers['q1'])).toBe(true);
  });

  it('mergeProgress: 记录新于墓碑 → 自动复活（reset 后又答题）', () => {
    // 用户重做本题集（墓碑@100）后又答了这道题（记录@200）→ 应当显示为新答案，而非保持删除
    const tombstoned = applyAnswer(emptyProgress(), 'q1', { selected: [], correct: null, submittedAt: 100, deletedAt: 100 });
    const reAnswered = applyAnswer(emptyProgress(), 'q1', { selected: ['B'], correct: true, submittedAt: 200 });
    const merged = mergeProgress(tombstoned, reAnswered);
    expect(merged.answers['q1'].deletedAt).toBeUndefined();  // 复活，墓碑被新记录覆盖
    expect(merged.answers['q1'].correct).toBe(true);
    expect(merged.answers['q1'].selected).toEqual(['B']);
  });

  it('mergeProgress: 多 tab 并发——A reset 题1 + B 答 题2，两条意图都保留', () => {
    // 这是墓碑方案相对"盲覆盖"的核心优势：并发删除与答题互不踩踏
    const base = {
      ...applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: true, submittedAt: 50 }),
      answers: { q1: { selected: ['A'], correct: true, submittedAt: 50 } },
    };
    // A 设备：重做本题集（q1 打墓碑@100）
    const fromA = applyAnswer(emptyProgress(), 'q1', { selected: [], correct: null, submittedAt: 100, deletedAt: 100 });
    // B 设备：答了 q2（@110）
    const fromB = applyAnswer(emptyProgress(), 'q2', { selected: ['B'], correct: false, submittedAt: 110 });
    // 服务器依次 merge A、B
    let disk = mergeProgress(base, fromA);
    disk = mergeProgress(disk, fromB);
    expect(isAnswerDeleted(disk.answers['q1'])).toBe(true);   // A 的删除生效
    expect(disk.answers['q2'].correct).toBe(false);           // B 的答题保留
  });

  it('mergeProgress: readTombstones 两侧取并集（合并删除意图）', () => {
    const a: Progress = { version: 1, answers: {}, read: { q1: 10, q2: 10 }, readTombstones: { q1: 100 } };
    const b: Progress = { version: 1, answers: {}, read: { q1: 10, q3: 10 }, readTombstones: { q2: 80, q3: 50 } };
    const m = mergeProgress(a, b);
    // 取 max：a 的 q1@100、b 的 q2@80（a 无则取 b）、b 的 q3@50
    expect(m.readTombstones).toEqual({ q1: 100, q2: 80, q3: 50 });
  });

  it('mergeProgress: readTombstones 单边缺失时取存在者（向后兼容）', () => {
    const a: Progress = { version: 1, answers: {}, read: { q1: 10 }, readTombstones: { q1: 100 } };
    const b: Progress = { version: 1, answers: {}, read: { q1: 10 } };  // 老数据无 readTombstones
    expect(mergeProgress(a, b).readTombstones).toEqual({ q1: 100 });
    expect(mergeProgress(b, a).readTombstones).toEqual({ q1: 100 });
  });

  it('isRead: 墓碑新于 read 时间戳 → 视为未看（resetReadByIds）', () => {
    let p = markRead(emptyProgress(), 'q1');               // read[q1] = Date.now()
    p = resetReadByIds(p, ['q1'], Date.now() + 1000);       // 墓碑晚于 read
    expect(isRead(p, 'q1')).toBe(false);
    expect(readIds(p)).toEqual([]);
    expect(readCount(p, qs)).toBe(0);
  });

  it('isRead: read 新于墓碑（重看后又看了一次）→ 视为已看（复活）', () => {
    let p = markRead(emptyProgress(), 'q1');               // read@1000
    p = resetReadByIds(p, ['q1'], 2000);                    // 墓碑@2000 → 未看
    p = { ...p, read: { ...p.read!, q1: 3000 } };          // 又看了一次@3000
    expect(isRead(p, 'q1')).toBe(true);                     // 3000 > 2000 → 已看
  });

  it('老数据无墓碑字段 → 向后兼容（视为正常记录）', () => {
    // 模拟服务器现存 progress.json：无 deletedAt、无 readTombstones
    const legacy: Progress = {
      version: 1,
      answers: { q1: { selected: ['A'], correct: true, submittedAt: 50 } },
      read: { q1: 100 },
    };
    expect(isAnswerDeleted(legacy.answers['q1'])).toBe(false);
    expect(isRead(legacy, 'q1')).toBe(true);
    expect(computeStats(legacy, qs).answered).toBe(1);
    expect(readCount(legacy, qs)).toBe(1);
    // merge 两个老数据不丢失
    const merged = mergeProgress(legacy, { version: 1, answers: {}, read: {} });
    expect(merged.answers['q1'].correct).toBe(true);
    expect(merged.read?.q1).toBe(100);
  });

  it('mergeProgress: srs 墓碑新于记录 → 删除生效（resetSrs）', () => {
    // 服务器旧快照有 FC-001（updatedAt=50），incoming 打墓碑（deletedAt=100）
    const base: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 50 }) } };
    const incoming: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 100, deletedAt: 100 }) } };
    const merged = mergeProgress(base, incoming);
    expect(isCardDeleted(merged.srs?.['FC-001'])).toBe(true);
  });

  it('mergeProgress: srs 记录新于墓碑 → 复活（reset 后又复习了卡）', () => {
    const tombstoned: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 100, deletedAt: 100 }) } };
    const reviewed: Progress = { version: 1, answers: {}, srs: { 'FC-001': srs({ updatedAt: 200, interval: 6 }) } };
    const merged = mergeProgress(tombstoned, reviewed);
    expect(isCardDeleted(merged.srs?.['FC-001'])).toBe(false);
    expect(merged.srs?.['FC-001'].interval).toBe(6);
  });

  // —— 主题偏好（theme）合并 ——
  it('mergeProgress: theme 按 themeUpdatedAt 取新（LWW）', () => {
    const a: Progress = { version: 1, answers: {}, theme: 'light', themeUpdatedAt: 100 };
    const b: Progress = { version: 1, answers: {}, theme: 'dark', themeUpdatedAt: 200 };
    const m = mergeProgress(a, b);
    expect(m.theme).toBe('dark');
    expect(m.themeUpdatedAt).toBe(200);
  });

  it('mergeProgress: theme 相同时间戳取 local（a）', () => {
    const a: Progress = { version: 1, answers: {}, theme: 'light', themeUpdatedAt: 100 };
    const b: Progress = { version: 1, answers: {}, theme: 'dark', themeUpdatedAt: 100 };
    expect(mergeProgress(a, b).theme).toBe('light');
  });

  it('mergeProgress: theme 单边缺失取存在者（向后兼容）', () => {
    const a: Progress = { version: 1, answers: {}, theme: 'dark', themeUpdatedAt: 100 };
    const b: Progress = { version: 1, answers: {} }; // 老数据无 theme
    expect(mergeProgress(a, b).theme).toBe('dark');
    expect(mergeProgress(b, a).theme).toBe('dark');
  });

  it('mergeProgress: 两边都无 theme 时返回空（向后兼容）', () => {
    const a: Progress = { version: 1, answers: {} };
    const b: Progress = { version: 1, answers: {} };
    const m = mergeProgress(a, b);
    expect(m.theme).toBeUndefined();
    expect(m.themeUpdatedAt).toBeUndefined();
  });

  it('mergeProgress: theme 不影响其他字段（隔离性）', () => {
    const a: Progress = { version: 1, answers: { q1: { selected: ['A'], correct: true, submittedAt: 1 } }, read: { q1: 5 }, theme: 'light', themeUpdatedAt: 10 };
    const b: Progress = { version: 1, answers: {}, theme: 'dark', themeUpdatedAt: 20 };
    const m = mergeProgress(a, b);
    expect(m.theme).toBe('dark');
    expect(m.answers.q1.correct).toBe(true); // answers 保留
    expect(m.read?.q1).toBe(5);              // read 保留
  });

  // —— 多主题隔离（v0.4 痛点 #2）：reset 类操作可限定 id 集，不误伤其他主题进度 ——
  it('resetWrong(ids): 只清命中的错题，其他主题的错题原样保留', () => {
    let p = applyAnswer(emptyProgress(), 'q1', { selected: ['A'], correct: false, submittedAt: 1, streak: 0 }); // 主题A错题
    p = applyAnswer(p, 'OT-001', { selected: ['A'], correct: false, submittedAt: 2, streak: 0 });                // 其他主题错题
    p = resetWrong(p, 100, ['q1']);
    expect(isAnswerDeleted(p.answers['q1'])).toBe(true);    // 命中：打墓碑
    expect(isAnswerDeleted(p.answers['OT-001'])).toBe(false); // 未命中：原样保留
    expect(p.answers['OT-001'].streak).toBe(0);
  });

  it('resetRead(ids): 只清命中的看题，其他主题的看题原样保留', () => {
    let p = markRead(emptyProgress(), 'q1');
    p = markRead(p, 'OT-001');
    const tombTime = Date.now() + 1000;  // 墓碑须晚于 markRead 的真实时间戳，读端才判已删
    p = resetRead(p, tombTime, ['q1']);
    expect(isRead(p, 'q1')).toBe(false);      // 命中：墓碑盖过 read
    expect(isRead(p, 'OT-001')).toBe(true);  // 未命中：保留
  });

  it('resetSrs(ids): 只清命中的卡，其他主题的卡原样保留（srsMeta 仍全局清零）', () => {
    let p = applySrs(emptyProgress(), 'FC-001', srs({ updatedAt: 5 }));
    p = applySrs(p, 'FC-DEV-001', srs({ updatedAt: 6 }));
    p = noteNewCard(p, DAY0);
    p = resetSrs(p, 100, ['FC-001']);
    expect(isCardDeleted(p.srs?.['FC-001'])).toBe(true);      // 命中：打墓碑
    expect(isCardDeleted(p.srs?.['FC-DEV-001'])).toBe(false); // 未命中：保留
    expect(p.srs?.['FC-DEV-001'].updatedAt).toBe(6);
    expect(p.srsMeta).toBeUndefined();                        // 配额有意全局清零（跨主题共享）
  });

  it('reset 类不传 ids 时保持全量语义（向后兼容）', () => {
    let p = applyAnswer(emptyProgress(), 'OT-001', { selected: ['A'], correct: false, submittedAt: 1, streak: 0 });
    p = applySrs(p, 'FC-DEV-001', srs({ updatedAt: 5 }));
    p = resetWrong(p, 100);
    p = resetSrs(p, 100);
    expect(isAnswerDeleted(p.answers['OT-001'])).toBe(true);
    expect(isCardDeleted(p.srs?.['FC-DEV-001'])).toBe(true);
  });

  // —— 课已学完（显式确认制）：完成边界「课全学完」的机读口径。
  //    三断言（点击记入/再点撤销/仅打开零变化）与墓碑合并见 courseProgress.test.ts ——
  it('markCourseRead/isCourseRead: key 带主题前缀，多主题天然隔离', () => {
    let p = markCourseRead(emptyProgress(), 'dev-intro', 'git-basics.html', 100);
    expect(isCourseRead(p, 'dev-intro', 'git-basics.html')).toBe(true);
    expect(isCourseRead(p, 'software-designer', 'git-basics.html')).toBe(false); // 同名文件不同主题≠已读
    expect(p.coursesRead).toEqual({ 'dev-intro/git-basics.html': 100 });
    // 重复标记刷新时间戳（不产生重复 key）
    p = markCourseRead(p, 'dev-intro', 'git-basics.html', 300);
    expect(p.coursesRead).toEqual({ 'dev-intro/git-basics.html': 300 });
  });

  it('mergeProgress: coursesRead per-key 取 max（跨设备 LWW）', () => {
    const a: Progress = { version: 1, answers: {}, coursesRead: { 't1/l1.html': 100, 't1/l2.html': 50 } };
    const b: Progress = { version: 1, answers: {}, coursesRead: { 't1/l1.html': 200, 't2/l1.html': 80 } };
    const m = mergeProgress(a, b);
    expect(m.coursesRead).toEqual({ 't1/l1.html': 200, 't1/l2.html': 50, 't2/l1.html': 80 });
  });

  it('mergeProgress: coursesRead 单边缺失取存在者（老数据无此字段）', () => {
    const a: Progress = { version: 1, answers: {}, coursesRead: { 't1/l1.html': 100 } };
    const b: Progress = { version: 1, answers: {} };
    expect(mergeProgress(a, b).coursesRead).toEqual({ 't1/l1.html': 100 });
    expect(mergeProgress(b, a).coursesRead).toEqual({ 't1/l1.html': 100 });
  });

  // ---- 学习偏好（settings，设置面板）：整块 LWW，settingsUpdatedAt 仲裁 ----

  it('mergeProgress: settings 按 settingsUpdatedAt 取新（整块）', () => {
    const a: Progress = { version: 1, answers: {}, settings: { extOn: true }, settingsUpdatedAt: 200 };
    const b: Progress = { version: 1, answers: {}, settings: { dailyNewCards: 9 }, settingsUpdatedAt: 100 };
    // a 新：整块取 a，不拼出 { extOn, dailyNewCards } 混合态
    expect(mergeProgress(a, b).settings).toEqual({ extOn: true });
    expect(mergeProgress(a, b).settingsUpdatedAt).toBe(200);
    expect(mergeProgress(b, a).settings).toEqual({ extOn: true });
  });

  it('mergeProgress: settings 单边缺失取存在者（老快照无此字段）', () => {
    const a: Progress = { version: 1, answers: {}, settings: { autoAdvance: false }, settingsUpdatedAt: 50 };
    const b: Progress = { version: 1, answers: {} };
    expect(mergeProgress(a, b).settings).toEqual({ autoAdvance: false });
    expect(mergeProgress(b, a).settings).toEqual({ autoAdvance: false });
  });
});
