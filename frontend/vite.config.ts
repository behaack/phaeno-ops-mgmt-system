import { defineConfig } from 'vitest/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import mdx from '@mdx-js/rollup'
import { nitro } from 'nitro/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig(({ command }) => ({
  server: {
    host: '127.0.0.1',
    port: 3000,
    https:
      command === 'serve'
        ? {
            key: readFileSync(new URL('./certs/localhost-key.pem', import.meta.url)),
            cert: readFileSync(new URL('./certs/localhost-cert.pem', import.meta.url)),
          }
        : undefined,
  },
  resolve: {
    tsconfigPaths: true,
    alias: {
      'use-sync-external-store/with-selector': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
      'use-sync-external-store/with-selector.js': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
      'use-sync-external-store/shim/with-selector': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
      'use-sync-external-store/shim/with-selector.js': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
    },
  },
  plugins: [
    { enforce: 'pre', ...mdx() },
    tailwindcss(),
    tanstackStart(),
    nitro({
      devProxy: {
        '/api/**': {
          target: 'https://localhost:44399',
          changeOrigin: true,
          secure: false,
        },
      },
    }),
    viteReact({ include: /\.(js|jsx|md|mdx|ts|tsx)$/ }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    css: true,
  },
}))

export default config
