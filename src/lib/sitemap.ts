import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { isPostPublic } from './postVisibility';
import { readData } from './readData';

interface SitemapEntry {
  loc: string;
  lastmod?: Date;
}

const staticPages = [
  '/',
  '/blog/',
  '/contato/',
  '/correcoes-e-retratacoes/',
  '/monetizacao-e-transparencia/',
  '/politica-de-cookies/',
  '/politica-de-ia/',
  '/politica-editorial/',
  '/privacidade/',
  '/sobre/',
  '/termos/',
];

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function getSitemapBaseUrl(context: APIContext) {
  const currentOrigin = context.url.origin.replace(/\/$/, '');
  if (/^(https?:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(currentOrigin)) {
    return currentOrigin;
  }

  const site = readData('siteConfig.json', { url: 'https://www.centralbrasileirao.com.br' });
  return (site.url || 'https://www.centralbrasileirao.com.br').replace(/\/$/, '');
}

export async function getSitemapEntries(context: APIContext): Promise<SitemapEntry[]> {
  const baseUrl = getSitemapBaseUrl(context);
  const posts = await getCollection('blog', ({ data }) => isPostPublic(data));
  const categories = readData<Array<{ slug: string }>>('categories.json', []);
  const allowedCategories = new Set(categories.map((category) => category.slug));

  return [
    ...staticPages.map((path) => ({ loc: new URL(path, `${baseUrl}/`).toString() })),
    ...categories.map((category) => ({ loc: new URL(`/${category.slug}/`, `${baseUrl}/`).toString() })),
    ...posts.filter((post) => allowedCategories.has(post.data.category)).map((post) => ({
      loc: new URL(`/${post.id}/`, `${baseUrl}/`).toString(),
      lastmod: post.data.updatedDate || post.data.pubDate,
    })),
  ].sort((a, b) => a.loc.localeCompare(b.loc));
}

export function renderSitemapIndex(sitemapUrl: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${escapeXml(sitemapUrl)}</loc>
  </sitemap>
</sitemapindex>
`;
}

export function renderUrlSet(entries: SitemapEntry[]) {
  const urls = entries.map((entry) => {
    const lastmod = entry.lastmod ? `\n    <lastmod>${entry.lastmod.toISOString()}</lastmod>` : '';
    return `  <url>
    <loc>${escapeXml(entry.loc)}</loc>${lastmod}
  </url>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
