import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { isPostPublic } from '../lib/postVisibility';
import { readData } from '../lib/readData';

export async function GET(context: APIContext) {
  const posts = await getCollection('blog', ({ data }) => isPostPublic(data));
  const site = readData('siteConfig.json', {
    name: 'Central Brasileirão',
    description: 'Análises, histórias e contexto sobre o futebol brasileiro.',
  });
  const categories = readData<Array<{ slug: string }>>('categories.json', []);
  const allowedCategories = new Set(categories.map((category) => category.slug));

  return rss({
    title: site.name,
    description: site.description,
    site: context.site!,
    items: posts
      .filter((post) => allowedCategories.has(post.data.category))
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.pubDate,
        description: post.data.description,
        link: `/${post.id}/`,
      })),
    customData: '<language>pt-br</language>',
  });
}
