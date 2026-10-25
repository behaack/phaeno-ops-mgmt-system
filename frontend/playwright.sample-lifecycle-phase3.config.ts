import { defineConfig } from '@playwright/test'
import base from './playwright.config'

export default defineConfig({ ...base, testMatch: /sample-lifecycle\.phase3-connected\.spec\.ts/, workers: 1,
  reporter: process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS ? [['list'], ['json', { outputFile: `${process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS}/browser-results.json` }]] : 'list',
  retries: 0,
  outputDir: process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS ? `${process.env.PSEQ_SAMPLE_BROWSER_ARTIFACTS}/browser` : '../.tmp/phase3-verification/browser',
  use: { ...base.use, baseURL: 'http://127.0.0.1:3198', timezoneId: 'UTC' },
  webServer: { command: 'node node_modules/vite/bin/vite.js --mode test --host 127.0.0.1 --port 3198',
    env: { VITE_API_BASE_URL: '/api', VITE_USE_MOCK_SESSION: 'true' }, url: 'http://127.0.0.1:3198/e2e/fixtures/sample-lifecycle-phase3.html', reuseExistingServer: false },
})
