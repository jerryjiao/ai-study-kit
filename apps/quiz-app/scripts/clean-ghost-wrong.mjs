#!/usr/bin/env node
/**
 * 清理"幽灵错题"：在 progress.answers 里被标记为答错(streak 被维护 / correct:false)，
 * 但对应题目已不在当前 questions.json 里的记录。
 *
 * 这些记录来自旧版题库（1008 题 coze 题库 → 精简为 662 题），题被删了但答题记录还在，
 * 用户无法重做、无法移出，是死数据。
 *
 * 清理方式：通过 POST /api/progress 提交墓碑（deletedAt = 真实 Date.now()）。
 * 服务器 writeProgress 是 read-merge-write（progressStore.ts:36），墓碑的 recTs(deletedAt)
 * > 旧记录的 recTs(submittedAt)，merge 时墓碑胜出（progress.ts:274），读端 isAnswerDeleted
 * 视为"未答"，错题集/统计自动排除。incoming 不含其他 id → merge 保留磁盘其余记录，不误伤。
 *
 * ⚠️ 时间戳必须用真实 Date.now()（AGENTS.md 红线：未来时间戳会永久压制真实写入）。
 *
 * 范围：默认只清"答错的"孤儿（即幽灵错题，用户明确要清的）。
 * 加 --include-correct 才连答对的孤儿一起清（那是独立决定，默认不动）。
 *
 * 用法：
 *   node quiz-app/scripts/clean-ghost-wrong.mjs                        # dry-run，列出所有孤儿（错+对）
 *   node quiz-app/scripts/clean-ghost-wrong.mjs --apply                # 实际清理：只清答错的孤儿
 *   node quiz-app/scripts/clean-ghost-wrong.mjs --apply --include-correct  # 错+对孤儿全清
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const SERVER = process.env.SERVER || 'http://101.35.249.209:8787';
const APPLY = process.argv.includes('--apply');
const INCLUDE_CORRECT = process.argv.includes('--include-correct');

// 1. 加载当前题库（权威 id 集合）
const questions = JSON.parse(fs.readFileSync(join(root, 'src/data/questions.json'), 'utf-8'));
const arr = Array.isArray(questions) ? questions : questions.questions;
const validIds = new Set(arr.map((q) => q.id));
console.log(`题库当前题数: ${arr.length}`);

// 2. 拉取服务器权威进度
const res = await fetch(`${SERVER}/api/progress`, { cache: 'no-store' });
if (!res.ok) { console.error('拉取进度失败:', res.status); process.exit(1); }
const prog = await res.json();
const answers = prog.answers || {};
console.log(`服务器 answers 记录数: ${Object.keys(answers).length}`);

// 3. 找出幽灵错题：题库已无此 id，且记录不是墓碑、且不是答对
//    "错题"口径放宽：correct===false 的都算（无论 streak 是否被维护）——这些都是死数据。
const ghostIds = [];
for (const [id, r] of Object.entries(answers)) {
  if (r.deletedAt) continue;          // 已是墓碑
  if (validIds.has(id)) continue;     // 题库还在
  if (r.correct === true) {
    // 答对的孤儿记录也是死数据，一并清。但稳妥起见先只清错的，答对的不影响错题率。
    // 这里选择清掉所有孤儿记录（对错都清），因为题都没了，留着无意义。
    ghostIds.push({ id, correct: true });
  } else {
    ghostIds.push({ id, correct: false });
  }
}

const ghostWrong = ghostIds.filter((g) => !g.correct).map((g) => g.id);
const ghostRight = ghostIds.filter((g) => g.correct).map((g) => g.id);
console.log(`\n幽灵记录（题库已删）: ${ghostIds.length} 条`);
console.log(`  其中答错的: ${ghostWrong.length}  ← 默认清理目标`);
console.log(`  其中答对的: ${ghostRight.length}  ${INCLUDE_CORRECT ? '(本次也清)' : '(默认不清，加 --include-correct 才清)'}`);

// 决定本次实际清理范围
const toClean = INCLUDE_CORRECT ? ghostIds : ghostIds.filter((g) => !g.correct);

if (toClean.length === 0) {
  console.log('\n无符合条件的幽灵记录，无需清理。');
  process.exit(0);
}

// dry-run 时打印所有孤儿（标注本次会不会清），apply 时只打印本次实际清理的
if (!APPLY) {
  console.log(`\n将清理的 id 清单（${toClean.length} 条${INCLUDE_CORRECT ? '，含答对' : '，仅答错'}）：`);
  ghostIds.forEach((g) => {
    const willClean = INCLUDE_CORRECT || !g.correct;
    console.log(`  ${willClean ? '✂' : ' '} ${g.id}  ${g.correct ? '(答对)' : '(答错)'}  ${willClean ? '' : '[本次不清]'}`);
  });
} else {
  console.log(`\n将清理的 id 清单（${toClean.length} 条${INCLUDE_CORRECT ? '，含答对' : '，仅答错'}）：`);
  toClean.forEach((g) => console.log(`  ✂ ${g.id}  ${g.correct ? '(答对)' : '(答错)'}`));
}

if (!APPLY) {
  console.log(`\n[dry-run] 未实际写入。确认无误后加 --apply 执行：`);
  console.log(`  node quiz-app/scripts/clean-ghost-wrong.mjs --apply                # 只清答错(${toClean.length}条)`);
  if (!INCLUDE_CORRECT && ghostRight.length > 0)
    console.log(`  node quiz-app/scripts/clean-ghost-wrong.mjs --apply --include-correct  # 错+对全清(${ghostIds.length}条)`);
  process.exit(0);
}

// 4. 构造墓碑 incoming：只含本次目标 id 的墓碑，其余字段留空（merge 保留磁盘其余记录）
const now = Date.now();
const tombstoneAnswers = {};
for (const g of toClean) {
  tombstoneAnswers[g.id] = { selected: [], correct: null, submittedAt: now, deletedAt: now };
}
const incoming = { version: 1, answers: tombstoneAnswers, read: {} };

console.log(`\n[apply] 提交 ${toClean.length} 条墓碑到 ${SERVER} (now=${now})...`);
const postRes = await fetch(`${SERVER}/api/progress`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(incoming),
});
if (!postRes.ok) {
  console.error('POST 失败:', postRes.status, await postRes.text());
  process.exit(1);
}
console.log('POST 成功:', await postRes.json());

// 5. 复验：重新拉取，确认幽灵错题已变为墓碑
const res2 = await fetch(`${SERVER}/api/progress`, { cache: 'no-store' });
const prog2 = await res2.json();
let stillGhost = 0;
for (const g of toClean) {
  const r = prog2.answers?.[g.id];
  if (!r || !r.deletedAt) stillGhost++;
}
console.log(`\n复验：${toClean.length - stillGhost}/${toClean.length} 已变为墓碑`);
if (stillGhost > 0) console.error(`⚠️ 仍有 ${stillGhost} 条未生效`);
else console.log('✓ 全部清理完成');
