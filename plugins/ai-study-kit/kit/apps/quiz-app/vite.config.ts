/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 自托管（pm2）保持 '/'。官网 demo 构建时用 QUIZ_BASE 指到子路径，
  // 如 GitHub Pages：QUIZ_BASE=/ai-study-kit/demo/ pnpm build（wayfinder #11/#12）。
  // App.tsx 的 BrowserRouter basename 与 Courses 的 COURSE_URL 均跟随 import.meta.env.BASE_URL。
  base: process.env.QUIZ_BASE || '/',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8787' } },
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts', 'server/**/*.test.ts'] },
});
