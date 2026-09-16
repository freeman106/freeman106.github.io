// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// 배포 도메인은 env 로 받는다. 없으면 로컬 빌드용 자리표시자.
const site = process.env.SITE_URL || 'https://freeman106.github.io';

// https://astro.build/config
export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [mdx(), sitemap({ filter: (page) => !page.includes('/print') })],
});
