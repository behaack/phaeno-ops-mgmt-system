import { defineConfig } from '@playwright/test'
import base from './playwright.config'

const port = 3199
export default defineConfig({
  ...base,
  testMatch: /sample-recovery\.phase4-connected\.spec\.ts/,
  workers: 1,
  maxFailures: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: `${process.env.PSEQ_PHASE4_ARTIFACTS}/browser-results.json` }]],
  outputDir: `${process.env.PSEQ_PHASE4_ARTIFACTS}/browser`,
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}`, actionTimeout: 20_000, screenshot: 'only-on-failure', trace: 'retain-on-failure' },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --mode test --host 127.0.0.1 --port ${port}`,
    env: { VITE_API_BASE_URL: '/api', VITE_USE_MOCK_SESSION: 'true' },
    url: `http://127.0.0.1:${port}/e2e/fixtures/sample-recovery-phase4.html`,
    reuseExistingServer: false,
  },
})
