import type { APIRoute } from 'astro';
import { getSitemapBaseUrl, renderSitemapIndex } from '../lib/sitemap';

export const prerender = true;

export const GET: APIRoute = (context) => {
  const baseUrl = getSitemapBaseUrl(context);

  return new Response(renderSitemapIndex(new URL('/sitemap-0.xml', `${baseUrl}/`).toString()), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
    },
  });
};
