import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { readProgress, writeProgress } from './progressStore';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import type { Progress } from '../src/types';

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
