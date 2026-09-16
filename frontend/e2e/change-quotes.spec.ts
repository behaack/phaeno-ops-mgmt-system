import { readFileSync } from 'node:fs'
import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

for (const width of [320, 1440]) for (const colorScheme of ['light', 'dark'] as const) {
  test(`Change quote review ${width} ${colorScheme}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 835 }); await page.emulateMedia({ colorScheme })
    const writes: Array<Record<string, unknown>> = []
    await page.route(url => url.pathname.startsWith('/api/'), async route => { writes.push(route.request().postDataJSON()); await route.fulfill({ json: { success: true, data: {}, meta: {} } }) })
    const html = readFileSync(new URL('./fixtures/change-quotes.html', import.meta.url), 'utf8')
    await page.route('**/e2e/fixtures/change-quotes.html', route => route.fulfill({ contentType: 'text/html', body: html }))
    await page.goto('/e2e/fixtures/change-quotes.html')
    await page.getByRole('button', { name: 'Issue Change quote' }).click()
    await page.getByLabel('Biological source', { exact: false }).fill('Mouse liver')
    await page.getByRole('spinbutton', { name: 'Additional samples', exact: true }).fill('1')
    await page.getByLabel('Price per additional sample', { exact: false }).fill('100')
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('issue-change.png'), fullPage: true })
    await page.getByRole('dialog').getByRole('button', { name: 'Issue Change quote' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes[0]).toMatchObject({ version: 5, purpose: 'Change', additionalSources: [{ biologicalSource: 'Mouse liver', specimenCount: 1 }] })
    await page.getByRole('button', { name: 'Review and accept addition' }).click()
    await expect(page.getByRole('button', { name: 'Accept addition' })).toBeDisabled()
    await page.getByRole('textbox', { name: /Purchase order number/ }).fill('PO-CHANGE')
    await page.getByRole('checkbox').focus(); await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Accept addition' })).toBeEnabled()
    await expect(page.getByRole('button', { name: 'Accept addition' })).toHaveCSS('opacity', '1')
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    await page.screenshot({ path: info.outputPath('accept-change.png'), fullPage: true })
    await page.getByRole('button', { name: 'Accept addition' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    expect(writes[1]).toMatchObject({ version: 5, purchaseOrderNumber: 'PO-CHANGE' })
  })
}
