import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './ui-gallery/tests',
  fullyParallel: true,
  workers: 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: 'list',
  outputDir: './test-results/ui-gallery',
  use: { baseURL: 'http://127.0.0.1:4319', trace: 'retain-on-failure', screenshot: 'only-on-failure', contextOptions: { reducedMotion: 'reduce' } },
  webServer: { command: 'node node_modules/vite/bin/vite.js --config ui-gallery/vite.config.ts --port 4319', url: 'http://127.0.0.1:4319', reuseExistingServer: false },
  projects: [
    { name: 'desktop-light', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'light' } },
    { name: 'desktop-dark', use: { viewport: { width: 1280, height: 900 }, colorScheme: 'dark' } },
    { name: 'narrow-light', use: { viewport: { width: 390, height: 844 }, colorScheme: 'light' } },
    { name: 'narrow-dark', use: { viewport: { width: 390, height: 844 }, colorScheme: 'dark' } },
  ],
})
