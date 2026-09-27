/**
 * voice.test.mjs — CLI 层表达纪律单源（voice.mjs）测试 + kit 快照门禁。
 *
 * 四组断言面：
 * ① 结构：词典五语齐全、voiceBlock 组装与未知 kind 抛错；
 * ② 接线：三个 prompt builder 的 system **实际包含** voiceBlock 输出（防「模块在
 *    但没人 import」——单源只有被真的拼进 prompt 才算接线）；
 * ③ 收拢两分支：podcast 的 recap 条件注入（严格大于 RECAP_THRESHOLD；缺省与恰好
 *    等于不注入）+ buildPodcastPrompt 布线级复测——把「段数判定在代码不在 LLM」
 *    钉死在测试面；
 * ④ kit 快照门禁：plugins/ai-study-kit/kit/ 里的 voice.mjs 与源字节相等、
 *    voice.test.mjs 在快照里——封住「新建文件未 git add 先跑 sync:plugin 静默漏出
 *    快照」的缝（sync-plugin 的 git ls-files 只收跟踪面且不警告未跟踪新文件；
 *    断言红即发版阻断，同 kit-version.test.mjs 的发版纪律作用域）。
 *
 * 运行：node --test apps/quiz-app/scripts/lib/voice.test.mjs（根 pnpm test 的
 * node --test lib/*.test.mjs 通配自动收）。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { VOICE_BASE, VOICE_KIND, RECAP_THRESHOLD, voiceBlock } from './voice.mjs';
import { buildLessonPrompt } from './teach-utils.mjs';
import { buildClusterGrillPrompt } from './grill-utils.mjs';
import { buildPodcastPrompt } from './podcast-utils.mjs';

const LANGS = ['zh', 'en', 'es', 'ru', 'ja'];

// ── ① 结构 ────────────────────────────────────────────────

test('VOICE_BASE 五语非空（口表语域底座）', () => {
  for (const l of LANGS) {
    assert.ok(
      typeof VOICE_BASE[l] === 'string' && VOICE_BASE[l].trim().length > 40,
      `VOICE_BASE.${l} 缺失或过短`,
    );
  }
});

test('VOICE_KIND 三 kind × 五语非空（podcast 为 { base, recap } 两段结构）', () => {
  for (const kind of ['teach', 'grill']) {
    for (const l of LANGS) {
      assert.ok(
        typeof VOICE_KIND[kind][l] === 'string' && VOICE_KIND[kind][l].trim().length > 40,
        `VOICE_KIND.${kind}.${l} 缺失或过短`,
      );
    }
  }
  for (const l of LANGS) {
    const p = VOICE_KIND.podcast[l];
    assert.ok(p && typeof p.base === 'string' && p.base.trim().length > 40, `VOICE_KIND.podcast.${l}.base 缺失或过短`);
    assert.ok(p && typeof p.recap === 'string' && p.recap.trim().length > 20, `VOICE_KIND.podcast.${l}.recap 缺失或过短`);
  }
});

test('voiceBlock: 未知 kind 抛错并列出支持项', () => {
  assert.throws(() => voiceBlock('blog'), /blog/);
  assert.throws(() => voiceBlock('blog'), /teach \/ grill \/ podcast/);
});

test('voiceBlock: 未知 lang 兜底 zh（同 langs.mjs langConf 防御路径）', () => {
  assert.equal(voiceBlock('teach', 'fr'), voiceBlock('teach', 'zh'));
  assert.equal(voiceBlock('podcast', 'fr', { targetSegments: 18 }), voiceBlock('podcast', 'zh', { targetSegments: 18 }));
});

test('voiceBlock: 组装含底座 + kind 分形段（底座在前、空行分隔）', () => {
  const teachZh = voiceBlock('teach', 'zh');
  assert.ok(teachZh.includes(VOICE_BASE.zh), 'teach 组装缺底座');
  assert.ok(teachZh.includes(VOICE_KIND.teach.zh), 'teach 组装缺分形段');
  assert.ok(teachZh.indexOf(VOICE_BASE.zh) < teachZh.indexOf(VOICE_KIND.teach.zh), '底座应在分形段之前');

  const grillEn = voiceBlock('grill', 'en');
  assert.ok(grillEn.includes(VOICE_BASE.en));
  assert.ok(grillEn.includes(VOICE_KIND.grill.en));
});

// ── ② 接线：三个 prompt builder 实际引用纪律文本 ───────────

test('buildLessonPrompt system 含 voiceBlock(teach)（五语全轮 + 旧腔调行已删）', () => {
  const spec = { mission: 'm', audience: 'a', depth: 'beginner' };
  for (const l of LANGS) {
    const msgs = buildLessonPrompt({ spec, topic: 't', lessonNum: 1, total: 1, outline: ['t'], lang: l });
    assert.ok(
      msgs[0].content.includes(voiceBlock('teach', l)),
      `teach ${l} 的 system 未接表达纪律（voiceBlock 输出应原样进 prompt）`,
    );
  }
  // 旧散落腔调行并入删除——不留两份口径（纪律单源 = voice.mjs）
  const zh = buildLessonPrompt({ spec, topic: 't', lessonNum: 1, total: 1, outline: ['t'] })[0].content;
  assert.doesNotMatch(zh, /风格：口语化、有具体例子/);
});

test('buildClusterGrillPrompt system 含 voiceBlock(grill)（五语全轮 + 旧腔调行已删、字数契约保留）', () => {
  const wrong = [{
    id: 'G-1',
    record: { streak: 0, selected: ['A'], wrongCount: 1 },
    question: { id: 'G-1', question: 'q', options: { A: 'a' }, answer: ['B'] },
  }];
  for (const l of LANGS) {
    const p = buildClusterGrillPrompt({ topic: 't', ids: ['G-1'] }, wrong, [], l);
    assert.ok(
      p.system.includes(voiceBlock('grill', l)),
      `grill ${l} 的 system 未接表达纪律`,
    );
  }
  const zh = buildClusterGrillPrompt({ topic: 't', ids: ['G-1'] }, wrong, []).system;
  assert.doesNotMatch(zh, /风格：具体、有例子、避免空洞术语/);
  assert.match(zh, /800-1500 字/); // 字数契约不因并入纪律被误删
});

test('buildPodcastPrompt system 含 voiceBlock(podcast)（五语全轮，默认 12 段不含 recap）', () => {
  for (const l of LANGS) {
    const p = buildPodcastPrompt('素材', '标题', { lang: l });
    assert.ok(
      p.system.includes(voiceBlock('podcast', l, { targetSegments: 12 })),
      `podcast ${l} 的 system 未接表达纪律`,
    );
    assert.ok(!p.system.includes(VOICE_KIND.podcast[l].recap), `podcast ${l} 默认 12 段不应含收拢条款`);
  }
});

// ── ③ 收拢两分支：条件注入的语义钉死 ─────────────────────

test('voiceBlock 收拢分支：targetSegments 18 含 recap；缺省与 = RECAP_THRESHOLD 不含（五语 × 严格大于）', () => {
  for (const l of LANGS) {
    const withRecap = voiceBlock('podcast', l, { targetSegments: 18 });
    assert.ok(withRecap.includes(VOICE_KIND.podcast[l].recap), `${l} targetSegments=18 应含收拢条款`);

    const atThreshold = voiceBlock('podcast', l, { targetSegments: RECAP_THRESHOLD });
    assert.ok(!atThreshold.includes(VOICE_KIND.podcast[l].recap), `${l} targetSegments=${RECAP_THRESHOLD} 不应含收拢（严格大于才注入）`);

    const noOpts = voiceBlock('podcast', l);
    assert.ok(!noOpts.includes(VOICE_KIND.podcast[l].recap), `${l} 缺省 opts 不应含收拢`);
  }
});

test('voiceBlock 收拢分支：非数值 targetSegments 不注入（NaN 安全）', () => {
  assert.ok(!voiceBlock('podcast', 'zh', { targetSegments: 'abc' }).includes(VOICE_KIND.podcast.zh.recap));
  assert.ok(!voiceBlock('podcast', 'zh', { targetSegments: null }).includes(VOICE_KIND.podcast.zh.recap));
});

test('buildPodcastPrompt 布线级复测：segments 20 含收拢、12 不含', () => {
  const sys20 = buildPodcastPrompt('素材', '标题', { targetSegments: 20 }).system;
  assert.ok(sys20.includes(VOICE_KIND.podcast.zh.recap), 'targetSegments=20 的 prompt 应含收拢条款');
  const sys12 = buildPodcastPrompt('素材', '标题', { targetSegments: 12 }).system;
  assert.ok(!sys12.includes(VOICE_KIND.podcast.zh.recap), 'targetSegments=12 的 prompt 不应含收拢条款');
});

// ── ④ kit 快照门禁（发版阻断，同 kit-version.test.mjs 作用域）────

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const KIT_LIB_DIR = join(REPO_ROOT, 'plugins', 'ai-study-kit', 'kit', 'apps', 'quiz-app', 'scripts', 'lib');
const SRC_VOICE = join(REPO_ROOT, 'apps', 'quiz-app', 'scripts', 'lib', 'voice.mjs');
const KIT_VOICE = join(KIT_LIB_DIR, 'voice.mjs');
const KIT_VOICE_TEST = join(KIT_LIB_DIR, 'voice.test.mjs');
const GIT_ADD_HINT = '新建文件必须先 git add 再重跑 pnpm run sync:plugin（sync 只收 git 跟踪面且不警告未跟踪新文件——未 add 的新文件会零警告漏出 kit 快照，装插件/F1 拷出的 kit 里 import 即 ERR_MODULE_NOT_FOUND）';

test('kit 快照含 voice.mjs 且与源字节相等', () => {
  assert.ok(existsSync(KIT_VOICE), `kit 快照缺 ${KIT_VOICE}——${GIT_ADD_HINT}`);
  const srcBuf = readFileSync(SRC_VOICE);
  const kitBuf = readFileSync(KIT_VOICE);
  assert.ok(srcBuf.equals(kitBuf), 'kit 快照 voice.mjs 与源不一致——git add 后重跑 pnpm run sync:plugin 刷 kit 快照');
});

test('kit 快照含 voice.test.mjs', () => {
  assert.ok(existsSync(KIT_VOICE_TEST), `kit 快照缺 ${KIT_VOICE_TEST}——${GIT_ADD_HINT}`);
});
