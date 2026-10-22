import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  cacheDir: '../node_modules/.vite-ui-gallery',
  resolve: { alias: { '#': fileURLToPath(new URL('../src', import.meta.url)) } },
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 4318, strictPort: true },
  preview: { host: '127.0.0.1', port: 4318, strictPort: true },
  build: { outDir: '../dist/ui-gallery', emptyOutDir: true },
})
