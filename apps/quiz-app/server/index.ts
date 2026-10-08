import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { readProgress, writeProgress } from './progressStore';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { OralAttempt, Progress } from '../src/types';
import { mergeOralAttempts } from '../src/lib/oral';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROGRESS_FILE = process.env.PROGRESS_FILE || join(root, 'progress.json');
const DIST = join(root, 'dist');
const PORT = Number(process.env.PORT) || 8787;

// 导出给测试注入请求（app.request）；启动见文件尾的主入口判断
export const app = new Hono();

// 单用户进度接口（一人一份，无账号无同步码）
app.get('/api/progress', (c) => c.json(readProgress(PROGRESS_FILE)));

app.post('/api/progress', async (c) => {
  try {
    // json() 解析非法 JSON 也会抛错，必须在 try 内，统一落进 400 分支
    const body = await c.req.json<Progress>();
    writeProgress(PROGRESS_FILE, body);
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: false, error: 'invalid payload' }, 400);
  }
});

// 口述成绩实时回流（#122，v0.26）：教练陪练（skill F10，写主题包流水的同时）把每次口头
// 作答提交到这里 → 并入 progress.oralAttempts（append-only 并集去重）→ web 全景/掌握判据
// 刷新页面即消费，不再等 build 覆盖快照（快照降级为无 API 离线场景的回退通道）。
// 体两种：单条 { theme?, target, correct, at, source? } 或批量 { theme?, attempts: [...] }；
// 体级 theme 给批量内缺 theme 的条目补归属（推荐带——多主题隔离在读端按它过滤）。
// 校验与 parseOralAttempts 同尺：单条缺 target / correct 非布尔 / at 非法 → 跳过该条不拒
// 整请求；未来时间戳（at > now + 5 分钟时钟偏差容忍）直接拒——与 progress 同款红线，
// 绝不把未来时间戳写进存储（未来戳会永久压制真实时间的合并）。
const ORAL_FUTURE_SKEW_MS = 5 * 60 * 1000;
const ORAL_MAX_BATCH = 500;

function sanitizeOralEntries(
  raw: unknown,
  bodyTheme: string | undefined,
  now: number,
): { valid: OralAttempt[]; skipped: number } {
  const list = Array.isArray(raw) ? raw : [raw];
  const valid: OralAttempt[] = [];
  let skipped = 0;
  for (const e of list) {
    if (!e || typeof e !== 'object') { skipped++; continue; }
    const o = e as Record<string, unknown>;
    const target = typeof o.target === 'string' ? o.target.trim() : '';
    if (!target) { skipped++; continue; }
    if (typeof o.correct !== 'boolean') { skipped++; continue; }
    if (typeof o.at !== 'number' || !Number.isFinite(o.at) || o.at <= 0) { skipped++; continue; }
    if (o.at > now + ORAL_FUTURE_SKEW_MS) { skipped++; continue; } // 未来时间戳：拒收
    const src = o.source;
    const theme = typeof o.theme === 'string' && o.theme.trim() ? o.theme.trim() : bodyTheme;
    const entry: OralAttempt = { target, correct: o.correct, at: o.at };
    if (theme) entry.theme = theme;
    if (src === 'recall' || src === 'recite' || src === 'case') entry.source = src;
    valid.push(entry);
  }
  return { valid, skipped };
}

app.post('/api/oral-attempts', async (c) => {
  try {
    const body = await c.req.json<Record<string, unknown>>();
    const bodyTheme = typeof body?.theme === 'string' && body.theme.trim() ? body.theme.trim() : undefined;
    const raw = Array.isArray(body?.attempts)
      ? body.attempts
      : (body && typeof body === 'object' && 'target' in body ? body : null);
    if (raw === null) return c.json({ ok: false, error: 'invalid payload' }, 400);
    if (Array.isArray(raw) && raw.length > ORAL_MAX_BATCH) {
      return c.json({ ok: false, error: 'too many attempts' }, 400);
    }
    const { valid, skipped } = sanitizeOralEntries(raw, bodyTheme, Date.now());
    if (valid.length > 0) {
      // read-merge-write：只动 oralAttempts 字段（writeProgress 内部再 merge 一次，幂等）；
      // base 的 answers/偏好原样带回，避免极简覆盖体把 UI 偏好从 merge 结果里挤掉。
      const base = readProgress(PROGRESS_FILE);
      writeProgress(PROGRESS_FILE, {
        ...base,
        oralAttempts: mergeOralAttempts(base.oralAttempts ?? [], valid),
      });
    }
    return c.json({ ok: true, accepted: valid.length, skipped });
  } catch {
    return c.json({ ok: false, error: 'invalid payload' }, 400);
  }
});

// 健康检查（#106 起自报 version/theme；老调用方只认 ok，加字段向后兼容）
// anchor 在两种形态下同位（server/ 向上三级）：开发/仓库 checkout = 仓库根
// （有 package.json）；F1/F13 用户项目 = kit 根（无仓库 package.json，但有
// kit-version.json——ADR-0006 的 kit 自报版本标记）。
const ANCHOR = join(__dirname, '../../..');

// 读 JSON 文件的 version 字段；文件缺失/损坏/无有效字段 → undefined（落到下一来源）
function readJsonVersion(file: string): string | undefined {
  try {
    const v = JSON.parse(readFileSync(file, 'utf-8'))?.version;
    return typeof v === 'string' && v ? v : undefined;
  } catch {
    return undefined;
  }
}

// 启动读一次并缓存，health 请求零副作用
const VERSION =
  readJsonVersion(join(ANCHOR, 'package.json')) ??
  readJsonVersion(join(ANCHOR, 'kit-version.json')) ??
  'unknown';

function readTheme(): string {
  try {
    const t = JSON.parse(readFileSync(join(root, 'src/data/theme.json'), 'utf-8'))?.theme;
    // 只报主题名，绝不带 dir 或任何路径（与 #109 同一纪律）
    return typeof t === 'string' && t ? t : 'unknown';
  } catch {
    return 'unknown'; // 文件缺失或损坏
  }
}
const THEME = readTheme();

app.get('/api/health', (c) => c.json({ ok: true, version: VERSION, theme: THEME }));

// 托管前端静态资源（slides 图片 + 课程 HTML + 打包资源）
// Hono 自带 MIME 表不含 .wav，会给音频返回 octet-stream 导致 <audio> 播放不稳定；
// 这里在静态托管前显式给音频文件设正确 Content-Type（2026-07-09 加，为课程内嵌音频服务）。
const AUDIO_MIME: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};
app.use('/study/*', async (c, next) => {
  await next();
  const url = new URL(c.req.url);
  for (const [ext, mime] of Object.entries(AUDIO_MIME)) {
    if (url.pathname.toLowerCase().endsWith(ext) && c.res.headers) {
      c.res.headers.set('Content-Type', mime);
      break;
    }
  }
});
app.use('/slides/*', serveStatic({ root: './dist' }));
app.use('/study/*', serveStatic({ root: './dist' }));
app.use('/assets/*', serveStatic({ root: './dist' }));
// 根级静态文件（logo.png / favicon.png 等）：真实文件带正确 MIME 返回，找不到再落到
// SPA fallback——顺序不能反。此前根级图片掉进 fallback 被当 index.html（text/html）发，
// 浏览器解码失败显示裂图（仅 Hono 部署可见，dev/Pages 无此问题）。
app.use('*', serveStatic({ root: './dist' }));

// SPA fallback：其余路径返回 index.html
app.get('*', (c) => {
  const index = join(DIST, 'index.html');
  if (existsSync(index)) {
    return c.html(readFileSync(index, 'utf-8'));
  }
  return c.text('前端未构建，请先运行 npm run build', 500);
});

// app 定义与启动分离：仅当本文件是进程主入口（npm run server / pm2 的 tsx 调起）
// 才起端口；被测试 import 时只拿 app 不真监听。
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  serve({ fetch: app.fetch, port: PORT }, (info) => {
    console.log(`练习服务运行中: http://localhost:${info.port}`);
  });
}
