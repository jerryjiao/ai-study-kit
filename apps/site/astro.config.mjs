// ai-study-kit 官网（wayfinder map #9 / #10 选型：Astro Starlight）。
// 部署形态：GitHub Pages 项目页 + 自定义域名 → https://aistudykit.dev/
// （2026-09-15 迁移；老 URL https://jerryjiao.github.io/ai-study-kit/* 由 GitHub Pages 自动 301 到新域）
// 五语（与项目 UI/CLI/README 的 zh/en/es/ru/ja 对齐，#13 分层策略）：zh-cn 为默认语言挂在根路径，
// en/es/ru/ja 各挂 /<lang>/，未翻译页 fallback 到中文 + 提示条。
// demo（#12）：构建时把 quiz-app 静态产物拷进 public/demo/（见 scripts/build-demo + CI）。
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { readFileSync } from 'node:fs';
import { SITE_BASE } from './site.config.mjs';

// kit 版本号（仓库根 package.json）——侧栏「更新日志」标签自动带版本，升版零维护
const KIT_VERSION = JSON.parse(
  readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
).version;

export default defineConfig({
  site: 'https://aistudykit.dev',
  base: SITE_BASE,
  // dev 热更新 workaround（astro#17335，7.x 未修）：Vite 对 src/content/** 的 markdown
  // 触发"抢先"热重载，抢在 content layer 写完 node_modules/.astro data store 之前，
  // 页面用旧数据渲染后就不再刷新——Starlight 全站是 [slug] 动态路由，症状是改 md 页面永久陈旧。
  // 拦掉这批提前事件，让 Astro 自己在 data store 写完后触发正确的刷新。
  // 只影响 dev（handleHotUpdate 不参与 build），Pages 部署不受影响。
  vite: {
    plugins: [
      {
        name: 'skip-early-content-hmr',
        enforce: 'pre',
        handleHotUpdate({ file }) {
          if (file.includes('/src/content/')) return [];
        },
      },
    ],
  },
  integrations: [
    starlight({
      title: 'ai-study-kit',
      // 放 src/assets 让 Astro 优化；不透明深底图浅/深主题通用，无需 dark 反色版。
      // 头部 logo（assets/logo.png 定稿，quiz-app 顶栏/favicon 同源）。
      logo: { src: './src/assets/logo.png', alt: 'ai-study-kit logo' },
      // 标签页图标用真 logo 的 PNG（quiz-app favicon.png 同源拷贝），不用手绘 SVG 近似版；
      // 换 .png 文件名也顺带绕开浏览器对旧 favicon.svg 的强缓存。
      favicon: '/favicon.png',
      description: '把任意主题的题库变成完整学习闭环的开源脚手架',
      // 仓库入口：开源项目官网页头页脚的 GitHub 图标（hero 另有按钮，见 index.md）
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/jerryjiao/ai-study-kit' }],
      defaultLocale: 'root',
      locales: {
        // root = 中文（内容在 src/content/docs/ 根，URL 不带前缀）；
        // en/es/ru/ja 各挂 /<lang>/，未翻译页 fallback 到中文原文 + 提示条（#13 分层策略）
        root: { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
        es: { label: 'Español', lang: 'es' },
        ru: { label: 'Русский', lang: 'ru' },
        ja: { label: '日本語', lang: 'ja' },
      },
      customCss: ['./src/styles/custom.css'],
      // 页头覆盖：Starlight 默认 Header + 右上角「文档 / 在线试用」常驻入口（src/components/Header.astro）；
      // 站尾覆盖：原版 0.41 无站点 footer 配置，补全站协议/仓库/更新日志站尾（src/components/SiteFooter.astro）
      components: { Header: './src/components/Header.astro', Footer: './src/components/SiteFooter.astro' },
      // OG 分享图（#14：C 风基准，scripts/gen-og.py 生成 public/og.png 后提交入库）
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: `https://aistudykit.dev${SITE_BASE}/og.png` } },
        // 显式尺寸与替代文本：分享卡占位稳定 + 无障碍/图片搜索语义
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'ai-study-kit：把题库变成刷题、闪卡、错题精讲一体的学习闭环' } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        // iOS 主屏图标（demo 页同款，quiz-app favicon.png 同源）；自定义 head 项不走
        // Starlight 的 base 拼接，SITE_BASE 要手动带。
        { tag: 'link', attrs: { rel: 'apple-touch-icon', href: `${SITE_BASE}/favicon.png` } },
        // GSC property 级验证 token（UI「HTML 标记」方式下发；github.io 子路径 sites.add 不自动验证，须 UI 点验证）
        { tag: 'meta', attrs: { name: 'google-site-verification', content: 'tVmBrSoTawi7t3gzbBm54K5YZKcG5xUQmxwka8I7lpI' } },
      ],
      // 单一 sidebar（Starlight 多语言模型）：组/条目标签用 translations 按 BCP-47 覆盖，
      // slug 不含语言前缀、自动取各语言页面的 frontmatter 标题（#13：旅程四组）
      sidebar: [
        {
          label: '开始',
          translations: { en: 'Get started', es: 'Primeros pasos', ru: 'Начало работы', ja: 'はじめる' },
          items: [
            {
              label: '快速上手',
              translations: { en: 'Quick Start', es: 'Inicio rápido', ru: 'Быстрый старт', ja: 'クイックスタート' },
              slug: 'get-started',
            },
            {
              label: '换成你的主题',
              translations: { en: 'Make It Yours', es: 'Hazlo tuyo', ru: 'Сделайте его своим', ja: '自分のトピックに変える' },
              slug: 'your-theme',
            },
          ],
        },
        {
          label: '方法',
          translations: { en: 'Method', es: 'Método', ru: 'Метод', ja: 'メソッド' },
          items: [{ autogenerate: { directory: 'method' } }],
        },
        {
          label: 'AI 工具',
          translations: { en: 'AI tools', es: 'Herramientas de IA', ru: 'ИИ-инструменты', ja: 'AI ツール' },
          // 显式条目而非 autogenerate：非中文站这几页是 Starlight 的中文 fallback，
          // 侧栏标题取不到各语言页 frontmatter，需在 translations 显式给。
          // slug 与 scripts/sync-docs.mjs 的 SYNC 清单耦合，新增文档需同步改这里。
          items: [
            {
              label: 'AI CLI Guide · 三个 AI 命令行工具',
              translations: { en: 'AI CLI Guide', es: 'Guía de los CLI de IA', ru: 'Руководство по ИИ-CLI', ja: 'AI CLI ガイド' },
              slug: 'ai/ai-cli',
            },
            {
              label: 'Study Coach · `/ask-coach` 学习教练指令',
              translations: { en: 'Study Coach', es: 'Study Coach', ru: 'Study Coach', ja: '学習コーチ' },
              slug: 'ai/ai-study-kit',
            },
            {
              label: 'Configuration · 配置指南',
              translations: { en: 'Configuration', es: 'Configuración', ru: 'Конфигурация', ja: '設定ガイド' },
              slug: 'ai/configuration',
            },
          ],
        },
        {
          label: '维护',
          translations: { en: 'Maintaining', es: 'Mantenimiento', ru: 'Поддержка', ja: 'メンテナンス' },
          items: [
            {
              label: 'Bidirectional Check · 双向校验脚本',
              translations: { en: 'Bidirectional Check', es: 'Verificación bidireccional', ru: 'Двусторонняя проверка', ja: '双方向チェック' },
              slug: 'maintain/bidirectional-check',
            },
          ],
        },
        // 更新日志：sync-docs 从仓库根 CHANGELOG.md 生成（slug 与 SYNC 清单耦合）；
        // 中文内容，en/es/ru/ja 走 fallback + 提示条，与 AI 工具/维护两组同策略
        {
          label: `更新日志 · v${KIT_VERSION}`,
          translations: {
            en: `Changelog · v${KIT_VERSION}`,
            es: `Registro de cambios · v${KIT_VERSION}`,
            ru: `Список изменений · v${KIT_VERSION}`,
            ja: `更新履歴 · v${KIT_VERSION}`,
          },
          slug: 'changelog',
        },
      ],
    }),
  ],
});
