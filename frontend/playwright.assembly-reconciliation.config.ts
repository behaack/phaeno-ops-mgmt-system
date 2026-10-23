import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './ui-gallery/tests', testMatch: 'assembly-reconciliation.spec.ts', fullyParallel: true, workers: 2,
  reporter: 'list', outputDir: './test-results/assembly-reconciliation',
  use: { baseURL: 'http://127.0.0.1:4334', locale: 'en-US', timezoneId: 'UTC', screenshot: 'only-on-failure', contextOptions: { reducedMotion: 'reduce' } },
  webServer: { command: 'node node_modules/vite/bin/vite.js --config ui-gallery/vite.config.ts --port 4334', url: 'http://127.0.0.1:4334', reuseExistingServer: false },
  projects: [
    { name: 'desktop-light', use: { browserName: 'chromium', viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'phone-dark', use: { browserName: 'chromium', viewport: { width: 320, height: 844 }, colorScheme: 'dark' } },
  ],
})
