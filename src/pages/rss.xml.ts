import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { SITE } from '../lib/site';

export async function GET(context: APIContext) {
  const entries = (await getCollection('writing', ({ data }) => data.public)).sort(
    (a, b) => b.data.date.getTime() - a.data.date.getTime(),
  );
  return rss({
    title: `${SITE.name} — Writing`,
    description: '강의 리포트 원본과 회고.',
    site: context.site!,
    items: entries.map((e) => ({
      title: e.data.title,
      pubDate: e.data.date,
      description: e.data.summary ?? '',
      link: e.data.file ?? '/writing',
    })),
  });
}
