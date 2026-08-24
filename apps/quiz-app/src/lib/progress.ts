import type { Progress, AnswerRecord, Question, Stats, SrsState, SrsMeta, UiLang, LearnSettings } from '../types';

/** 错题移出阈值随历史难度递增（错过越多，需要越多连对才放行）：
 *  - wrongCount<=1（只错过 1 次）→ 连对 1 次即移出（简单题快放）
 *  - wrongCount===2（轻度反复）→ 连对 2 次
 *  - wrongCount>=3（硬骨头）→ 连对 3 次（保持严管，封顶）
 *  返回值表示"需要连对几次才视为掌握"。 */
export function streakToPass(wrongCount: number): number {
  if (wrongCount <= 1) return 1;
  if (wrongCount === 2) return 2;
  return 3; // wrongCount >= 3，封顶
}

export function emptyProgress(): Progress {
  return { version: 1, answers: {}, read: {} };
}

/** 取一条答题记录的"定序时间戳"：墓碑优先（删除意图的时间），否则 submittedAt。
 *  mergeProgress 用它让墓碑与正常记录公平竞争——墓碑新于记录=已删，记录新于墓碑=复活。
 *  这是修复「重做本题集」失效的核心：writeProgress 是 read-merge-write（防多 tab 并发覆盖），
 *  直接删 key 会被旧快照补回；改成打墓碑后，merge 时墓碑的时间戳胜出，删除才持久化到磁盘。 */
function recTs(r: AnswerRecord): number {
  return r.deletedAt ?? r.submittedAt;
}

/** 取一张卡的定序时间戳：墓碑优先，否则 updatedAt。与 recTs 同构。 */
function srsTs(s: SrsState): number {
  return s.deletedAt ?? s.updatedAt;
}

/** 一条答题记录是否已被墓碑标记（读端过滤用）。 */
function isDeleted(r: AnswerRecord | undefined): boolean {
  return !!r && r.deletedAt !== undefined;
}
/** UI 用的 exported 版本：Practice 等页面读 progress.answers[id] 时，墓碑记录应视为"未答"。 */
export function isAnswerDeleted(r: AnswerRecord | undefined): boolean {
  return isDeleted(r);
}
/** 是否来自"随机20题"沙盒（读端主进度统计过滤用）。墓碑记录不算（已删）。
 *  fromRandom 记录只进错题本（wrongIds 保留），不计入 computeStats / 覆盖明细 / "上次答到"。 */
export function isFromRandom(r: AnswerRecord | undefined): boolean {
  return !!r && r.fromRandom === true && !isDeleted(r);
}
/** 一张卡是否已被墓碑标记（resetSrs 后）：闪卡页读 progress.srs[id] 时应视为新卡。 */
export function isCardDeleted(s: SrsState | undefined): boolean {
  return !!s && s.deletedAt !== undefined;
}

export function applyAnswer(p: Progress, id: string, rec: AnswerRecord): Progress {
  return { ...p, answers: { ...p.answers, [id]: rec } };
}

/** 计算错题的连续答对进度（streak）：答错(归0/入错题集)，答对+1，自评保持原值。
 *  返回 undefined 表示该题与错题无关（从未答错过且本次非答错），不应进错题集。 */
export function nextStreak(correct: boolean | null, prev?: number): number | undefined {
  if (correct === null) return prev;            // 自评：不动 streak
  if (correct === false) return 0;              // 答错：(重新)进入错题集
  // correct === true
  if (prev === undefined) return undefined;     // 从未答错的题答对了 → 非错题
  return prev + 1;                              // 错题连续答对 +1
}

/** 累计答错次数：答错 +1，答对/自评保持原值。
 *  返回 undefined 表示该题从未答错（不入 wrongCount 字段，向后兼容老数据）。
 *  与 nextStreak 独立维护——streak 描述"近期掌握"会归零，wrongCount 描述"历史难度"只增不减。 */
export function nextWrongCount(correct: boolean | null, prev?: number): number | undefined {
  if (correct === false) return (prev ?? 0) + 1;  // 答错 → 累计 +1
  return prev;                                    // 答对/自评 → 保持（undefined 仍为 undefined）
}

/** 标记一题为「已看」（重复标记刷新时间戳，不产生重复 key） */
export function markRead(p: Progress, id: string): Progress {
  return { ...p, read: { ...(p.read ?? {}), [id]: Date.now() } };
}

/** 一道题是否处于"已看"状态：有 read 时间戳，且未被墓碑删除（墓碑新于 read 时间戳）。
 *  readTombstones[id] >= read[id] 表示删除意图晚于已看 → 视为未看（重看本题集用）。 */
export function isRead(p: Progress, id: string): boolean {
  const seen = p.read?.[id];
  if (seen === undefined) return false;
  const tomb = p.readTombstones?.[id];
  return tomb === undefined ? true : seen > tomb;
}

/** 已看过的题 id 列表（过滤墓碑） */
export function readIds(p: Progress): string[] {
  return Object.keys(p.read ?? {}).filter((id) => isRead(p, id));
}

/** 统计题库内已看题数（过滤题库已删除的陈旧 id + 墓碑） */
export function readCount(p: Progress, questions: Question[]): number {
  let n = 0;
  for (const q of questions) if (isRead(p, q.id)) n++;
  return n;
}

/** 统计：自评题(correct===null)不计入正确率分母；墓碑记录(deletedAt)视为未答；
 *  随机沙盒记录(fromRandom)不计入主进度（已答%/正确率）——它只进错题本。 */
export function computeStats(p: Progress, questions: Question[]): Stats {
  const total = questions.length;
  let answered = 0, correct = 0, wrong = 0, graded = 0;
  for (const q of questions) {
    const rec = p.answers[q.id];
    if (!rec || isDeleted(rec)) continue;
    if (isFromRandom(rec)) continue;  // 随机沙盒记录不进主进度统计（错题本另算）
    answered++;
    if (rec.correct === true) { correct++; graded++; }
    else if (rec.correct === false) { wrong++; graded++; }
    // correct===null: 自评，计入 answered 但不计入 graded
  }
  return { total, answered, correct, wrong, accuracy: graded === 0 ? 0 : correct / graded };
}

/** 列表口径统计：与 computeStats 的唯一区别是 fromRandom 记录【计入】answered/对错。
 *  供 Practice 页用——那里"已答"指行为意义上的答过（沙盒答错的题在列表里同样被锁、
 *  显示已作答态，头部进度也计入）。canFinish / 完成总结 / 头部分子必须同口径，
 *  否则出现"头部 7/7 但完成按钮点不出总结"的死点击（2026-08-17 踩过）。 */
export function computeListStats(p: Progress, questions: Question[]): Stats {
  const total = questions.length;
  let answered = 0, correct = 0, wrong = 0, graded = 0;
  for (const q of questions) {
    const rec = p.answers[q.id];
    if (!rec || isDeleted(rec)) continue;
    answered++;
    if (rec.correct === true) { correct++; graded++; }
    else if (rec.correct === false) { wrong++; graded++; }
  }
  return { total, answered, correct, wrong, accuracy: graded === 0 ? 0 : correct / graded };
}

/** 错题集：曾经答错过(streak 被维护)且连续答对未达阈值的题。掌握后自动移出。
 *  阈值按 wrongCount 自适应（streakToPass）：错过越多需越多连对。
 *  旧记录可能没 wrongCount 字段 → 按 1 兜底（视同只错过 1 次，连对 1 次即移出），
 *  避免历史错题卡在新机制下。
 *  传 questions 时过滤掉题库已删除的陈旧 id，避免错题数虚高（与 readCount 对齐）。
 *
 *  ⭐ fromRandom 记录【保留】在错题集里：随机20题答错的题要进错题本让用户复习，
 *  与 computeStats/覆盖明细跳过 fromRandom 的"主进度统计"口径相反——错题本和主进度是两套口径。
 *  错题重练里答对达标后 streak 达阈值自然移出，走完整错题生命周期。 */
export function wrongIds(p: Progress, questions?: Question[]): string[] {
  const valid = questions ? new Set(questions.map((q) => q.id)) : null;
  return Object.entries(p.answers)
    .filter(([, r]) => !isDeleted(r) && r.streak !== undefined && r.streak < streakToPass(r.wrongCount ?? 1))
    .filter(([id]) => !valid || valid.has(id))
    .map(([id]) => id);
}

/** 生成一条答题墓碑记录：带 deletedAt 时间戳，submittedAt 同步置为同一时刻兜底，
 *  selected/correct 给空值确保万一漏过滤也不计分。 */
function tombstone(now: number): AnswerRecord {
  return { selected: [], correct: null, submittedAt: now, deletedAt: now };
}

/** 重置错题：对所有错题记录（streak 被维护过的题）打墓碑，保留答对的与看题进度。
 *  注意：用墓碑而非删 key——writeProgress 是 read-merge-write，删 key 会被旧快照补回，
 *  打墓碑后 merge 时墓碑时间戳胜出，删除才持久化到磁盘。
 *  传 ids 时只清命中的题（多主题隔离：UI 传激活主题的题 id 集，不误伤其他主题进度）。 */
export function resetWrong(p: Progress, now = Date.now(), ids?: string[]): Progress {
  const scope = ids ? new Set(ids) : null;
  const answers: Record<string, AnswerRecord> = {};
  for (const [id, r] of Object.entries(p.answers)) {
    answers[id] = r.streak !== undefined && (!scope || scope.has(id)) ? tombstone(now) : r;
  }
  return { ...p, answers };
}

/** 重置看题：对所有 read key 打墓碑（写入 readTombstones），不动 read 本身。
 *  读端 isRead 会因 readTombstones[id] >= read[id] 视为未看。
 *  同样用墓碑——直接清 read:{} 会被 merge 补回。
 *  传 ids 时只清命中的题（多主题隔离，同 resetWrong）。 */
export function resetRead(p: Progress, now = Date.now(), ids?: string[]): Progress {
  const scope = ids ? new Set(ids) : null;
  const tombs = { ...(p.readTombstones ?? {}) };
  for (const id of Object.keys(p.read ?? {})) {
    if (!scope || scope.has(id)) tombs[id] = now;
  }
  return { ...p, readTombstones: tombs };
}

/** 重置指定题目的答题记录：对命中 id 打墓碑（连同错题进度）。
 *  用于"重做本题集"——只清当前主题/列表的题，不动其他主题、看题、闪卡进度。
 *  用墓碑而非删 key（同 resetWrong 的理由）。命中但本就无记录的 id 不写墓碑（无意义）。 */
export function resetAnswersByIds(p: Progress, ids: string[], now = Date.now()): Progress {
  const idSet = new Set(ids);
  const answers: Record<string, AnswerRecord> = {};
  let touched = false;
  for (const [id, r] of Object.entries(p.answers)) {
    if (idSet.has(id)) { answers[id] = tombstone(now); touched = true; }
    else answers[id] = r;
  }
  // 命中但本就无记录的 id：也要打墓碑，否则服务器旧快照里有记录会被 merge 补回
  if (!touched || idSet.size > Object.keys(answers).length) {
    for (const id of idSet) if (!answers[id]) answers[id] = tombstone(now);
  }
  return { ...p, answers };
}

/** 重置指定题目的看题记录：对命中 id 打墓碑（写入 readTombstones），不动 read 本身。
 *  用于看题模式"重看本题集"——只清当前列表的看题进度，不动其他主题、答题、闪卡进度。
 *  与 resetAnswersByIds 对称。无论该 id 当前是否在 read 里都打墓碑（防旧快照补回）。 */
export function resetReadByIds(p: Progress, ids: string[], now = Date.now()): Progress {
  const tombs = { ...(p.readTombstones ?? {}) };
  for (const id of ids) tombs[id] = now;
  return { ...p, readTombstones: tombs };
}

/** 重置闪卡：对所有 srs 卡打墓碑 + 今日新卡计数归零，保留答题与看题进度。
 *  用墓碑——直接清 srs:{} 会被 merge 补回（与 resetWrong 同因）。
 *  传 ids 时只清命中的卡（多主题隔离：UI 传激活主题的闪卡 id 集）。
 *  srsMeta（每日新卡配额）保持全局清零——配额有意跨主题共享，防一天灌多主题。 */
export function resetSrs(p: Progress, now = Date.now(), ids?: string[]): Progress {
  const scope = ids ? new Set(ids) : null;
  const srs: Record<string, SrsState> = {};
  for (const [id, s] of Object.entries(p.srs ?? {})) srs[id] = (!scope || scope.has(id)) ? { ...s, deletedAt: now } : s;
  return { ...p, srs, srsMeta: undefined };
}

/** 把时间戳转成稳定的 YYYY-MM-DD（本地时区）。
 *  用 ISO 日期而非 toDateString()：前者字典序即时间序（跨设备/跨天比较可靠），
 *  后者带星期名（'Sun'<'Mon' 字典序与时间序不一致），不能直接比较大小。 */
export function dayKey(now: number): string {
  const d = new Date(now);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 今日已引入的新卡数（跨天自动归零）。用于"每日新卡配额"。 */
export function newCardsToday(p: Progress, now = Date.now()): number {
  const meta = p.srsMeta;
  if (!meta) return 0;
  return meta.newTodayDate === dayKey(now) ? meta.newToday : 0;
}

/** 记一张新卡（评分新卡时调用）：同日 +1，跨天重置为 1。返回带更新 srsMeta 的 Progress。 */
export function noteNewCard(p: Progress, now = Date.now()): Progress {
  const today = dayKey(now);
  const prev = p.srsMeta;
  const nextMeta: SrsMeta =
    prev && prev.newTodayDate === today
      ? { newToday: prev.newToday + 1, newTodayDate: today }
      : { newToday: 1, newTodayDate: today };
  return { ...p, srsMeta: nextMeta };
}

/** 写入一张卡的 SRS 状态 */
export function applySrs(p: Progress, cardId: string, state: SrsState): Progress {
  return { ...p, srs: { ...(p.srs ?? {}), [cardId]: state } };
}

// —— 课程已读（完成边界「课全读」的机读口径）——

/** 课程已读 key："<theme>/<lesson文件名>"。主题前缀让多主题天然隔离，
 *  与 sync-examples.mjs 产出的 src/data/courses.json 清单（{theme, lessons:[{file}]})对账。 */
export function courseKey(theme: string, file: string): string {
  return `${theme}/${file}`;
}

/** 标记一节课已读（重复标记刷新时间戳——merge 取 per-key max，跨设备 LWW）。 */
export function markCourseRead(p: Progress, theme: string, file: string, now = Date.now()): Progress {
  return { ...p, coursesRead: { ...(p.coursesRead ?? {}), [courseKey(theme, file)]: now } };
}

/** 一节课是否已读（无记录即未读；本字段无墓碑，不存在"标记后取消"态）。 */
export function isCourseRead(p: Progress, theme: string, file: string): boolean {
  return p.coursesRead?.[courseKey(theme, file)] !== undefined;
}

/** 合并 read 字段：每个题 id 取时间戳较新者 */
function mergeRead(a: Record<string, number> | undefined, b: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const x = a?.[k] ?? 0;
    const y = b?.[k] ?? 0;
    out[k] = x >= y ? x : y;
  }
  return out;
}

/** 合并 srs 字段：每张卡按定序时间戳（墓碑优先，否则 updatedAt）取较新者。
 *  与 answers 合并同构——墓碑参与竞争，让 resetSrs 的删除意图能持久化。 */
function mergeSrs(a: Record<string, SrsState> | undefined, b: Record<string, SrsState> | undefined): Record<string, SrsState> {
  const out: Record<string, SrsState> = {};
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const x = a?.[k], y = b?.[k];
    if (x && y) out[k] = srsTs(x) >= srsTs(y) ? x : y;
    else out[k] = (x || y)!;
  }
  return out;
}

/** 合并 readTombstones：两侧取 max（合并删除意图集合）。
 *  每个 id 的墓碑时间戳越大=删除意图越新，覆盖旧时间戳。 */
function mergeReadTombstones(a: Record<string, number> | undefined, b: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  const keys = new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})]);
  for (const k of keys) {
    const x = a?.[k] ?? 0;
    const y = b?.[k] ?? 0;
    out[k] = x >= y ? x : y;
  }
  return out;
}

/** 合并 srsMeta（今日新卡计数）：取日期较新者；同日取 newToday 较大者（两设备各学几张取并集）。
 *  newTodayDate 用 YYYY-MM-DD，字典序即时间序，可直接 > 比较取较近日期。 */
function mergeSrsMeta(a: SrsMeta | undefined, b: SrsMeta | undefined): SrsMeta | undefined {
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;
  if (a.newTodayDate === b.newTodayDate) {
    return { newTodayDate: a.newTodayDate, newToday: Math.max(a.newToday, b.newToday) };
  }
  // 不同日：YYYY-MM-DD 字典序即时间序，取较大（更近）者
  return a.newTodayDate > b.newTodayDate ? a : b;
}

/** 合并主题偏好（UI 偏好，非学习进度）：按 themeUpdatedAt 取新者（LWW）。
 *  与 mergeSrsMeta 同构——无时间戳字段无法做 per-field 仲裁，故用独立的 themeUpdatedAt。
 *  必须显式处理：mergeProgress 返回的是枚举字段的对象字面量，不列就不带过去。 */
function mergeTheme(
  a: { theme?: 'light' | 'dark' | 'system'; themeUpdatedAt?: number } | undefined,
  b: { theme?: 'light' | 'dark' | 'system'; themeUpdatedAt?: number } | undefined,
): { theme?: 'light' | 'dark' | 'system'; themeUpdatedAt?: number } {
  if (!a?.theme && !b?.theme) return {};
  if (!a?.theme) return { theme: b!.theme, themeUpdatedAt: b!.themeUpdatedAt };
  if (!b?.theme) return { theme: a.theme, themeUpdatedAt: a.themeUpdatedAt };
  // 两端都有：按 themeUpdatedAt 取新（相等时取 local/a，与 answers >= 逻辑一致）
  return (a.themeUpdatedAt ?? 0) >= (b.themeUpdatedAt ?? 0)
    ? { theme: a.theme, themeUpdatedAt: a.themeUpdatedAt }
    : { theme: b.theme, themeUpdatedAt: b.themeUpdatedAt };
}

/** 合并语言偏好（UI 偏好，非学习进度）：与 mergeTheme 同构的 LWW，按 langUpdatedAt 取新。 */
function mergeLang(
  a: { lang?: UiLang; langUpdatedAt?: number } | undefined,
  b: { lang?: UiLang; langUpdatedAt?: number } | undefined,
): { lang?: UiLang; langUpdatedAt?: number } {
  if (!a?.lang && !b?.lang) return {};
  if (!a?.lang) return { lang: b!.lang, langUpdatedAt: b!.langUpdatedAt };
  if (!b?.lang) return { lang: a.lang, langUpdatedAt: a.langUpdatedAt };
  // 两端都有：按 langUpdatedAt 取新（相等时取 local/a，与 answers >= 逻辑一致）
  return (a.langUpdatedAt ?? 0) >= (b.langUpdatedAt ?? 0)
    ? { lang: a.lang, langUpdatedAt: a.langUpdatedAt }
    : { lang: b.lang, langUpdatedAt: b.langUpdatedAt };
}

/** 合并学习偏好（设置面板）：与 mergeTheme 同构的 LWW，按 settingsUpdatedAt 整块取新。
 *  不做 per-field 合并——三个偏好来自同一面板，拆开合并可能拼出两端各一半的混合态。 */
function mergeSettings(
  a: { settings?: LearnSettings; settingsUpdatedAt?: number } | undefined,
  b: { settings?: LearnSettings; settingsUpdatedAt?: number } | undefined,
): { settings?: LearnSettings; settingsUpdatedAt?: number } {
  if (!a?.settings && !b?.settings) return {};
  if (!a?.settings) return { settings: b!.settings, settingsUpdatedAt: b!.settingsUpdatedAt };
  if (!b?.settings) return { settings: a.settings, settingsUpdatedAt: a.settingsUpdatedAt };
  return (a.settingsUpdatedAt ?? 0) >= (b.settingsUpdatedAt ?? 0)
    ? { settings: a.settings, settingsUpdatedAt: a.settingsUpdatedAt }
    : { settings: b.settings, settingsUpdatedAt: b.settingsUpdatedAt };
}

/** 合并本地与服务器进度：answers 按定序时间戳（墓碑优先，否则 submittedAt）取新，
 *  read 按时间戳取新，readTombstones 取 max，srs 按 srsTs（墓碑优先）取新。
 *  墓碑参与定序是关键——让 reset 类操作的删除意图能在 read-merge-write 下持久化。 */
export function mergeProgress(local: Progress, remote: Progress): Progress {
  const answers: Record<string, AnswerRecord> = {};
  const keys = new Set([...Object.keys(local.answers), ...Object.keys(remote.answers)]);
  for (const k of keys) {
    const a = local.answers[k], b = remote.answers[k];
    if (a && b) answers[k] = recTs(a) >= recTs(b) ? a : b;
    else answers[k] = (a || b)!;
  }
  return {
    version: 1,
    answers,
    read: mergeRead(local.read, remote.read),
    readTombstones: mergeReadTombstones(local.readTombstones, remote.readTombstones),
    // 课程已读：与 read 同款 per-key max（LWW）。key 自带主题前缀，多主题互不干扰。
    coursesRead: mergeRead(local.coursesRead, remote.coursesRead),
    srs: mergeSrs(local.srs, remote.srs),
    srsMeta: mergeSrsMeta(local.srsMeta, remote.srsMeta),
    ...mergeTheme(
      { theme: local.theme, themeUpdatedAt: local.themeUpdatedAt },
      { theme: remote.theme, themeUpdatedAt: remote.themeUpdatedAt },
    ),
    ...mergeLang(
      { lang: local.lang, langUpdatedAt: local.langUpdatedAt },
      { lang: remote.lang, langUpdatedAt: remote.langUpdatedAt },
    ),
    ...mergeSettings(
      { settings: local.settings, settingsUpdatedAt: local.settingsUpdatedAt },
      { settings: remote.settings, settingsUpdatedAt: remote.settingsUpdatedAt },
    ),
  };
}
