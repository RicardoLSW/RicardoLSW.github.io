import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { site } from '../lib/site';

export async function GET(context: APIContext) {
  const items = (await getCollection('travel', ({ data }) => !data.draft))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .map((entry) => ({ title: entry.data.title, description: entry.data.description, pubDate: entry.data.publishedDate, link: `/travel/${entry.id}/` }));

  return rss({
    title: site.title,
    description: site.description,
    site: context.site!,
    items,
    customData: '<language>zh-CN</language>',
  });
}
