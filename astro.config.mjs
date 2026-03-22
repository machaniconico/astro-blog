// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://4d7fc128.astro-blog-a1f.pages.dev',
	integrations: [mdx(), sitemap()],
});
