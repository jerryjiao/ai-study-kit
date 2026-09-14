// panorama.mjs — 考点全景图数据层（纯函数，无 IO）。
//
// 三信号口径（v0.13，spec #38）：
//   taught 讲过    契约二学习记录（已过考点）覆盖的考点 ∪ 课已学完（全部课读完 =
//                  课程通道讲过；部分读完不归因到考点——课→考点无逐一映射，宁可少报不虚报）
//   practiced 练过 该考点下有答题记录（answered > 0），或口头问答 > 0（弱信号——聊天层
//                  的口头问答也算练；v0.14 起口头计数唯一真源 = 口头答题流水
//                  oral-attempts.json，旧记录手写「口头题计数」节照读合并）
//   mastered 掌握  掌握度四态判据不变（masteryByExamPoint，题 + 闪卡双通道）
//
// 分组：按 MISSION 排布表 day 列（epDayMap）；无 day 归「未排程」组，无排布表全部归该组。
// 排序：day 按排布表出现顺序（D1、D2…自然序兜底），「未排程」垫底。
//
// ⚠️ src/lib/panorama.ts 是本文件的 TS 移植（web 首页面板用），口径必须两边同步——
// 沿掌握度 mastery.mjs/mastery.ts 双实现先例。web 侧消费的是内容无关覆盖快照（sync 产物），
// 本文件同时是快照生成的判据源。
import { masteryByExamPoint } from './mastery.mjs';
import { aggregateOral } from './oral.mjs';

/**
 * 全景聚合。
 * @param {object} p
 * @param {Array}  p.questions    主题题库（examPoint EP-NN）
 * @param {object} p.answers      progress.answers
 * @param {object} [p.srs]        progress.srs
 * @param {Array}  [p.flashcards] 主题闪卡（可选 examPoint）
 * @param {object} [p.epNames]    epNameMap 输出（EP → 考点名，名字匹配 records 用）
 * @param {object} [p.epDays]     epDayMap 输出（EP → day 分组）
 * @param {Array}  [p.records]    parseSessionRecord 输出数组（契约二学习记录，可空；旧「口头题计数」照读合并）
 * @param {Array}  [p.oralAttempts] 口头答题流水明细（readOralAttempts 输出，v0.14 起口头计数的唯一真源）
 * @param {object} [p.coursesRead]  { lessonsTotal, lessonsDone }（课已学完口径；done=total>0 触发课程通道讲过）
 * @returns {{theme 字段由调用方补；本函数返回 summary + groups}}
 */
export function buildPanorama({
  questions, answers = {}, srs = {}, flashcards = [], epNames = {}, epDays = {},
  records = [], oralAttempts = [], coursesRead = { lessonsTotal: 0, lessonsDone: 0 },
}) {
  const { points } = masteryByExamPoint({ questions, answers, epNames, flashcards, srs });

  // 契约二记录 → 每个 EP 的覆盖证据。匹配两路：显式 EP 前缀（记录写「EP-01 暂存区」）或
  // 名字精确匹配排布表考点名（记录写「暂存区」）。
  const taughtByEp = new Map();
  const recordHits = (entry) => {
    if (!entry) return [];
    const targets = new Set();
    if (entry.ep) targets.add(entry.ep);
    if (entry.name) {
      for (const [ep, name] of Object.entries(epNames)) {
        if (name === entry.name) targets.add(ep);  // 显式 EP 与名字命中同一考点时去重
      }
    }
    return [...targets];
  };
  for (const rec of records || []) {
    for (const passed of rec.passed || []) {
      for (const ep of recordHits(passed) ?? []) taughtByEp.set(ep, true);
    }
  }
  // 口头计数（v0.14 起唯一真源 = 口头答题流水；旧记录手写计数节照读合并，旧值不丢）：
  const oralByEp = new Map();
  const bumpOral = (ep, asked, correct) => {
    const cur = oralByEp.get(ep) ?? { asked: 0, correct: 0 };
    cur.asked += asked;
    cur.correct += correct;
    oralByEp.set(ep, cur);
  };
  for (const rec of records || []) {
    for (const oral of rec.oral || []) {
      for (const ep of recordHits(oral) ?? []) bumpOral(ep, oral.asked, oral.correct);
    }
  }
  const ledgerOral = aggregateOral(oralAttempts, { epNames });
  for (const [ep, c] of ledgerOral.byEp) bumpOral(ep, c.asked, c.correct);
  // 课程通道：全部课已学完 → 课程把整个大纲讲过一遍（部分读完不归因，宁少报不虚报）
  const courseTaughtAll = coursesRead.lessonsTotal > 0
    && coursesRead.lessonsDone === coursesRead.lessonsTotal;

  const dayOrder = [];
  for (const ep of points.map((p) => p.ep)) {
    const day = epDays[ep];
    if (day && !dayOrder.includes(day)) dayOrder.push(day);
  }
  dayOrder.sort((a, b) => a.localeCompare(b, 'zh-Hans-CN', { numeric: true }));

  const groupMap = new Map();
  for (const p of points) {
    const day = epDays[p.ep] || '未排程';
    if (!groupMap.has(day)) groupMap.set(day, []);
    const oral = oralByEp.get(p.ep) ?? null;
    groupMap.get(day).push({
      ep: p.ep,
      name: p.name,
      taught: taughtByEp.has(p.ep) || courseTaughtAll,
      practiced: !!(p.answered > 0 || (oral && oral.asked > 0)),
      mastered: p.status === 'mastered',
      // 展示用附加信号（不参与三信号判定，全景卡/弱点点名用）
      status: p.status,
      answered: p.answered,
      total: p.total,
      openWrong: p.openWrongIds.length,
      oral,
    });
  }

  const groupKeys = [...groupMap.keys()].sort((a, b) => {
    if (a === '未排程') return 1;
    if (b === '未排程') return -1;
    const ia = dayOrder.indexOf(a), ib = dayOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
  });

  const groups = groupKeys.map((day) => {
    const pts = groupMap.get(day);
    return {
      day,
      points: pts,
      summary: {
        total: pts.length,
        taught: pts.filter((x) => x.taught).length,
        practiced: pts.filter((x) => x.practiced).length,
        mastered: pts.filter((x) => x.mastered).length,
      },
    };
  });

  const all = groups.flatMap((g) => g.points);
  return {
    summary: {
      examPoints: all.length,
      taught: all.filter((x) => x.taught).length,
      practiced: all.filter((x) => x.practiced).length,
      mastered: all.filter((x) => x.mastered).length,
    },
    courseTaughtAll,
    groups,
  };
}
