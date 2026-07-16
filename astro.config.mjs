import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { readFileSync } from 'node:fs';

const isBuildCommand = process.argv.includes('build');

function getConfiguredSiteUrl() {
  try {
    const config = JSON.parse(readFileSync(new URL('./src/data/siteConfig.json', import.meta.url), 'utf-8'));
    return (config.url || 'https://www.centralbrasileirao.com.br').replace(/\/$/, '');
  } catch {
    return 'https://www.centralbrasileirao.com.br';
  }
}

export default defineConfig({
  site: getConfiguredSiteUrl(),
  trailingSlash: 'ignore',
  output: 'static',
  adapter: vercel(),
  devToolbar: {
    enabled: false,
  },
  integrations: [
    react(),
    tailwind({ applyBaseStyles: false }),
  ],
  markdown: {
    shikiConfig: {
      theme: 'dracula',
    },
  },
  vite: {
    cacheDir: isBuildCommand
      ? 'node_modules/.vite-central-brasileirao-build'
      : 'node_modules/.vite-central-brasileirao-dev',
    server: {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
    optimizeDeps: {
      include: ['marked', 'lucide-react'],
    },
  },
});
