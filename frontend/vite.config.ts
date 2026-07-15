import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import mdx from '@mdx-js/rollup'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    https: {
      key: readFileSync(new URL('./certs/localhost-key.pem', import.meta.url)),
      cert: readFileSync(new URL('./certs/localhost-cert.pem', import.meta.url)),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:44399',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      'use-sync-external-store/shim/with-selector': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    { enforce: 'pre', ...mdx() },
    tailwindcss(),
    tanstackStart(),
    viteReact({ include: /\.(js|jsx|md|mdx|ts|tsx)$/ }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: true,
  },
})

export default config
