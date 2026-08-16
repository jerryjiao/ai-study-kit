import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { readProgress, writeProgress } from './progressStore';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { Progress } from '../src/types';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const PROGRESS_FILE = process.env.PROGRESS_FILE || join(root, 'progress.json');
const DIST = join(root, 'dist');
const PORT = Number(process.env.PORT) || 8787;

const app = new Hono();

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

// 健康检查
app.get('/api/health', (c) => c.json({ ok: true }));

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

// SPA fallback：其余路径返回 index.html
app.get('*', (c) => {
  const index = join(DIST, 'index.html');
  if (existsSync(index)) {
    return c.html(readFileSync(index, 'utf-8'));
  }
  return c.text('前端未构建，请先运行 npm run build', 500);
});

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`练习服务运行中: http://localhost:${info.port}`);
});
