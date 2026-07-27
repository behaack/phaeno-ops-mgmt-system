import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import tailwind from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypePhaenoHeadingSearch from './src/lib/rehypePhaenoHeadingSearch.js';

export default defineConfig({
  site: 'https://www.phaenobiotech.com',
  trailingSlash: 'never',
  output: 'static',

  markdown: {
    processor: unified({
      rehypePlugins: [rehypePhaenoHeadingSearch],
    }),
  },

  redirects: {
    // Technology route consolidation
    '/technology': { destination: '/technology/pseq-platform', status: 308 },
    '/multi-omics': { destination: '/technology/multi-omics', status: 308 },
    '/why-isoforms-matter': { destination: '/technology/why-isoforms-matter', status: 308 },
  },

  integrations: [
    mdx(),
    react(),
    sitemap(),
    (await import('astro-compress')).default({
      CSS: false,
    }),
  ],

  vite: {
    build: { minify: 'esbuild' },
    plugins: [tailwind()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});
