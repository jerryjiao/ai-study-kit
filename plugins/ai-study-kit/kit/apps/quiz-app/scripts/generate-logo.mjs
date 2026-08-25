#!/usr/bin/env node
/**
 * 生成项目 Logo（app icon 风格，indigo/slate 配色，配浅/深双主题）。
 *
 * 走 codex 的 ChatGPT OAuth 凭据（~/.codex/auth.json）调
 * https://chatgpt.com/backend-api/codex/images/generations（gpt-image-2），
 * 请求结构对齐 codex 客户端（codex-rs codex-api/src/endpoint/images.rs）：
 *   headers: Authorization: Bearer <access_token> / ChatGPT-Account-ID / originator
 *   body:    { model, prompt, size, quality, background, n }
 *   返回:    data[0].b64_json（PNG）
 *
 * 用法：
 *   node scripts/generate-logo.mjs                # 生成全部候选到 assets-src/logo/
 *   node scripts/generate-logo.mjs 0 2            # 只生成第 0、2 号候选
 *   CODEX_HOME=~/.codex node scripts/generate-logo.mjs
 *
 * 产物是「源稿候选」，不入构建；选中的定稿拷到 assets/ + public/（见脚本尾部提示）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CODEX_HOME = process.env.CODEX_HOME || join(homedir(), '.codex');
const BASE_URL = 'https://chatgpt.com/backend-api/codex';
const MODEL = 'gpt-image-2';
const OUT_DIR = 'assets-src/logo';

// 读 codex 的 OAuth 凭据。token 过期时先跑一次 codex 登录刷新（auth.json 会自动更新）。
function loadAuth() {
  const raw = readFileSync(join(CODEX_HOME, 'auth.json'), 'utf8');
  const auth = JSON.parse(raw);
  const accessToken = auth?.tokens?.access_token;
  const accountId = auth?.tokens?.account_id;
  if (!accessToken) throw new Error(`${CODEX_HOME}/auth.json 里没有 tokens.access_token，先 codex login`);
  return { accessToken, accountId };
}

// 共享风格锚：和 quiz-app 的 slate + indigo 主题对齐（indigo-600 主色，
// violet / 天蓝点缀），扁平矢量 app icon，双主题下都成立。
// 按 gpt-image 系提示词惯例：主体 + 材质 + 光 + 情绪，只说「实物」语言；
// 图标词汇（app/UI）容易诱发界面截图，结尾用负面清单兜底。全程无文字。
const STYLE =
  'Flat modern vector app icon, smooth rounded geometry, crisp edges, ' +
  'generous negative space, centered composition inside a rounded square ' +
  'with a gentle indigo-to-violet gradient background (#4f46e5 to #8b5cf6). ' +
  'The mark itself is clean white with one warm amber (#f59e0b) accent detail. ' +
  'Soft inner depth, subtle long shadow under the mark, premium and friendly, ' +
  'minimal enough to read clearly at 32 pixels. No text, no letters, no numbers, ' +
  'no words, no watermark, no interface screenshots.';

// 候选概念：都围绕「学习闭环」（材料建概念 → 做题验证 → 循环巩固）。
const candidates = [
  {
    file: 'c0-loop-check.png',
    note: '闭环 + 对勾：三段弧线连成圆环，环上一个节点变成对勾徽章',
    prompt:
      'A single bold circular loop made of three thick connected arcs, like a ' +
      'smooth orbit with small rounded gaps, read as a repeating study cycle. ' +
      'One arc ends in a small rounded checkmark badge that sits on the loop ' +
      'like a station, accented in warm amber. Simple, iconic, instantly ' +
      'readable. ' + STYLE,
  },
  {
    file: 'c1-book-check.png',
    note: '翻开的书：书页上扬收成一个对勾，学习 → 做对',
    prompt:
      'A stylized open book seen from the front, its two pages sweeping ' +
      'upward so the right page curls into one smooth bold checkmark stroke ' +
      'rising above the book, a small amber spark at the checkmark tip. The ' +
      'metaphor: study the material, get it right. ' + STYLE,
  },
  {
    file: 'c2-card-stack.png',
    note: '闪卡堆叠：三张圆角卡片错开叠放，顶卡一个大对勾',
    prompt:
      'A neat stack of three rounded rectangle cards fanned slightly apart ' +
      'like flashcards in a deck, the top card carrying one single bold ' +
      'rounded checkmark, with a small amber corner folded up on the top ' +
      'card. Clean, geometric, friendly. ' + STYLE,
  },
  {
    file: 'c3-kit.png',
    note: '工具箱：敞开的圆角盒子里立着一本书和一张卡',
    prompt:
      'An open rounded rectangular tray like a small toolkit or pencil case, ' +
      'tilted up toward the viewer, holding two simple objects standing ' +
      'side by side: a small open book and a single rounded card marked with ' +
      'a tiny amber dot. A study kit you carry anywhere. ' + STYLE,
  },
  {
    file: 'c4-brain-circuit.png',
    note: '抽象脑/灯泡回路：圆头灯泡内三条连线节点',
    prompt:
      'A simple rounded lightbulb whose glass is drawn as a clean circle, ' +
      'inside it three small dots connected by thin curved lines forming a ' +
      'triangle loop like a tiny circuit of ideas, one dot accented warm ' +
      'amber. Minimal, iconic, clever. ' + STYLE,
  },
  {
    file: 'c5-path-steps.png',
    note: '进阶路径：上升的圆点连线，终点是对勾徽章',
    prompt:
      'A rising path of five small rounded dots connected by a smooth ' +
      'upward-curving line, the final dot replaced by a small rounded ' +
      'checkmark badge accented in warm amber, like progress toward mastery. ' +
      'Airy, minimal, forward-looking. ' + STYLE,
  },
];

function base64ToBytes(b64) {
  if (typeof Uint8Array.fromBase64 === 'function') {
    return Uint8Array.fromBase64(b64);
  }
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function generateOne({ accessToken, accountId }, { file, prompt }) {
  const resp = await fetch(`${BASE_URL}/images/generations`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'ChatGPT-Account-ID': accountId,
      originator: 'codex_cli_rs',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      size: '1024x1024',
      quality: 'high',
      background: 'opaque',
      n: 1,
    }),
  });
  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`http ${resp.status}: ${text.slice(0, 200)}`);
  }
  const b64 = JSON.parse(text).data?.[0]?.b64_json;
  if (!b64) throw new Error('返回里没有 data[0].b64_json');
  return base64ToBytes(b64);
}

const only = process.argv.slice(2).map(Number);
const list = only.length ? candidates.filter((_, i) => only.includes(i)) : candidates;
mkdirSync(OUT_DIR, { recursive: true });

const auth = loadAuth();
let ok = 0;
for (const item of list) {
  const path = `${OUT_DIR}/${item.file}`;
  console.log(`→ ${item.file}：${item.note}`);
  try {
    const bytes = await generateOne(auth, item);
    writeFileSync(path, bytes);
    console.log(`  ✓ ${(bytes.byteLength / 1024).toFixed(0)} KB → ${path}`);
    ok++;
  } catch (err) {
    console.log(`  ✗ ${err?.message ?? err}`);
  }
}

console.log(`\n完成 ${ok}/${list.length}。选中定稿后拷贝：`);
console.log('  assets/logo.png            ← 仓库主 logo（README 用）');
console.log('  apps/quiz-app/public/logo.png   ← 顶栏 56px 版');
console.log('  apps/quiz-app/public/favicon.png ← 128px favicon');
