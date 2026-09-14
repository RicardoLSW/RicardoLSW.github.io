import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '../lib/site';

export async function GET(context: APIContext) {
  const travel = await getCollection('travel', ({ data }) => !data.draft);
  const legacy = await getCollection('legacy');
  const items = [
    ...travel.map((entry) => ({ title: entry.data.title, description: entry.data.description, pubDate: entry.data.date, link: `/travel/${entry.id}/` })),
    ...legacy.map((entry) => ({ title: entry.data.title, description: entry.data.description, pubDate: entry.data.date, link: entry.data.legacyPath })),
  ].sort((a, b) => b.pubDate.valueOf() - a.pubDate.valueOf());

  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    items,
    customData: '<language>zh-CN</language>',
  });
}
