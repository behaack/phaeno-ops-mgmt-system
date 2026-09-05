import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('retained receipt preserves full manifest and readable printable metadata', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/release-receipt.html', (route) => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/release-receipt.html')
  await expect(page.getByRole('heading', { name: 'Released package receipt' })).toBeVisible()
  await expect(page.getByText('SUPPLIER-001')).toBeVisible()
  await expect(page.getByText('35-sample-transcript', { exact: false })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('receipt.png'), fullPage: true })
  await page.emulateMedia({ media: 'print', colorScheme: 'light' })
  await expect(page.getByRole('heading', { name: 'Package manifest' })).toBeVisible()
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toContain('light')
  await page.pdf({ path: info.outputPath('receipt.pdf'), format: 'A4', printBackground: true })
  expect(errors).toEqual([])
})
