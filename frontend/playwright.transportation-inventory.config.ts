import { defineConfig } from '@playwright/test'
import base from './playwright.config'

// A separate fixture server keeps the signed-in manual walkthrough untouched.
const port = 3197
export default defineConfig({
  ...base,
  testMatch: 'transportation-inventory.spec.ts',
  workers: 2,
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --mode test --host 127.0.0.1 --port ${port}`,
    env: { VITE_API_BASE_URL: '/api' },
    url: `http://127.0.0.1:${port}/e2e/fixtures/transportation-inventory.html`,
    reuseExistingServer: !process.env.CI,
  },
})
