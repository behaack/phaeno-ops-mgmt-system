import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

for (const ambient of [false, true]) {
  test(`packing review shows shared steps once and ${ambient ? 'no cooling' : 'regular ice'} for the actual container`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    const html = await readFile(new URL('./fixtures/shipping-insert.html', import.meta.url), 'utf8')
    await page.route('**/e2e/fixtures/shipping-insert.html?*', route => route.fulfill({ contentType: 'text/html', body: html }))
    await page.goto(`/e2e/fixtures/shipping-insert.html?packingReview${ambient ? '&ambient' : ''}`)
    for (const theme of ['light', 'dark']) {
      await page.evaluate(theme => document.documentElement.classList.toggle('dark', theme === 'dark'), theme)
      await expect(page.getByRole('heading', { name: 'Common shipping steps', exact: true })).toHaveCount(1)
      await expect(page.getByText('Use the shared approved outer packaging.', { exact: true })).toHaveCount(1)
      await expect(page.getByText(ambient ? 'No cooling required for this approved container.' : 'Regular ice: 1 kg for the entire small container.', { exact: true })).toHaveCount(1)
      await expect(page.getByText('Seal the RNA secondary bag.', { exact: true })).toBeVisible()
      await expect(page.getByText('Seal the DNA secondary bag.', { exact: true })).toBeVisible()
      await expect(page.getByText(/Applies to: RNA, DNA/)).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
      expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
      await page.screenshot({ path: info.outputPath(`packing-${theme}.png`), fullPage: true })
    }
    expect(errors).toEqual([])
  })
}
