import { defineConfig } from '@playwright/test'
import base from './playwright.config'

const port = 3196
export default defineConfig({
  ...base,
  testMatch: /sample-investigation(?:\.phase1-connected)?\.spec\.ts/,
  workers: 1,
  reporter: process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS ? [['list'], ['json', { outputFile: `${process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS}/browser-results.json` }]] : 'list',
  retries: 0,
  outputDir: process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS ? `${process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS}/browser` : '../.tmp/phase1-verification/browser',
  use: { ...base.use, baseURL: `http://127.0.0.1:${port}` },
  webServer: {
    command: `node node_modules/vite/bin/vite.js --mode test --host 127.0.0.1 --port ${port}`,
    env: { VITE_API_BASE_URL: '/api', VITE_USE_MOCK_SESSION: 'true' },
    url: `http://127.0.0.1:${port}/e2e/fixtures/sample-investigation.html`,
    reuseExistingServer: false,
  },
})
