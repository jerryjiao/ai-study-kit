// ai-study-kit 官网（wayfinder map #9 / #10 选型：Astro Starlight）。
// 部署形态：GitHub Pages 项目页 → https://jerryjiao.github.io/ai-study-kit/
// 双语（#13）：zh-cn 为默认语言挂在根路径，en 挂 /en/，未翻译页 fallback 到中文 + 提示条。
// demo（#12）：构建时把 quiz-app 静态产物拷进 public/demo/（见 scripts/build-demo + CI）。
import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { SITE_BASE } from './site.config.mjs';

export default defineConfig({
  site: 'https://jerryjiao.github.io',
  base: SITE_BASE,
  integrations: [
    starlight({
      title: 'ai-study-kit',
      // 放 src/assets 让 Astro 优化；不透明深底图浅/深主题通用，无需 dark 反色版。
      // 头部 logo（assets/logo.png 定稿，quiz-app 顶栏/favicon 同源）。
      logo: { src: './src/assets/logo.png', alt: 'ai-study-kit logo' },
      description: '把任意主题的题库变成完整学习闭环的开源脚手架',
      defaultLocale: 'root',
      locales: {
        // root = 中文（内容在 src/content/docs/ 根，URL 不带前缀）；
        // en 挂 /en/，未翻译页 fallback 到中文原文 + 提示条（#13 分层策略）
        root: { label: '简体中文', lang: 'zh-CN' },
        en: { label: 'English', lang: 'en' },
      },
      customCss: ['./src/styles/custom.css'],
      // OG 分享图（#14：C 风基准，scripts/gen-og.py 生成 public/og.png 后提交入库）
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: `https://jerryjiao.github.io${SITE_BASE}/og.png` } },
        { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
      ],
      // 单一 sidebar（Starlight 多语言模型）：组/条目标签用 translations 按 BCP-47 覆盖，
      // slug 不含语言前缀、自动取各语言页面的 frontmatter 标题（#13：旅程四组）
      sidebar: [
        {
          label: '开始',
          translations: { en: 'Get started' },
          items: [
            {
              label: '快速上手',
              translations: { en: 'Quick Start' },
              slug: 'get-started',
            },
            {
              label: '换成你的主题',
              translations: { en: 'Make It Yours' },
              slug: 'your-theme',
            },
          ],
        },
        {
          label: '方法',
          translations: { en: 'Method' },
          items: [{ autogenerate: { directory: 'method' } }],
        },
        {
          label: 'AI 工具',
          translations: { en: 'AI tools' },
          items: [{ autogenerate: { directory: 'ai' } }],
        },
        {
          label: '维护',
          translations: { en: 'Maintaining' },
          items: [{ autogenerate: { directory: 'maintain' } }],
        },
      ],
    }),
  ],
});
