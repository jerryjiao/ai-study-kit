// retest.mjs — 隔期复测候选派生（纯函数，零 LLM；#133 / spec #131 复习闭环 2/4）。
//
// 规则单源（决议 #129「证据派生 + 每会话 1 目标，寄生既有抽背位」；验证范围 #127 短口述先行）：
//
//   入选三条件（同时满足，按目标身份键聚合——ep → 图节点 → 名字，与台账/口述流水同一套）：
//     ① 口述错因台账里该目标有 status=open 条目（消费端按后续口述流水派生：该目标最近一次
//        后续口述不是答对——deriveMisconceptionStatuses 口径）；
//     ② 该目标口头四态非 mastered（oralMastery 口径：加权分 ≥0.85 才 mastered）——与 ① 双闸：
//        「已纠正/已掌握的旧错误不被当成今天仍错」，无论历史错多少次；
//     ③ 当天（本地日历日）该目标尚无任何口述记录（srsDue 抽背 / 微块 / 预告认领产生的
//        oral-attempts 均算——多通道同目标去重，只考一次）。
//
//   时机：不设固定间隔、不新增间隔算法——复测时机 = 学习者下一次进入会话，间隔由自然回访
//        节奏决定；当天已答口述的目标即从入选面退场（等消费端按流水判 corrected），下次会话
//        按当前状态重新判入选。三周未回也不堆叠到期清单——派生无状态，回来时仍是当前可完成
//        的小动作。
//
//   预算：每会话最多 1 个目标 × 1-2 题（提问、答错后再验与编排口径单源 F10「隔期复测」节；
//        与 srsDue 抽背同池合计 ≤3 题、自动并入 F10 第 0 步抽背位由 #134 收口，本库只管选择）。
//
//   多目标积压：每会话取 1 个——open 条目里四态最弱者优先（rankOralWeakness 同款排序：
//        weak → inProgress → untouched（无口述数据排最后）；同档加权分低者先；再问数多者先；
//        最后最新 open 条目观察时间新者先——确定性 tiebreak）。其余静默留待后续会话，
//        不向学习者陈列（candidates 全量只给 agent 消费，会话里只用 pick 一个）。
//
//   出题依据：沿台账 diagnosis 出同根因变体（非原题重放），diagnosis 缺省回退 observed——
//        候选携带 open 条目清单（最新在前），coach 据此出题与解释「为何选它」（observed 事实
//        与 diagnosis 推断分开引述，契约二口径）。
//
//   零闪卡：入选不依赖 srsDue（那是闪卡通道触发）——open 条目直接带出复测，补上「开场抽背
//        依赖闪卡」的空档（#129 已决）。
//
//   案例边界（#127）：source=case 的既有判定照进口头四态（只读不排），但复测出题与结果一律
//        短口述形态（source=recall/recite，不新增枚举），不把 case 对错改造成短口述成绩，
//        也不排「按评分点的完整大题再验」。
//
//   诚实降级：无台账 / 台账为空 → null（报告字段静默缺席，复测通道不出现，零变化）；有台账
//        但无候选 → pick=null + excluded 计数（如实：全 corrected / 当天已答 / 已 mastered），
//        不编造候选、不强制创建复测计划。
//
//   时间口径：now 注入面只存在于隔离夹具（同口述流水红线：真实学习数据用真实事件时间）；
//        真实消费（mastery-report）一律传 Date.now()。「当天」按本地日历日比较（学习者机器时区）。
import { deriveMisconceptionStatuses, groupAttemptsByIdentity, misconceptionIdentity, oralIdentityKey } from './misconceptions.mjs';
import { oralMastery } from './oral.mjs';

/** 本地日历日键（学习者机器时区）——「当天已答」按日历日比较，不看小时。 */
function localDayKey(ms) {
  const d = new Date(ms);
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** 弱项档位（rankOralWeakness 同款：weak 最先；untouched 无口述数据、证据最弱，排最后不丢候选）。 */
const WEAK_RANK = { weak: 0, inProgress: 1, untouched: 2 };

/**
 * 派生隔期复测候选（纯函数，不改写输入）。
 * @param {object} p
 * @param {Array<object>} p.entries       台账条目（readMisconceptions 产物——已按主题过滤）
 * @param {Array<object>} p.attempts      口述流水（主题包 ∪ progress 回流并流后的唯一真源）
 * @param {object} [p.resolveOpts]        { epNames, graphMap, graphNodes }（身份解析用，同 groupOralAttempts）
 * @param {number} [p.now]                当前时间（真实消费必传 Date.now()；隔离夹具可注入）
 * @returns {null | { pick: object|null, candidates: Array<object>, excluded: { notOpen: number, answeredToday: number, mastered: number } }}
 *   null = 无台账（消费端字段静默缺席）。候选形状：
 *   { target, ep, node, name, via, located, oral: { asked, correct, score, status },
 *     openCount, misconceptions: [{ target, observed, diagnosis, questionId? }] }（open 条目最新在前）
 */
export function deriveRetest({ entries = [], attempts = [], resolveOpts = {}, now = Date.now() } = {}) {
  if (!entries.length) return null;
  const derived = deriveMisconceptionStatuses(entries, attempts, resolveOpts);

  // 身份 → 口述流水（口头四态输入）+ 当天已有口述（条件③，任何通道的 oral-attempts 都算）
  const attemptsByIdentity = groupAttemptsByIdentity(attempts, resolveOpts);
  const todayKey = localDayKey(now);
  const answeredToday = new Set();
  for (const a of attempts) {
    if (localDayKey(a.at) === todayKey) answeredToday.add(oralIdentityKey(a.target, resolveOpts));
  }

  // 身份 → open 条目聚合（条件①；最新在前——出题与解释取第一条）
  const openByIdentity = new Map();
  for (const e of derived) {
    if (e.status !== 'open') continue;
    const key = misconceptionIdentity(e);
    if (!openByIdentity.has(key)) openByIdentity.set(key, []);
    openByIdentity.get(key).push(e);
  }

  const excluded = { notOpen: 0, answeredToday: 0, mastered: 0 };
  const shape = (e) => ({
    target: e.target,
    observed: { ...e.observed },
    diagnosis: e.diagnosis ? { ...e.diagnosis } : null,
    ...(e.questionId ? { questionId: e.questionId } : {}),
  });
  const candidates = [];
  for (const [key, openEntries] of openByIdentity) {
    openEntries.sort((a, b) => b.observed.at - a.observed.at);
    const latest = openEntries[0];
    if (answeredToday.has(key)) { excluded.answeredToday++; continue; }   // 条件③：当天该目标已考过（任何通道）
    const oral = oralMastery(attemptsByIdentity.get(key) ?? []);
    if (oral.status === 'mastered') { excluded.mastered++; continue; }    // 条件②：双闸——口头已掌握的旧错不重提
    candidates.push({
      target: latest.target,
      ep: latest.ep ?? null,
      node: latest.node ?? null,
      name: latest.name ?? latest.target,
      via: latest.via ?? null,
      located: !!(latest.ep ?? latest.node),
      oral: { asked: oral.asked, correct: oral.correct, score: oral.score, status: oral.status },
      openCount: openEntries.length,
      misconceptions: openEntries.map(shape),
    });
  }
  // 有条目但无 open 条目的身份（全 corrected——recurred 身份必有更晚的 open 同根因条目）如实计数
  const seenNoOpen = new Set();
  for (const e of derived) {
    const key = misconceptionIdentity(e);
    if (!openByIdentity.has(key) && !seenNoOpen.has(key)) { seenNoOpen.add(key); excluded.notOpen++; }
  }

  // 弱项排序（rankOralWeakness 同款 + 确定性 tiebreak）：pick = 排序第一，其余静默留待后续会话
  candidates.sort((a, b) =>
    (WEAK_RANK[a.oral.status] - WEAK_RANK[b.oral.status])
    || ((a.oral.score ?? 2) - (b.oral.score ?? 2))
    || (b.oral.asked - a.oral.asked)
    || (b.misconceptions[0].observed.at - a.misconceptions[0].observed.at));
  return { pick: candidates[0] ?? null, candidates, excluded };
}
