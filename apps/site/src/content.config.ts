import { defineCollection } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';

// Starlight 内容集合（Astro Content Layer）：src/content/docs/ 下的页面经此加载
export const collections = {
  docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
};
