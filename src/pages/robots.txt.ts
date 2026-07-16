import type { APIRoute } from 'astro';
import { readData } from '../lib/readData';

export const prerender = true;

export const GET: APIRoute = () => {
  const site = readData('siteConfig.json', { url: 'https://www.centralbrasileirao.com.br' });
  const siteUrl = (site.url || 'https://www.centralbrasileirao.com.br').replace(/\/$/, '');

  return new Response(`User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap-index.xml
`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
};
