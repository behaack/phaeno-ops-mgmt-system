import { defineConfig } from 'astro/config';
import { fileURLToPath } from 'url';
import tailwind from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
import rehypePhaenoHeadingSearch from './src/lib/rehypePhaenoHeadingSearch.js';
import { llmsTxt } from './src/integrations/llmsTxt';

const isWebsiteReviewMode =
  process.env.PUBLIC_SITE_REVIEW_MODE?.trim().toLowerCase() === 'true';
const reviewSiteUrl =
  process.env.WEBSITE_PREVIEW_SITE_URL?.trim().replace(/\/+$/, '');
const reviewDeploymentHost =
  process.env.VERCEL_BRANCH_URL?.trim()
  || process.env.VERCEL_URL?.trim();
const websiteSite = isWebsiteReviewMode
  ? reviewSiteUrl
    || (reviewDeploymentHost
      ? `https://${reviewDeploymentHost.replace(/^https?:\/\//, '')}`
      : 'https://www.phaenobiotech.com')
  : 'https://www.phaenobiotech.com';

export default defineConfig({
  site: websiteSite,
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
    ...(isWebsiteReviewMode ? [] : [llmsTxt()]),
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
