import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mdx from '@mdx-js/rollup'
import { documentationMarkdown } from '../scripts/documentation-markdown.mjs'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  publicDir: '../public',
  cacheDir: '../node_modules/.vite-ui-gallery',
  resolve: { alias: { '#': fileURLToPath(new URL('../src', import.meta.url)) } },
  plugins: [{ enforce: 'pre', ...mdx({ remarkPlugins: [documentationMarkdown] }) }, react({ include: /\.(js|jsx|md|mdx|ts|tsx)$/ }), tailwindcss()],
  server: { host: '127.0.0.1', port: 4318, strictPort: true },
  preview: { host: '127.0.0.1', port: 4318, strictPort: true },
  build: { outDir: '../dist/ui-gallery', emptyOutDir: true, rollupOptions: { input: {
    gallery: fileURLToPath(new URL('./index.html', import.meta.url)),
    features: fileURLToPath(new URL('./features.html', import.meta.url)),
    research: fileURLToPath(new URL('./research.html', import.meta.url)),
  } } },
})
