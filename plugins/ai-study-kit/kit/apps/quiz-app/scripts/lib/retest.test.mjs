// retest.test.mjs — 隔期复测候选派生（node:test）。#133 数据面夹具（spec #131 / 决议 #129）：
// 三条件（open / 四态非 mastered 双闸 / 当天该目标无口述）+ 弱项排序 + 当天已答退场 +
// 跨日重新入选 + 午夜边界 + 三周不堆叠 + 复发接续取新条 + 零闪卡（无 srs 输入面——函数不收 srs）。
// now 注入只存在于本隔离夹具（真实消费 mastery-report 一律 Date.now()，同口述流水红线）；
// 夹具时间以真实墙钟为基构造「昨天/今天」本地整点——任何时区下日历日关系恒定。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deriveRetest } from './retest.mjs';
import { deriveMisconceptionStatuses } from './misconceptions.mjs';

const EPNAMES = { 'EP-01': '暂存区', 'EP-03': 'chmod', 'EP-05': '分支模型', 'EP-07': 'revert' };
const OPTS = { epNames: EPNAMES };

/** 本地日历日夹具时间：dayOffset 0=今天、-1=昨天（+N=未来 N 天，只当注入 now 用）。 */
const localAt = (dayOffset, hour, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, min, 0, 0);
  return d.getTime();
};
const YESTERDAY = localAt(-1, 10);

/** 手构台账条目（带落盘归属的规范形态；写入口径正门 buildMisconceptionEntry 已在 misconceptions.test.mjs 单测）。 */
const entry = (over = {}) => {
  const {
    target = 'EP-03 chmod', ep = 'EP-03', node = null, name = 'chmod', via = 'ep',
    observedText = '把 4 说成读权限', observedAt = YESTERDAY, source = 'recall',
    cause = '权限位与八进制对应记反',
  } = over;
  return {
    theme: 't', target, ep, node, name, via,
    observed: { text: observedText, at: observedAt, source },
    diagnosis: cause != null ? { text: cause, at: observedAt } : null,
    questionId: null, status: 'open',
  };
};
const att = (target, correct, at, source = 'recall') => ({ target, correct, at, source });

test('三条件全满足 → 入选；候选带解释依据与出题依据（零闪卡：无 srs 输入面照样派生）', () => {
  const e = entry({ observedAt: YESTERDAY });
  const r = deriveRetest({
    entries: [e],
    attempts: [att('EP-03 chmod', false, YESTERDAY + 5000)],
    resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(r.candidates.length, 1);
  const p = r.pick;
  assert.equal(p.ep, 'EP-03');
  assert.equal(p.located, true);
  assert.deepEqual(p.oral, { asked: 1, correct: 0, score: 0, status: 'weak' });
  assert.equal(p.openCount, 1);
  // 出题依据：observed 事实与 diagnosis 推断分开可引（教练解释「为何选它」的数据面）
  assert.equal(p.misconceptions[0].observed.text, '把 4 说成读权限');
  assert.equal(p.misconceptions[0].diagnosis.text, '权限位与八进制对应记反');
  assert.equal(r.excluded.notOpen, 0);
});

test('条件①闸：后续口述最近一次答对 → corrected → 不入选（历史错误不被当成当前仍错）', () => {
  const e = entry({ observedAt: YESTERDAY });
  const r = deriveRetest({
    entries: [e],
    attempts: [att('EP-03 chmod', false, YESTERDAY + 5000), att('EP-03 chmod', true, YESTERDAY + 9000)],
    resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(r.pick, null);
  assert.deepEqual(r.excluded, { notOpen: 1, answeredToday: 0, mastered: 0 });
});

test('条件②双闸：条目 open 但该目标口头四态已 mastered → 不入选（无论历史错多少次）', () => {
  // 场景：观察来自案例判定（source=case，不进口述流水），此前 recall 通道四连对 → 口头 mastered；
  // 台账无后续口述 → 条目仍 open。双闸挡下：不因旧观察把已掌握目标再说成待复测。
  const e = entry({ observedAt: YESTERDAY + 60_000, source: 'case', cause: null });
  const attempts = [1, 2, 3, 4].map((i) => att('EP-03 chmod', true, YESTERDAY - 100_000 + i * 1000));
  const r = deriveRetest({ entries: [e], attempts, resolveOpts: OPTS, now: localAt(0, 20) });
  assert.equal(r.pick, null);
  assert.equal(r.excluded.mastered, 1);
});

test('案例边界（#127）：case 来源观察 + 无 recall/recite 历史 → 照常入选（短口述形态复测，case 只读不排）', () => {
  const e = entry({ observedAt: YESTERDAY, source: 'case' });
  const r = deriveRetest({ entries: [e], attempts: [], resolveOpts: OPTS, now: localAt(0, 20) });
  assert.equal(r.pick.ep, 'EP-03');
  assert.equal(r.pick.oral.status, 'untouched'); // 无口述数据不阻塞入选（零闪卡同款空档补位）
  assert.equal(r.pick.misconceptions[0].observed.source, 'case'); // 来源如实保留，不改造成口述成绩
});

test('条件③当天已答即退场（任何通道的口述都算）；跨日重新入选；三周未回也不堆叠（恒 ≤1 目标）', () => {
  const e = entry({ observedAt: YESTERDAY });
  const attempts = [att('EP-03 chmod', false, YESTERDAY + 5000), att('EP-03 chmod', false, localAt(0, 9))];
  // 今天：微块通道已考过（判错仍算当天已答——多通道同目标只考一次）
  const today = deriveRetest({ entries: [e], attempts, resolveOpts: OPTS, now: localAt(0, 20) });
  assert.equal(today.pick, null);
  assert.equal(today.excluded.answeredToday, 1);
  // 明天（注入 now）：按当前状态重新判入选——不堆叠、无到期清单
  const tomorrow = deriveRetest({ entries: [e], attempts, resolveOpts: OPTS, now: localAt(1, 9) });
  assert.equal(tomorrow.pick.ep, 'EP-03');
  // 三周后回来：仍只有当前可完成的小动作（≤1 目标），不因久未回放大预算
  const weeksLater = deriveRetest({ entries: [e], attempts, resolveOpts: OPTS, now: localAt(21, 9) });
  assert.equal(weeksLater.candidates.length, 1);
  assert.equal(weeksLater.pick.ep, 'EP-03');
});

test('当天口径的午夜边界：同日 00:05→23:59 算当天；昨日 23:59→今日 00:01 即跨日', () => {
  const e = entry({ observedAt: localAt(-1, 23) });
  // 今天凌晨考过，深夜再看：仍算当天（日历日比较，不看小时）
  const sameDay = deriveRetest({
    entries: [e], attempts: [att('EP-03 chmod', false, localAt(0, 0, 5))], resolveOpts: OPTS, now: localAt(0, 23, 59),
  });
  assert.equal(sameDay.pick, null);
  // 昨天深夜考过，今天零点刚过：跨日 → 重新可选
  const crossMidnight = deriveRetest({
    entries: [e], attempts: [att('EP-03 chmod', false, localAt(-1, 23, 59))], resolveOpts: OPTS, now: localAt(0, 0, 1),
  });
  assert.equal(crossMidnight.pick.ep, 'EP-03');
});

test('多通道去重走身份键：裸名命中排布表同 EP 的当天口述也算「该目标已考」', () => {
  const e = entry({ observedAt: YESTERDAY });
  const r = deriveRetest({
    entries: [e],
    attempts: [att('chmod', false, localAt(0, 9))], // 抽背通道用裸名引用 → 解析到同一 EP-03
    resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(r.pick, null);
  assert.equal(r.excluded.answeredToday, 1);
});

test('弱项排序（rankOralWeakness 同款 + untouched 殿后）与确定性 tiebreak：pick 恒 = 排序第一', () => {
  const e03 = entry({ observedAt: localAt(-1, 11) });                                                    // untouched（无口述）
  const e05 = entry({ target: 'EP-05 分支模型', ep: 'EP-05', name: '分支模型', observedAt: localAt(-1, 10), cause: null, source: 'case' });
  const e01 = entry({ target: 'EP-01 暂存区', ep: 'EP-01', name: '暂存区', observedText: '把 add 说成提交', observedAt: localAt(-1, 9) });
  const e07 = entry({ target: 'EP-07 revert', ep: 'EP-07', name: 'revert', observedText: '把 revert 说成 reset', observedAt: localAt(-1, 9) });
  const attempts = [
    // EP-05：观察前两对（case 判定不进流水）→ 封顶 0.8 inProgress
    att('EP-05 分支模型', true, localAt(-1, 8)), att('EP-05 分支模型', true, localAt(-1, 8, 30)),
    // EP-01 / EP-07：观察后一错 → weak（EP-01 加权 0；EP-07 先对后错 → 加权 0.41）
    att('EP-01 暂存区', false, localAt(-1, 9, 30)),
    att('EP-07 revert', true, localAt(-1, 9, 15)), att('EP-07 revert', false, localAt(-1, 9, 45)),
  ];
  const r = deriveRetest({ entries: [e03, e05, e01, e07], attempts, resolveOpts: OPTS, now: localAt(0, 20) });
  assert.deepEqual(r.candidates.map((c) => c.ep), ['EP-01', 'EP-07', 'EP-05', 'EP-03']); // weak(0) → weak(0.41) → inProgress → untouched
  assert.equal(r.pick.ep, 'EP-01');
  assert.equal(r.candidates.length, 4); // 全量给 agent 消费；会话内只用 pick 一个（F10 编排口径）
});

test('同身份多条 open（多种错因）→ 一个候选带多条依据，最新在前（出题取最新错因）', () => {
  const older = entry({ observedText: '把 2 说成执行', observedAt: localAt(-1, 9), cause: '另一个根因' });
  const newer = entry({ observedAt: localAt(-1, 11) });
  const r = deriveRetest({ entries: [older, newer], attempts: [], resolveOpts: OPTS, now: localAt(0, 20) });
  assert.equal(r.candidates.length, 1);
  assert.equal(r.pick.openCount, 2);
  assert.equal(r.pick.misconceptions[0].observed.text, '把 4 说成读权限'); // 新条目在前
  assert.equal(r.pick.misconceptions[1].observed.text, '把 2 说成执行');
});

test('复发接续：同根因更晚条目 → 旧条 recurred、新条 open → 候选依据取新条（旧条不进 basis）', () => {
  const old1 = entry({ observedAt: localAt(-2, 9), cause: null, observedText: '077 说成 77' }); // 缺省 diagnosis：根因键回退 observed
  const recurred = entry({ observedAt: localAt(-1, 9), cause: null, observedText: '077 说成 77' }); // 复发写法：observed 一字不差沿用 → 接续可判定
  const r = deriveRetest({ entries: [old1, recurred], attempts: [], resolveOpts: OPTS, now: localAt(0, 20) });
  assert.equal(r.pick.openCount, 1);
  assert.equal(r.pick.misconceptions[0].observed.at, recurred.observed.at);
  // 派生层面旧条确为 recurred（消费端派生，不改写输入）
  assert.equal(deriveMisconceptionStatuses([old1, recurred], [], OPTS)[0].status, 'recurred');
});

test('裸名未定位目标照常入选（located=false 如实呈现，不猜归属）；同裸名当天口述算同目标去重', () => {
  const bare = entry({ target: '补零权限位', ep: null, node: null, name: '补零权限位', via: null, cause: null });
  const yesterday = deriveRetest({
    entries: [bare], attempts: [att('补零权限位', false, localAt(-1, 9))], resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(yesterday.pick.located, false);
  assert.equal(yesterday.pick.name, '补零权限位');
  const today = deriveRetest({
    entries: [bare], attempts: [att('补零权限位', false, localAt(-1, 9)), att('补零权限位', true, localAt(0, 8))], resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(today.pick, null); // 今天答对 → corrected（条件①）且当天已答（条件③）——双重退场
});

test('空台账 → null（消费端字段静默缺席，复测通道不出现）', () => {
  assert.equal(deriveRetest({ entries: [], attempts: [], resolveOpts: OPTS, now: localAt(0, 20) }), null);
});

test('有台账但无候选 → pick=null + excluded 如实计数（不编造候选、不强制创建复测计划）', () => {
  const correctedEntry = entry({ observedAt: YESTERDAY });
  const r = deriveRetest({
    entries: [correctedEntry],
    attempts: [att('EP-03 chmod', true, YESTERDAY + 5000)],
    resolveOpts: OPTS, now: localAt(0, 20),
  });
  assert.equal(r.pick, null);
  assert.deepEqual(r.candidates, []);
  assert.deepEqual(r.excluded, { notOpen: 1, answeredToday: 0, mastered: 0 });
});
