// 官网部署拓扑的唯一事实源（single source of truth）：
// GitHub Pages 项目页挂在 https://<owner>.github.io/ai-study-kit/ 下。
// astro.config.mjs 的 base、build-demo.mjs 的 DEMO_BASE、内容页内部链接前缀都从这里取，
// 改域名/路径只动这一个文件（注意：已发布的内容 URL 会变，需配重定向）。
export const SITE_BASE = '/ai-study-kit';

/** 可玩 demo 在官网下的挂载子路径（wayfinder #12：子路径直接挂 quiz-app 静态产物） */
export const DEMO_BASE = `${SITE_BASE}/demo`;
