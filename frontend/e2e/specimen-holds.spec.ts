import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
for (const theme of ['light', 'dark']) test(`customer specimen hold controls remain suppressed without querying or writing holds (${theme})`, async ({ page }) => {
  const html = await readFile(new URL('./fixtures/specimen-holds.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/specimen-holds.html*', r => r.fulfill({ contentType: 'text/html', body: html }))
  let requests = 0
  await page.route('**/api/lab-service-orders/order/specimen-holds', async r => {
    requests++
    await r.fulfill({ json: { success: true, data: { workOrderId: 'work', specimens: [{ id: 'sample', name: 'RNA-01' }],
      holds: [{ id: 'hold', labSpecimenId: 'sample', state: 'Requested', reason: 'TEST ONLY retained request', version: 0 }],
      history: [], canRequest: true, canDecide: false } } })
  })
  await page.goto(`/e2e/fixtures/specimen-holds.html?theme=${theme}`)
  await expect(page.getByRole('heading', { name: 'Test specimen holds' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request pause' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Request resumption' })).toHaveCount(0)
  await expect(page.getByText('Pause requested — awaiting Phaeno')).toHaveCount(0)
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  for (const width of [320, 375, 1440]) {
    await page.setViewportSize({ width, height: 950 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(requests).toBe(0)
})
