import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('governed retention shows frozen dates, usable grace and closed downloads', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/governed-retention.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/governed-retention.html', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/governed-retention.html')
  await expect(page.getByRole('heading', { name: 'Released result retention' })).toBeVisible()
  await expect(page.getByText('Grace period active', { exact: true })).toBeVisible()
  await expect(page.getByText('Downloads closed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download result' })).toHaveCount(2)
  await page.getByRole('button', { name: 'Download result' }).first().focus()
  await expect(page.getByRole('button', { name: 'Download result' }).first()).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(await page.locator('vite-error-overlay').count()).toBe(0)
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(accessibility.violations).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('governed-retention.png'), fullPage: true })
  expect(errors).toEqual([])
})
