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
 *   node apps/quiz-app/scripts/podcast-generate.mjs --input X.html --no-tts  # 只产脚本不合成
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

if (!INPUT) {
  console.error('❌ 缺少 --input 参数。');
  console.error('');
  console.error('用法：node apps/quiz-app/scripts/podcast-generate.mjs --input <file>');
  console.error('  --input     学习素材文件（HTML / MD / questions.json / txt）');
  console.error('  --segments  目标对话段数（默认 12）');
  console.error('  --style     风格：conversational / lecture / interview（默认 conversational）');
  console.error('  --no-tts    只产脚本+逐字稿，不调 TTS（省 TTS 成本）');
  process.exit(1);
}

// ── 主流程 ────────────────────────────────────────────────
async function main() {
  requireLlmConfig();

  // 解析 --input：相对路径相对于仓库根
  const inputPath = INPUT.startsWith('/') ? INPUT : resolve(REPO_ROOT, INPUT);
  if (!existsSync(inputPath)) {
    console.error(`❌ 找不到输入文件：${inputPath}`);
    process.exit(1);
  }

  console.log('🎙  podcast-generate');
  console.log(`   输入：${inputPath}`);
  console.log(`   段数：${TARGET_SEGMENTS}`);
  console.log(`   风格：${STYLE}`);
  console.log(`   TTS：${NO_TTS ? '跳过（--no-tts）' : '启用'}`);
  console.log('');

  // 1. 读 + 解析输入
  const raw = readFileSync(inputPath, 'utf-8');
  const { sourceText, sourceTitle, sourceType } = parseInputSource(inputPath, raw);
  console.log(`📄 解析输入：${sourceType}（${sourceText.length} 字符，标题：${sourceTitle}）`);
  if (sourceText.length < 100) {
    console.warn('   ⚠️ 输入文本较短（< 100 字），播客内容可能不够充实');
  }
  console.log('');

  // 2. LLM 产对话脚本
  console.log('🤖 LLM 编写对话脚本...');
  const prompt = buildPodcastPrompt(sourceText, sourceTitle, {
    targetSegments: TARGET_SEGMENTS,
    style: STYLE,
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
  console.log(`   ✓ 标题：${parsed.title}`);
  console.log(`   ✓ 共 ${script.length} 段对话`);
  console.log('');

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
  console.log(`💾 ${scriptPath}`);

  // 6. 写逐字稿 Markdown
  writeFileSync(transcriptPath, renderTranscript(script, parsed.title), 'utf-8');
  console.log(`💾 ${transcriptPath}`);

  // 7. TTS 合成（除非 --no-tts）
  if (!NO_TTS) {
    requireTtsConfig();
    console.log('');
    console.log(`🔊 TTS 合成（共 ${script.length} 段，逐段调 GLM-TTS）...`);
    const parts = [];
    for (let i = 0; i < script.length; i++) {
      const seg = script[i];
      const emoji = seg.speaker === 'female' ? '👩' : '👨';
      const preview = seg.text.slice(0, 30).replace(/\n/g, ' ');
      console.log(`   [${i + 1}/${script.length}] ${emoji} ${preview}...`);
      const { audio } = await synthesize({
        text: seg.text,
        gender: seg.speaker,
      });
      parts.push(audio);
    }
    const combined = Buffer.concat(parts);
    writeFileSync(audioPath, combined);
    console.log(`💾 ${audioPath}（${(combined.length / 1024 / 1024).toFixed(2)} MB）`);
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
