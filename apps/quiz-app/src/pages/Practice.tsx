import { useMemo, useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, RotateCcw, BookOpen, PenLine, RefreshCw, SkipForward, CheckCircle2, ArrowRight } from 'lucide-react';
import { questions } from '../data/questions';
import type { Question } from '../types';
import { useProgress } from '../hooks/useProgress';
import { wrongIds, streakToPass, isAnswerDeleted, isRead, computeStats } from '../lib/progress';
import { loadPosIndex, savePosId } from '../lib/posMemory';
import { QuestionCard } from '../components/QuestionCard';
import { ProgressBar } from '../components/ProgressBar';
import { SessionSummary } from '../components/SessionSummary';
import { buildAtomicOrder, atomicLabel } from '../lib/topicOrder';
import { useConfirm } from '../components/ConfirmDialog';

type ViewMode = 'practice' | 'read';

export function Practice() {
  const { mode = 'all' } = useParams();
  const [params, setParams] = useSearchParams();
  const topic = params.get('topic') || '';   // ?topic=业务架构
  const subtopic = params.get('subtopic') || ''; // ?subtopic=BA·价值流灯塔（大类细分）
  const day = params.get('day') || '';        // ?day=D2 按备考日程
  // 看题模式：URL ?view=read 携带，便于首页/外部直链（如"按 D 看题"）。默认答题。
  const [viewMode, setViewMode] = useState<ViewMode>(params.get('view') === 'read' ? 'read' : 'practice');
  const { progress, loaded, submitAnswer, markRead, resetAnswersByIds, resetReadByIds, dismissWrong } = useProgress();
  const confirm = useConfirm();

  // 会话级答题缓存：记录本次会话内用户提交过的题目（选中项 + 揭晓态）。
  // 用途：(1) 错题模式翻页再翻回时还原本次会话的作答（而非清空，修 Bug 2）；
  //       (2) 驱动"刚答对自动跳下一题"用会话信号而非历史 rec，避免一打开就跳（修 Bug 1）。
  // 仅存活于当前列表/模式会话；切换 scope（换 topic/day/mode/view）时由下方 effect 清空。
  const [sessionAnswers, setSessionAnswers] = useState<Record<string, { selected: string[]; revealed: boolean }>>({});

  // base：按 topic/subtopic/day 过滤后的题池（顺序/错题/看题/random 共用基础过滤）
  const base = useMemo(() => {
    let b: Question[] = questions;
    if (topic) b = b.filter((q) => q.topic === topic);
    if (subtopic) b = b.filter((q) => q.subtopic === subtopic);
    if (day) b = b.filter((q) => q.day === day);
    return b;
  }, [topic, subtopic, day]);

  // ⭐ 错题模式用会话级快照，不让 list 随 progress 实时变化。
  //  根因：答对一题达到 streak 阈值后，wrongIds 自动把它移出错题集 → list 缩水 →
  //   (a) QuestionCard 的 key 变了，旧组件卸载、"回答正确"反馈一闪而过，直接进下一题；
  //   (b) 进度条分子(masteredInList)与分母(list.length)同步缩水，永远到不了 100%。
  //  快照仅在 mode/base 变化或进度加载完成时取一次；依赖里故意不含 progress，
  //  所以本次会话内答题造成的 progress 变化不会重新快照 → 列表稳定。
  //  （与 reviewQueue.ts 里闪卡"评分不重建队列"同一思路——那边注释也标了 reactive queue 是踩过的坑。）
  const [wrongSnapshot, setWrongSnapshot] = useState<Question[] | null>(null);
  useEffect(() => {
    if (mode !== 'wrong') { setWrongSnapshot(null); return; }
    if (!loaded) return; // 进度未加载完就快照会得到空列表，误显示"暂无错题"
    setWrongSnapshot(wrongIds(progress, base).map((id) => base.find((q) => q.id === id)!).filter(Boolean));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, base, loaded]);

  const list = useMemo(() => {
    if (mode === 'wrong') return wrongSnapshot ?? [];
    if (mode === 'random') {
      const pool = [...base];
      for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
      return pool.slice(0, Math.min(20, pool.length));
    }
    return base;
  }, [mode, wrongSnapshot, base]);

  // scope 带 topic/subtopic/day + view 维度：保证不同列表、看题/答题的位置记忆各自独立
  // （之前 scope 漏了 view，导致同一列表看题和答题共用一个浏览位置，互相串）
  const scope = `${mode}${topic ? `:t-${topic}` : ''}${subtopic ? `:s-${subtopic}` : ''}${day ? `:d-${day}` : ''}:${viewMode}`;
  // 列表级 scope（不含 viewMode）：用于"进入列表自动定位"的去重——
  // 答题/看题切换不该重触发自动定位，否则每次切答题都清空重做。
  const listScope = `${mode}${topic ? `:t-${topic}` : ''}${subtopic ? `:s-${subtopic}` : ''}${day ? `:d-${day}` : ''}`;
  const ids = useMemo(() => list.map((q) => q.id), [list]);

  // 「下一题集」：按首页"按主题练习"网格的点击顺序（buildAtomicOrder），找当前 (topic,subtopic)
  // 之后的下一个题集。用于完成弹窗的"进入下一题集"按钮——答完一个就接着下一个，减少回首页跳转。
  // 仅当当前列表是"按 topic/subtopic 过滤"且有明确后继时才有值；顺序练习(day/无过滤)无后继→null。
  // topic 为空（如 /practice/all 无 query）时不参与"下一题集"流程。
  const nextAtomic = useMemo(() => {
    if (!topic || day) return null;  // 按 day 练习或无过滤的顺序练习无"下一个 topic"
    const order = buildAtomicOrder(questions);
    const curIdx = order.findIndex((a) => a.topic === topic && a.subtopic === (subtopic || ''));
    if (curIdx < 0 || curIdx >= order.length - 1) return null;  // 未命中或已是末尾
    return order[curIdx + 1];
  }, [topic, subtopic, day]);
  const navigate = useNavigate();

  // 位置记忆：按 id 续接（顺序/错题）。random 模式从 0 开始
  // navTick：每次"导航到当前题"自增，作为 QuestionCard 的 key 一部分强制重挂载。
  //  解决"剩 1 道错题循环回第一题不能重选"的 bug：此时 cur.id 不变、rec 状态不变，
  //  原 key `${cur.id}:${rec?...}` 不变 → 组件不重挂载 → 本地 revealed=true（上次提交结果）残留，
  //  用户看到已揭晓的答案、选项被锁、无法重新作答。navTick 让任何翻页/循环都触发一次干净重挂载。
  const [pos, setPosRaw] = useState(() => (mode === 'random' ? 0 : loadPosIndex(scope, ids)));
  // [诊断] 包装 setPos：抓每次 pos 赋值的调用栈，定位"落末题"的根源
  const setPos = (v: number | ((p: number) => number)) => {
    const caller = new Error().stack?.split('\n')[2]?.trim()?.replace(/^at\s+/, '').slice(0, 90) || '?';
    console.log('[pos] setPos', typeof v === 'function' ? `fn` : v, '←', caller);
    setPosRaw(v);
  };
  const [navTick, setNavTick] = useState(0);

  // 切换模式/topic/day/看题-答题 时重算位置（scope 已含所有维度，故直接依赖 scope）
  // 同时重置总结态：切到新列表/新模式不应保留上一个 topic 的总结页。
  useEffect(() => { setPos(mode === 'random' ? 0 : loadPosIndex(scope, ids)); setNavTick((n) => n + 1); setShowSummary(false); setSessionAnswers({}); setJustAnsweredId(null); /* eslint-disable-next-line */ }, [scope]);

  // ⭐ 进入列表自动定位（仅普通答题模式 all + 非看题 + 非 random/wrong）。
  //  规则：进一个 topic 时——
  //    · 有未答 → 跳到第一道未答题（等价于点"跳到未答"）；
  //    · 全未答 → 本就在第 1 题（pos 默认 loadPosIndex 的记忆位置），无需额外动作；
  //    · 全答完 → 落到末题（list.length - 1），紧邻「完成答题」按钮，便于看总结或推进到下一题集。
  //  ⚠️ 绝不自动清空已答记录（2026-07-10 踩过）：旧实现"全答完→resetAnswersByIds 清空重做"
  //    是破坏性的——用户答完一个题集后，只要重新进入（刷新/从首页再点进来）就抹掉全部
  //    答题记录与正确率/错题进度。复习或回看时记录直接消失，体验极差。重做应交给用户主动点按钮。
  //    下面全答完分支【只改 pos 和位置记忆，不清 answers】，与这条保护不冲突。
  //  ⚠️ 全答完不信任 localStorage 的位置记忆（2026-07-16 / 07-19 踩过两版反直觉）：
  //    旧版 a) "保持记忆位置" → 残留可能是任意题（末题/中间题），不可控；
  //    旧版 b) "回第 1 题"    → 进完成态永远显示第 1 题，与"已完成"的语义不符（07-19 反馈）。
  //    现版本：全答完一律落末题并覆盖记忆，离「完成答题」最近、最符合"已结束"体感。
  //  去重：用 handledScopesRef 记录"本挂载已处理过的 listScope"，避免每次答题后重跑
  //  （否则 progress 变化会反复触发跳转定位）。
  //  从首页重新进入（路由 remount）会重建 ref，自然重新定位——这是期望行为。
  //  答题/看题切换（listScope 不变）不重触发，避免看题回答题时误定位。
  const handledScopesRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!loaded) return;                       // 进度未加载完不判，否则误判为"全未答"
    if (mode !== 'all' || viewMode === 'read') return;  // 仅普通答题模式（isReadMode 此处尚未定义，内联判断）
    if (list.length === 0) return;
    if (handledScopesRef.current.has(listScope)) return;
    handledScopesRef.current.add(listScope);
    const answered = list.reduce((n, q) => {
      const r = progress.answers[q.id];
      return r && !isAnswerDeleted(r) ? n + 1 : n;
    }, 0);
    if (answered > 0 && answered < list.length) {
      // 有未答 → 跳第一道未答
      const idx = list.findIndex((q) => !progress.answers[q.id] || isAnswerDeleted(progress.answers[q.id]));
      if (idx >= 0) {
        setPos(idx);
        setNavTick((n) => n + 1);
        if (list[idx]) savePosId(scope, list[idx].id);
      }
    } else if (answered === list.length) {
      // 全答完 → 落末题（紧邻「完成答题」按钮，最符合"已结束"体感；覆盖可能残留的记忆位置）
      const lastIdx = list.length - 1;
      setPos(lastIdx);
      setNavTick((n) => n + 1);
      if (list[lastIdx]) savePosId(scope, list[lastIdx].id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, listScope, mode, viewMode]);

  const cur = list[Math.min(pos, list.length - 1)];
  // 墓碑记录（重做本题集后留下的 deletedAt）应视为未答，否则 QuestionCard 会拿到
  // 旧 selected/correct 直接揭晓答案，"重做"形同虚设。
  const rawRec = cur ? progress.answers[cur.id] : undefined;
  const rec = isAnswerDeleted(rawRec) ? undefined : rawRec;
  // 错题模式：不预揭晓答案、清空旧选项，让用户重新作答（提交后才显示对错与解析）。
  // 否则错题一打开就显示答案，失去了"重做"的意义。
  // ⚠️ 但"重做"语义只针对"首次打开未答"的题；本次会话已答过的题（sessionAnswers 有记录）
  //   应还原作答态，否则翻页再翻回会清空刚提交的对错/解析（Bug 2）。
  const isWrongMode = mode === 'wrong';
  const sessionRec = cur ? sessionAnswers[cur.id] : undefined;
  const initialRevealed = isWrongMode ? !!sessionRec?.revealed : !!rec;
  const initialSelected = isWrongMode ? (sessionRec?.selected ?? []) : rec?.selected;

  /** 本列表中已答过的题数（用于进度条分子）。
   *  旧实现传 pos（0-indexed）导致最后一题到不了 100%，且与"X/Y"文字不一致。
   *  wrong 模式下错题必然都答过 → answeredInList 恒等于 list.length，进度条无意义；
   *  改用 masteredInList（本错题集已重新答对的题数）体现"错题掌握进度"。
   *
   *  ⭐ random 模式特殊处理：随机是纯沙盒，答对/自评不写 progress.answers（只答错写 fromRandom），
   *  若读 progress 会让进度条几乎不动。改读本会话缓存 sessionAnswers——本会话答了多少题就涨多少，
   *  符合"沙盒内可见进度、退出即清"。答错的题也在 sessionAnswers 里（onSubmit 总写缓存），
   *  故分子完整覆盖对+错+自评。 */
  const isRandomMode = mode === 'random';
  const answeredInList = useMemo(
    () => isRandomMode
      ? ids.filter((id) => sessionAnswers[id]).length
      : list.reduce((n, q) => {
          const r = progress.answers[q.id];
          return r && !isAnswerDeleted(r) ? n + 1 : n;
        }, 0),
    [isRandomMode, ids, sessionAnswers, list, progress.answers]
  );
  /** 错题模式：已掌握 = streak 达到 streakToPass(wrongCount) 阈值（即已自动移出错题集的判定条件）。
   *  非错题模式：已答对 = correct === true。
   *  错题模式必须用 streak 判定——list 是会话快照不缩水，故分子能涨到分母达到 100%。 */
  const masteredInList = useMemo(
    () => isWrongMode
      ? list.reduce((n, q) => {
          const r = progress.answers[q.id];
          return r && !isAnswerDeleted(r) && r.streak !== undefined && r.streak >= streakToPass(r.wrongCount ?? 1) ? n + 1 : n;
        }, 0)
      : list.reduce((n, q) => {
          const r = progress.answers[q.id];
          return r && !isAnswerDeleted(r) && r.correct === true ? n + 1 : n;
        }, 0),
    [list, progress.answers, isWrongMode]
  );
  /** 本列表中已看的题数（看题模式的进度条分子）。墓碑（重看本题集后）视为未看。 */
  const readInList = useMemo(
    () => list.reduce((n, q) => (isRead(progress, q.id) ? n + 1 : n), 0),
    [list, progress.read, progress.readTombstones]
  );
  /** 总结态统计：复用 computeStats 传入子集 list（而非全库），得到该 topic 累计正确率。
   *  口径与 grill 共识一致：自评题(correct===null)计入 answered 但不进 accuracy 分母。
   *  自评题数（selfRated = answered - graded）由 SessionSummary 组件内自算并标注，
   *  避免调用方拆解、字段漂移。整个 Stats 对象直接传给组件。 */
  const listStats = useMemo(() => computeStats(progress, list), [progress, list]);
  /** 「完成答题」仅普通模式(all)+答题视图生效：答完本列表全部题目（listStats.answered === list.length）
   *  才可点；未答完时末题按钮禁用并提示"还有 X 题未答"。wrong/random/read 模式保持原循环逻辑。
   *  看题模式不写 answers（只写 read），故 listStats.answered 恒为 0，canFinish 自然为 false——
   *  这里仍显式排除 viewMode==='read' 以让语义自解释，不依赖上述副作用。 */
  const canFinish = mode === 'all' && viewMode !== 'read' && listStats.answered === list.length && list.length > 0;
  /** 总结态显隐：用户在末题点「完成答题」后置 true，覆盖 QuestionCard 区域展示成绩。
   *  切换列表/scope 时自动重置（依赖下方的 scope 变更 effect 复用 setPos 处），这里独立管理。 */
  const [showSummary, setShowSummary] = useState(false);

  // 位置超出列表（错题被移出/topic 切换导致列表缩短）时夹紧
  useEffect(() => { if (pos > list.length - 1) setPos(Math.max(0, list.length - 1)); }, [pos, list.length]);
  // ⚠️ 不要用 effect 自动 savePosId：切换 view 时 scope 已变但 pos 还是旧值（setPos 异步），
  // 此时 effect 会把"切换前 practice 的当前题"写进 read scope 的记忆，覆盖真正的看题位置。
  // 改为只在用户主动翻页/重置时调用 gotoAndSave（见下）。load 和夹紧都不写记忆。

  /** 主动跳到某位置并记忆：用户翻页 / 重做本题集时调用。
   *  random 模式不记忆（动态列表）；越界自动夹紧。
   *  load（scope 切换）与位置夹紧不走这里——它们不该污染位置记忆。 */
  const isReadMode = viewMode === 'read';
  // ⭐ 答对自动跳下一题（3 秒）：仅对"刚提交且答对 + 非末题 + 非看题"那一瞬生效。
  //  判定口径：用 justAnsweredId（仅 onSubmit 时写入一次）而非 sessionAnswers 缓存——
  //  缓存是"本会话答对过的所有题"，翻回去时仍为 true 会再次触发跳转，把用户从解析页弹走。
  //  改成"单次信号"：提交那一刻记下题 id，翻页/循环立即清空 → 只在提交原地等 3 秒跳。
  //  竞态处理：useRef 存 timer id；gotoAndSave 内首行 cancelAutoAdvance() 保证手动翻页时
  //  立刻取消挂起的定时器，避免"手动点了下一题 → 3 秒后又被定时器多跳一格"。
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelAutoAdvance = () => {
    if (autoAdvanceTimer.current) { clearTimeout(autoAdvanceTimer.current); autoAdvanceTimer.current = null; }
  };
  const isLastInList = pos >= list.length - 1;
  // justAnsweredId = 本次会话"最后提交的那一题"且仍在该题上；任意翻页会经 gotoAndSave 把它清掉。
  const [justAnsweredId, setJustAnsweredId] = useState<string | null>(null);
  const justAnsweredCorrect = !isReadMode && !!cur && justAnsweredId === cur.id && !isLastInList;
  useEffect(() => {
    if (!justAnsweredCorrect) return;
    autoAdvanceTimer.current = setTimeout(() => {
      autoAdvanceTimer.current = null;
      // gotoAndSave 内首行会 cancelAutoAdvance，但此时 timer 已执行完置 null，无副作用。
      // 直接复用 gotoAndSave 保证 clamp/navTick/savePosId 口径与手动翻页一致。
      gotoAndSave(pos + 1);
    }, 3000);
    return cancelAutoAdvance;
    // 仅在"刚答对信号"或"当前题"变化时重设；pos 变化（含本定时器触发的跳转）经由 cur.id
    // 变化间接触发 cleanup → 取消本定时器，天然防重入。gotoAndSave 运行时已初始化（下方 const）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justAnsweredCorrect, cur?.id]);

  const gotoAndSave = (newPos: number) => {
    cancelAutoAdvance(); // 手动翻页/重做时取消挂起的自动跳转，否则会多跳一格
    setJustAnsweredId(null); // 翻页即清"刚答对"信号，避免翻回去再被弹走（用户点上一题多半想看解析）
    const clamped = Math.max(0, Math.min(list.length - 1, newPos));
    setPos(clamped);
    setNavTick((n) => n + 1);
    if (mode !== 'random' && list[clamped]) savePosId(scope, list[clamped].id);
  };

  /** 跳到本题集第一道未答题：补 day 后新题进入列表，用户点这里一键定位过去。
   *  判定口径与 answeredInList 一致：墓碑记录(isAnswerDeleted)视为未答。
   *  random/wrong 不适用（动态列表/全是错题）；全答完时按钮不渲染，此处不兜底。 */
  const gotoFirstUnanswered = () => {
    if (mode === 'random') return;
    const idx = list.findIndex((q) => !progress.answers[q.id] || isAnswerDeleted(progress.answers[q.id]));
    if (idx >= 0) gotoAndSave(idx);
  };

  /** 错题模式：重新快照错题集（去掉本轮已掌握的）并回到第一题。
   *  wrongSnapshot 默认不随 progress 实时变（见上方注释），但用户点"回到第一题"
   *  是显式的"再过一遍剩余错题"意图，此时应清掉已达标（streak>=阈值）的题。
   *  不能复用 gotoAndSave(0)——它读当前渲染的 list（旧快照），需在 fresh 上定位。 */
  const refreshWrongAndRestart = () => {
    const fresh = wrongIds(progress, base).map((id) => base.find((q) => q.id === id)!).filter(Boolean);
    setWrongSnapshot(fresh);
    setPos(0);
    setNavTick((n) => n + 1);
    // 清会话缓存：本会话已答过的题在 sessionAnswers 留着 {revealed:true}，重挂后 QuestionCard
    // 会读它还原成已揭晓态 → 选项被锁、直接显示答案，用户没法重选。「回到第一题」是显式的
    // "再过一遍剩余错题"意图，应连缓存一起清，让每道题都回到未答、可重新作答。
    // （区别于正常翻页回看：那是浏览意图，需保留作答态，走 gotoAndSave 不清缓存——见 Bug 2 注释。）
    setSessionAnswers({});
    if (fresh[0]) savePosId(scope, fresh[0].id);
  };

  /** 重置本题集：仅清除当前列表题目的答题记录（含错题进度），不动其他主题、不动看题/闪卡进度。
   *  random 模式下"本题集"是动态的，禁用此按钮（语义不明确）。
   *  从总结态触发时退出总结页，回到第一题重新作答。 */
  const resetThisSet = async () => {
    const ids = list.map((q) => q.id);
    if (mode === 'random') return;
    const label = day ? `「${day}」` : (subtopic ? `「${subtopic}」` : (topic ? `「${topic}」` : (mode === 'wrong' ? '错题集' : '顺序练习')));
    if (await confirm(`重置${label}的答题记录？(${ids.length} 题，含对错与错题进度，不可恢复。不影响其他主题与闪卡。)`)) {
      resetAnswersByIds(ids);
      gotoAndSave(0);
      setShowSummary(false);
    }
  };

  /** 重看本题集：仅清除当前列表题目的看题记录（read），不动其他主题、不动答题/闪卡进度。
   *  与 resetThisSet 对称——一个清答题记录（答题模式），一个清看题记录（看题模式）。
   *  random 模式下"本题集"是动态的，禁用此按钮（语义不明确）。 */
  const resetReadOfThisSet = async () => {
    const ids = list.map((q) => q.id);
    if (mode === 'random') return;
    const label = day ? `「${day}」` : (subtopic ? `「${subtopic}」` : (topic ? `「${topic}」` : '顺序练习'));
    if (await confirm(`重看${label}？(${ids.length} 题，清除本题集看题进度，不可恢复。不影响其他主题与答题记录。)`)) {
      resetReadByIds(ids);
      gotoAndSave(0);
    }
  };

  // 看题模式：进入一道题即标记已看（进度条与视线同步）。
  // 旧实现只在"下一题"按钮里 markRead，导致"正在看的题不计入进度"——体感像进度不动。
  // 依赖仅 cur?.id + isReadMode：切题触发一次，markRead 幂等（刷新时间戳），不致重复写坏。
  useEffect(() => {
    if (isReadMode && cur) markRead(cur.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cur?.id, isReadMode]);
  /** 当前模式的进度分子：错题→已掌握、看题→已看、答题→已答。
   *  抽成一个变量避免 JSX 里 answered/标注/百分比分三处重复算。 */
  const progressNum = isWrongMode ? masteredInList : (isReadMode ? readInList : answeredInList);
  /** 切换答题/看题：同步写回 URL ?view=，便于分享与刷新保持。
   *  wrong/random 模式无看题入口（错题集看题无意义；random 是动态列表）。 */
  const switchView = (v: ViewMode) => {
    setViewMode(v);
    const next = new URLSearchParams(params);
    if (v === 'read') next.set('view', 'read'); else next.delete('view');
    setParams(next, { replace: true });
  };
  const canToggleView = mode !== 'wrong' && mode !== 'random';

  if (!cur) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-text-secondary">{mode === 'wrong' ? '暂无错题，去做几道题吧！' : (day ? `「${day}」暂无题目。` : (subtopic ? `「${subtopic}」暂无题目。` : (topic ? `「${topic}」暂无题目。` : '没有题目。')))}</p>
        <Link to="/" className="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-medium shadow-soft hover:bg-indigo-700 transition-colors">返回首页</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* 顶部信息行：左面包屑（day/topic/subtopic/看题模式），右题号。单独一行避免与操作按钮挤。
          H5 宽度有限时面包屑 truncate 不挤压题号。 */}
      <div className="flex items-center justify-between gap-3 text-sm text-text-muted">
        <span className="truncate min-w-0">{day && <span className="text-text-faint">{day} · </span>}{topic && <span className="text-text-faint">{topic} · </span>}{subtopic && <span className="text-text-faint">{subtopic} · </span>}{isReadMode && <span className="text-sky-500">看题模式</span>}</span>
        <span className="font-medium tabular-nums shrink-0">{Math.min(pos + 1, list.length)} / {list.length}</span>
      </div>
      {/* 操作按钮行：重做本题集 / 跳到未答 / 重看本题集。独立一行，靠右排列，H5 不再拥挤。
          三个按钮互斥条件渲染（看题 vs 答题），同行最多出现两个。无按钮时此行不占空间。 */}
      {((mode !== 'random' && mode !== 'wrong' && !isReadMode && (answeredInList > 0 || answeredInList < list.length)) ||
        (mode !== 'random' && isReadMode && readInList > 0)) && (
        <div className="flex items-center justify-end gap-4 -mt-1">
          {/* 重做本题集：练过的主题想重练时点这里，仅清当前列表的答题记录（含对错与错题进度），
              不动其他主题与闪卡。仅当本题集里有已答记录时显示，避免空主题出现无意义按钮。
              看题模式下隐藏（看题无"答题记录"可重置）。 */}
          {mode !== 'random' && mode !== 'wrong' && answeredInList > 0 && !isReadMode && (
            <button
              onClick={resetThisSet}
              className="inline-flex items-center gap-1 text-text-muted hover:text-red-600 transition-colors"
              title="清空本题集答题记录，重新作答"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              重做本题集
            </button>
          )}
          {/* 跳到未答：补 day 后新题进入列表，点这里一键定位到第一道未答题。
              与"重做本题集"对称（后者要 answeredInList>0，这里要 answeredInList<list.length）。
              看题模式隐藏（看题无"答题"概念）。全答完时按钮不渲染。 */}
          {mode !== 'random' && mode !== 'wrong' && !isReadMode && answeredInList < list.length && (
            <button
              onClick={gotoFirstUnanswered}
              className="inline-flex items-center gap-1 text-text-muted hover:text-indigo-600 transition-colors"
              title="跳到本题集第一道未答题"
            >
              <SkipForward className="h-3.5 w-3.5" strokeWidth={2} />
              跳到未答
            </button>
          )}
          {/* 重看本题集：看过的主题想重看时点这里，仅清当前列表的看题记录（read），
              不动其他主题与答题/闪卡进度。与"重做本题集"对称。
              仅看题模式、且本题集里有已看记录时显示。 */}
          {mode !== 'random' && isReadMode && readInList > 0 && (
            <button
              onClick={resetReadOfThisSet}
              className="inline-flex items-center gap-1 text-text-muted hover:text-sky-600 transition-colors"
              title="清空本题集看题进度，重新看题"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={2} />
              重看本题集
            </button>
          )}
        </div>
      )}

      {/* 答题/看题模式切换：按 day/topic 列表既能练也能看（含"按 D 看题"）。
          wrong/random 模式不显示（错题集看题无意义；random 是动态列表）。 */}
      {canToggleView && (
        <div className="flex justify-center">
          <div className="inline-flex items-center bg-bg-subtle rounded-full p-1 text-sm">
            <button
              onClick={() => switchView('practice')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors ${!isReadMode ? 'bg-bg-surface text-indigo-600 shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <PenLine className="h-3.5 w-3.5" strokeWidth={2} />
              答题
            </button>
            <button
              onClick={() => switchView('read')}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full font-medium transition-colors ${isReadMode ? 'bg-bg-surface text-sky-600 shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <BookOpen className="h-3.5 w-3.5" strokeWidth={2} />
              看题
            </button>
          </div>
        </div>
      )}

      {/* 进度条：分子随模式切——答题=已答、看题=已看、错题=已重新掌握（mastered）。
          颜色同步区分（答题靛蓝/看题天蓝），并在上方标注"已答/已看 X/Y"消除歧义。
          wrong 模式恒为答题态（错题集没有看题入口），故三态用 isWrongMode / isReadMode 区分。 */}
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] tabular-nums">
          <span className={isReadMode ? 'text-sky-600' : 'text-indigo-600'}>
            {isWrongMode ? `已掌握 ${masteredInList}` : (isReadMode ? `已看 ${readInList}` : `已答 ${answeredInList}`)} / {list.length}
          </span>
          <span className="text-text-faint">{list.length === 0 ? 0 : Math.round((progressNum / list.length) * 100)}%</span>
        </div>
        <ProgressBar
          answered={progressNum}
          total={list.length}
          mode={isReadMode ? 'read' : 'practice'}
        />
      </div>
      {/* ⭐ key 只用 cur.id + navTick：navTick 已是"需要干净重挂载"的信号（见其注释），
          旧版还带 rec?'answered':'fresh' 段，导致提交瞬间 rec 变化 → key 变 → 卡重挂 →
          刚揭晓的对错/解析一闪而过（Bug 2 成因之一）。去掉 rec 段：提交不再重挂，卡保留 revealed 态；
          真实翻页（navTick+1）才重挂，并从 sessionAnswers 还原（错题模式）。 */}
      <QuestionCard key={`${cur.id}:${navTick}`} q={cur} index={pos}
        readOnly={isReadMode}
        initialSelected={initialSelected} initialRevealed={initialRevealed}
        wrongCount={rec?.wrongCount}
        streak={rec?.streak}
        streakNeeded={rec?.streak !== undefined ? streakToPass(rec.wrongCount ?? 1) : undefined}
        onDismiss={isWrongMode ? () => dismissWrong(cur.id) : undefined}
        onSubmit={(sel, correct) => {
          // 同时写会话缓存：错题模式翻页再翻回时从这里还原作答态（修 Bug 2）。
          setSessionAnswers((prev) => ({ ...prev, [cur.id]: { selected: sel, revealed: true } }));
          // 记下"刚提交的题 id"：仅此一题、仅在原地等待 3 秒自动跳；翻页即清，不会弹走回看解析的用户。
          if (correct === true) setJustAnsweredId(cur.id);
          // 随机20题 = 纯沙盒自测：答对/自评不写进度（不污染系统学习的已答%/正确率/覆盖明细）；
          // 仅答错才写一条带 fromRandom 标记的记录 → 进错题本但不计主进度（见 progress.ts isFromRandom）。
          // sessionAnswers 已记录本会话作答，进度条/翻页回看从那里读，不受影响。
          if (mode === 'random' && correct !== false) return;
          submitAnswer(cur.id, {
            selected: sel, correct, submittedAt: Date.now(),
            ...(mode === 'random' ? { fromRandom: true } : {}),
          });
        }} />
      {/* 总结态：普通答题模式答完本列表全部题后，点「完成答题」覆盖题目区域展示成绩。
          用固定 key 让 SessionSummary 的动画（数字滚动/进度环）每次进入都从头播放。
          标题文案与 resetThisSet 对齐（day>subtopic>topic 优先级）。 */}
      {showSummary && canFinish && (
        <div className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
             onClick={() => setShowSummary(false)} role="dialog" aria-modal="true" aria-label="答题总结">
          <div className="w-full max-w-md bg-bg-surface rounded-2xl shadow-pop p-6 max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>
            <SessionSummary
              stats={listStats}
              title={day || subtopic || topic || '顺序练习'}
              onReset={resetThisSet}
            />
            {nextAtomic ? (
              <button
                onClick={() => {
                  // 跳到下一题集——「推进学习」语义，不是复习。落点规则：
                  //   · 有未答 → 落第一道未答（接着做，保留进度）
                  //   · 全答完 → 清空该题集答题记录，回第一题重做（推进到已过完的单元 = 重练巩固）
                  // 实现：把落点 id 写入目标 scope 的位置记忆，navigate 后 scope 切换 effect
                  // （setPos(loadPosIndex(scope, ids))）会续接到该题。
                  // ⚠️ 清空只发生在「完成弹窗里主动点下一题集 + 目标题集已全答完」这一明确推进动作，
                  //   不碰被动进入列表的自动定位 effect（后者绝不清空，2026-07-10 踩过破坏性坑）。
                  const targetQs = questions.filter(
                    (q) => q.topic === nextAtomic.topic &&
                           (!nextAtomic.subtopic || q.subtopic === nextAtomic.subtopic),
                  );
                  const firstUnanswered = targetQs.find(
                    (q) => !progress.answers[q.id] || isAnswerDeleted(progress.answers[q.id]),
                  );
                  const targetScope = `all:t-${nextAtomic.topic}${nextAtomic.subtopic ? `:s-${nextAtomic.subtopic}` : ''}:practice`;
                  if (targetQs.length > 0 && !firstUnanswered) {
                    // 全答完：清空该题集（含对错与错题进度），回第一题重做
                    resetAnswersByIds(targetQs.map((q) => q.id));
                    if (targetQs[0]) savePosId(targetScope, targetQs[0].id);
                  } else if (firstUnanswered) {
                    // 有未答：落第一道未答，不清空
                    savePosId(targetScope, firstUnanswered.id);
                  }
                  const p = new URLSearchParams();
                  p.set('topic', nextAtomic.topic);
                  if (nextAtomic.subtopic) p.set('subtopic', nextAtomic.subtopic);
                  setShowSummary(false);
                  navigate(`/practice/all?${p.toString()}`);
                }}
                className="w-full mt-3 flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium shadow-soft hover:bg-indigo-700 transition-colors"
              >
                下一题集：{atomicLabel(nextAtomic.topic, nextAtomic.subtopic)}
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              </button>
            ) : null}
            <button
              onClick={() => setShowSummary(false)}
              className="w-full mt-2 py-2 text-sm text-text-faint hover:text-text-muted transition-colors"
            >
              {nextAtomic ? '留在这里（关闭）' : '继续看题（关闭）'}
            </button>
          </div>
        </div>
      )}
      <div className="flex justify-between gap-3">
        <button onClick={() => gotoAndSave(pos - 1)} className="flex items-center gap-1 px-5 py-2.5 border border-border-strong rounded-xl text-text-secondary font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-bg-hover transition-colors" disabled={pos === 0}>
          <ChevronLeft className="h-4 w-4" strokeWidth={2} />
          上一题
        </button>
        {/* 推进按钮（仅普通 all+答题 模式启用完成答题）：
            · 全答完(canFinish) → 任何位置恒为「完成答题」，点击直接进总结态。
              （否则答完后若位置不在末题——从首页重进/位置记忆落在中间——用户得逐题点回末题
              才看到"完成答题"，体验很差；2026-07-16 踩过。）
            · 未全答 + 未到末题 → 「下一题」前进。
            · 未全答 + 末题 → 「完成答题」，点击跳第一道未答（补答完再完成）。
            wrong 模式末题「回到第一题」（重取错题集循环）；random 末题禁用（动态列表无循环）。 */}
        {(() => {
          const isLast = pos >= list.length - 1;
          const useFinishFlow = mode === 'all' && !isReadMode;  // 仅普通答题模式启用完成答题
          // 全答完时任何位置都视为"已完成"——按钮变完成答题、点击直接出总结。
          // 这是 canFinish 的自然延伸：既然全部答对/答过，就该让用户随时看到结果。
          const finishReady = useFinishFlow && canFinish;
          // 非完成流：错题/顺序末题=「回到第一题」循环，翻页=「下一题」
          const loopLabel = isLast ? '回到第一题' : '下一题';
          // 完成流：全答完 或 已到末题 →「完成答题」；否则「下一题」
          const finishLabel = (finishReady || isLast) ? '完成答题' : '下一题';
          const label = useFinishFlow ? finishLabel : loopLabel;
          return (
            <button
              onClick={() => {
                // 全答完 → 直接进总结态（无论当前位置是否末题）
                if (finishReady) { setShowSummary(true); return; }
                if (!isLast) { gotoAndSave(pos + 1); return; }        // 非末题 → 前进
                // 末题但未全答（完成流）：跳第一道未答补答
                if (useFinishFlow) { gotoFirstUnanswered(); return; }
                // 非 all 模式末题：错题重取循环 / 顺序原地循环
                if (isWrongMode) refreshWrongAndRestart();
                else if (mode !== 'random') gotoAndSave(0);
              }}
              disabled={mode === 'random' && isLast}
              className="flex items-center gap-1 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-indigo-700 transition-colors shadow-soft"
            >
              {label}
              {useFinishFlow && (finishReady || isLast)
                ? <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                : isLast
                  ? <RefreshCw className="h-4 w-4" strokeWidth={2} />
                  : <ChevronRight className="h-4 w-4" strokeWidth={2} />}
            </button>
          );
        })()}
      </div>
    </div>
  );
}
