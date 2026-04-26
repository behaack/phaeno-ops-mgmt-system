import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'

import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      'use-sync-external-store/shim/with-selector': fileURLToPath(
        new URL('./src/shims/use-sync-external-store-with-selector.ts', import.meta.url),
      ),
    },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
})

export default config
