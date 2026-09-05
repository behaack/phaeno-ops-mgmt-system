import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('managed releases show frozen dates, usable grace and disabled cutoff actions', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/managed-retention.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/managed-retention.html', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/managed-retention.html')
  await expect(page.getByRole('heading', { name: 'Laboratory result downloads' })).toBeVisible()
  await expect(page.getByText('Grace period active', { exact: true })).toBeVisible()
  await expect(page.getByText('Downloads closed', { exact: true })).toBeVisible()
  const packages = page.getByRole('button', { name: 'Download package' })
  await expect(packages).toHaveCount(3)
  await expect(packages.nth(1)).toBeEnabled()
  await expect(packages.nth(2)).toBeDisabled()
  await expect(page.getByRole('region', { name: 'Result release 3' }).getByRole('button', { name: /^Download sample/ })).toBeDisabled()
  await packages.first().focus()
  await expect(packages.first()).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.locator('vite-error-overlay').count()).toBe(0)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('managed-retention.png'), fullPage: true })
  expect(errors).toEqual([])
})
