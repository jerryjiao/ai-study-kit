#!/usr/bin/env node
/**
 * podcast-generate.mjs — 把学习素材合成男女双播播客。
 *
 * 流程：
 *   1. 读 --input 指定的源文件（HTML / Markdown / questions.json / 文本）
 *   2. parseInputSource 提取可读文本
 *   3. LLM 把素材改编成对话脚本（JSON）
 *   4. validateDialogScript 校验
 *   5. 写 podcast-out/<slug>-script.json（对话脚本）
 *   6. 写 podcast-out/<slug>-transcript.md（逐字稿）
 *   7. （除非 --no-tts）调 TTS 合成 podcast-out/<slug>.wav
 *
 * 用法：
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input examples/dev-intro/lessons/git-basics.html
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input examples/dev-intro/questions.json --segments 15
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input X.html --style interview
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input X.html --lang en        # 对白用英语产
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input X.html --no-tts  # 只产脚本不合成
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input X.html --json   # 机器可读输出（agent 消费）
 *
 * --json 下人读日志走 stderr、stdout 只出一份结果 JSON（标题/脚本/逐字稿/音频路径）。
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chat, chatJson, requireLlmConfig } from './lib/llm.mjs';
import { requireTtsConfig, synthesize } from './lib/tts.mjs';
import {
  parseInputSource, validateDialogScript, renderTranscript,
  podcastSlug, buildPodcastPrompt,
} from './lib/podcast-utils.mjs';
import { resolveLang, langConf } from './lib/langs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..', '..', '..');

// ── 参数解析 ──────────────────────────────────────────────
const args = process.argv.slice(2);
const inputIdx = args.indexOf('--input');
const INPUT = inputIdx >= 0 ? args[inputIdx + 1] : null;
const segmentsIdx = args.indexOf('--segments');
const TARGET_SEGMENTS = segmentsIdx >= 0 ? parseInt(args[segmentsIdx + 1], 10) : 12;
const styleIdx = args.indexOf('--style');
const STYLE = styleIdx >= 0 ? args[styleIdx + 1] : 'conversational';
const NO_TTS = args.includes('--no-tts');
const langIdx = args.indexOf('--lang');
// 输出语言：--lang 优先，其次 STUDY_LANG 环境变量，默认 zh。只影响生成内容，CLI 日志仍中文。
// ⚠️ TTS 当前只配了 GLM-TTS：非中文对白能否合成取决于 provider 的多语支持，建议先 --no-tts 验证脚本。
let LANG = 'zh';
try {
  LANG = resolveLang(langIdx >= 0 ? args[langIdx + 1] : undefined, process.env.STUDY_LANG);
} catch (err) {
  console.error(`❌ ${err.message}`);
  process.exit(1);
}

if (!INPUT) {
  console.error('❌ 缺少 --input 参数。');
  console.error('');
  console.error('用法：node apps/quiz-app/scripts/podcast-generate.mjs --input <file>');
  console.error('  --input     学习素材文件（HTML / MD / questions.json / txt）');
  console.error('  --segments  目标对话段数（默认 12）');
  console.error('  --style     风格：conversational / lecture / interview（默认 conversational）');
  console.error('  --lang      对白输出语言：zh / en / es / ru / ja（默认 zh，也可用 STUDY_LANG 环境变量）');
  console.error('  --no-tts    只产脚本+逐字稿，不调 TTS（省 TTS 成本）');
  console.error('  --json      机器可读输出：人读日志走 stderr，stdout 只出结果 JSON');
  process.exit(1);
}

// --json：机器可读模式——人读日志降级到 stderr，stdout 只出结果 JSON（与 mastery-report --json 同约定）
const AS_JSON = args.includes('--json');
const say = AS_JSON ? (...a) => console.error(...a) : console.log;

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  requireLlmConfig();

  // 解析 --input：相对路径相对于仓库根
  const inputPath = INPUT.startsWith('/') ? INPUT : resolve(REPO_ROOT, INPUT);
  if (!existsSync(inputPath)) {
    console.error(`❌ 找不到输入文件：${inputPath}`);
    process.exit(1);
  }

  say('🎙  podcast-generate');
  say(`   输入：${inputPath}`);
  say(`   段数：${TARGET_SEGMENTS}`);
  say(`   风格：${STYLE}`);
  say(`   语言：${langConf(LANG).native}（--lang ${LANG}）`);
  say(`   TTS：${NO_TTS ? '跳过（--no-tts）' : '启用'}`);
  say('');

  // 1. 读 + 解析输入
  const raw = readFileSync(inputPath, 'utf-8');
  const { sourceText, sourceTitle, sourceType } = parseInputSource(inputPath, raw);
  say(`📄 解析输入：${sourceType}（${sourceText.length} 字符，标题：${sourceTitle}）`);
  if (sourceText.length < 100) {
    console.warn('   ⚠️ 输入文本较短（< 100 字），播客内容可能不够充实');
  }
  say('');

  // 2. LLM 产对话脚本
  say('🤖 LLM 编写对话脚本...');
  const prompt = buildPodcastPrompt(sourceText, sourceTitle, {
    targetSegments: TARGET_SEGMENTS,
    style: STYLE,
    lang: LANG,
  });
  const parsed = await chatJson(
    [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
    { temperature: 0.8 }
  );

  // 3. 校验
  if (!parsed.title || typeof parsed.title !== 'string') {
    throw new Error(`LLM 输出缺 title 字段：${JSON.stringify(parsed).slice(0, 200)}`);
  }
  const v = validateDialogScript(parsed.script);
  if (!v.ok) {
    throw new Error(`LLM 对话脚本校验失败：${v.error}`);
  }
  const script = v.script;
  say(`   ✓ 标题：${parsed.title}`);
  say(`   ✓ 共 ${script.length} 段对话`);
  say('');

  // 4. 准备输出
  const outDir = join(REPO_ROOT, 'podcast-out');
  mkdirSync(outDir, { recursive: true });
  const slug = podcastSlug(parsed.title);
  const scriptPath = join(outDir, `${slug}-script.json`);
  const transcriptPath = join(outDir, `${slug}-transcript.md`);
  const audioPath = join(outDir, `${slug}.wav`);

  // 5. 写对话脚本 JSON
  writeFileSync(scriptPath, JSON.stringify({
    title: parsed.title,
    source: INPUT,
    generatedAt: new Date().toISOString(),
    script,
  }, null, 2), 'utf-8');
  say(`💾 ${scriptPath}`);

  // 6. 写逐字稿 Markdown
  writeFileSync(transcriptPath, renderTranscript(script, parsed.title, LANG), 'utf-8');
  say(`💾 ${transcriptPath}`);

  // 7. TTS 合成（除非 --no-tts）
  let audioBytes = null;
  if (!NO_TTS) {
    requireTtsConfig();
    say('');
    say(`🔊 TTS 合成（共 ${script.length} 段，逐段调 GLM-TTS）...`);
    const parts = [];
    for (let i = 0; i < script.length; i++) {
      const seg = script[i];
      const emoji = seg.speaker === 'female' ? '👩' : '👨';
      const preview = seg.text.slice(0, 30).replace(/\n/g, ' ');
      say(`   [${i + 1}/${script.length}] ${emoji} ${preview}...`);
      const { audio } = await synthesize({
        text: seg.text,
        gender: seg.speaker,
      });
      parts.push(audio);
    }
    const combined = Buffer.concat(parts);
    writeFileSync(audioPath, combined);
    audioBytes = combined.length;
    say(`💾 ${audioPath}（${(combined.length / 1024 / 1024).toFixed(2)} MB）`);
  }

  // 结果输出：--json 给 agent（stdout 纯 JSON），否则人类可读收尾
  if (AS_JSON) {
    console.log(JSON.stringify({
      tool: 'podcast',
      lang: LANG,
      style: STYLE,
      title: parsed.title,
      input: inputPath,
      segments: script.length,
      scriptPath,
      transcriptPath,
      tts: !NO_TTS,
      ...(audioBytes !== null ? { audioPath, audioBytes } : {}),
    }, null, 2));
    return;
  }
  console.log('');
  console.log('✅ 播客生成完成！');
  console.log('');
  console.log('下一步：');
  console.log(`  打开 ${transcriptPath} 阅读逐字稿`);
  if (!NO_TTS) {
    console.log(`  播放 ${audioPath} 听效果`);
  } else {
    console.log(`  跑不带 --no-tts 的版本可以合成音频`);
  }
}

main().catch((err) => {
  console.error(`❌ 失败：${err.message}`);
  if (err.cause) console.error(`   原因：${err.cause.message || err.cause}`);
  process.exit(1);
});
