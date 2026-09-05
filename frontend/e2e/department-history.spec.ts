import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('department history renders and clears across context and role changes', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const historyScopes: string[] = []
  let releaseResearch!: () => void
  const researchReady = new Promise<void>((resolve) => { releaseResearch = resolve })
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, async (route) => {
    const path = new URL(route.request().url()).pathname
    const department = route.request().headers()['x-department-id']
    if (path.endsWith('/curated-data/downloads')) {
      historyScopes.push(department)
      if (department === 'research') await researchReady
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [{
        id: department, userId: 'user', userEmail: `${department}@example.test`, datasetVersionId: 'version',
        kind: 'File', managedFileId: 'file', downloadedAt: '2026-09-04T12:00:00Z',
      }] }) })
    }
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) })
  })
  const html = await readFile(new URL('./fixtures/department-history.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/department-history.html', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/department-history.html')
  await expect(page.getByRole('heading', { name: 'Data Library' })).toBeVisible()
  await expect(page.getByText('Department download history', { exact: true })).toBeVisible()
  await expect(page.getByText('general@example.test')).toBeVisible()
  expect(await page.locator('vite-error-overlay').count()).toBe(0)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('department-history.png'), fullPage: true })
  await page.getByRole('button', { name: 'Switch to Research' }).click()
  await expect.poll(() => historyScopes).toEqual(['general', 'research'])
  await expect(page.getByText('general@example.test')).toHaveCount(0)
  releaseResearch()
  await expect(page.getByText('research@example.test')).toBeVisible()
  await page.getByRole('button', { name: 'Use member rights' }).click()
  await expect(page.getByText('Department download history', { exact: true })).toHaveCount(0)
  await expect(page.getByText('research@example.test')).toHaveCount(0)
  expect(historyScopes).toEqual(['general', 'research'])
  expect(errors).toEqual([])
})
