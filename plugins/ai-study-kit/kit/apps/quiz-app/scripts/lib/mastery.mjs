// mastery.mjs — 考点掌握度判据（纯函数，无 IO）。
//
// 口径与 src/lib/progress.ts 的 wrongIds/streakToPass 保持一致：
// 错题毕业 = streak ≥ streakToPass(wrongCount)，阈值随历史错次递增。
//
// 掌握度判据（v1，题维度）：
//   mastered    考点下全部题已作答、最近一次全对、且无未毕业错题
//   weak        存在未毕业错题，或最近一次有答错的题
//   inProgress  有作答且无负面证据（未答错、无未毕业错题），但未答全或含未评自测题
//   untouched   一题未答
//
// 闪卡毕业组件刻意不做：flashcards.json 的 topic 是粗粒度主题（如 git/linux），
// 与考点（EP-NN）无映射，硬凑会产生假判据。边界说明见 CONTEXT.md「考点掌握度」词条。
//
// 多主题隔离：只遍历传入 questions 的 id，answers 里其他主题的记录天然不参与。

/** 错题毕业阈值（与 src/lib/progress.ts streakToPass 一致，改这里必须同步改那边）。 */
export function streakToPass(wrongCount) {
  if (wrongCount <= 1) return 1;
  if (wrongCount === 2) return 2;
  return 3; // wrongCount >= 3，封顶
}

/** 记录是否仍是未毕业错题（与 grill-utils isWrong 同口径）。 */
export function isOpenWrong(r) {
  if (!r || r.streak === undefined) return false;
  return r.streak < streakToPass(r.wrongCount ?? 1);
}

/**
 * 从 MISSION.md 考点排布表解析 EP-NN → 考点名 映射。
 * 表格式：`| EP-01 | 暂存区 | 掌握 | ... |`（宽容解析，缺表返回空映射，名字回退 EP id）。
 */
export function epNameMap(missionText) {
  const map = {};
  if (!missionText) return map;
  for (const m of missionText.matchAll(/^\|\s*(EP-\d+)\s*\|\s*([^|]+?)\s*\|/gm)) {
    map[m[1]] = m[2].trim();
  }
  return map;
}

/**
 * 按考点聚合掌握度。
 *
 * @param {object} p
 * @param {Array}  p.questions   主题题库（examPoint 为 EP-NN；无 examPoint 的题不参与考点报告）
 * @param {object} p.answers     progress.answers 原始对象（id → 记录）
 * @param {object} [p.epNames]   epNameMap 的输出，考点显示名
 * @returns {{points: Array, untracked: number}} points 每考点一条，按题库出现顺序
 */
export function masteryByExamPoint({ questions, answers = {}, epNames = {} }) {
  const groups = new Map();
  let untracked = 0;
  for (const q of questions) {
    const ep = q.examPoint;
    if (!ep) { untracked++; continue; }
    if (!groups.has(ep)) groups.set(ep, []);
    groups.get(ep).push(q.id);
  }

  const points = [];
  for (const [ep, ids] of groups) {
    let answered = 0;
    let correctNow = 0;
    const openWrongIds = [];
    for (const id of ids) {
      const r = answers[id];
      // 与 skill 快照口径一致：墓碑=已删、随机沙盒不进主进度
      if (!r || r.deletedAt !== undefined || r.fromRandom) continue;
      answered++;
      if (r.correct === true) correctNow++;
      if (isOpenWrong(r)) openWrongIds.push(id);
    }
    // 负面证据 = 未毕业错题 或 最近一次答错；自评未判（correct===null）只占位不算负面，
    // 但也不构成掌握的正向证据（mastered 要求全部 correct === true）
    const hasNegative = openWrongIds.length > 0 || correctNow + countNeutral(ids, answers) < answered;
    let status;
    if (answered === 0) status = 'untouched';
    else if (hasNegative) status = 'weak';
    else if (answered === ids.length && correctNow === ids.length) status = 'mastered';
    else status = 'inProgress';
    points.push({ ep, name: epNames[ep] || ep, questionIds: ids, total: ids.length, answered, correctNow, openWrongIds, status });
  }
  return { points, untracked };
}

/** answered 里 correct===null（自评未判）的计数，仅供 hasNegative 判断。 */
function countNeutral(ids, answers) {
  let n = 0;
  for (const id of ids) {
    const r = answers[id];
    if (r && r.deletedAt === undefined && !r.fromRandom && r.correct === null) n++;
  }
  return n;
}

/**
 * 弱点排序：weak 在前（未毕业错题数降序，其次当前答错数），再 inProgress（未答数降序）。
 * mastered / untouched 不进榜（没有行动价值）。
 */
export function rankWeakness(points) {
  return points
    .filter((p) => p.status === 'weak' || p.status === 'inProgress')
    .sort((a, b) => {
      const rank = (p) => (p.status === 'weak' ? 0 : 1);
      if (rank(a) !== rank(b)) return rank(a) - rank(b);
      if (a.status === 'weak') {
        const wrongNowA = a.answered - a.correctNow;
        const wrongNowB = b.answered - b.correctNow;
        return (b.openWrongIds.length - a.openWrongIds.length) || (wrongNowB - wrongNowA);
      }
      return (b.total - b.answered) - (a.total - a.answered);
    });
}
