import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
for (const theme of ['light', 'dark']) test(`customer pause request remains distinct from a confirmed physical pause (${theme})`, async ({ page }) => {
  const html = await readFile(new URL('./fixtures/specimen-holds.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/specimen-holds.html*', r => r.fulfill({ contentType: 'text/html', body: html }))
  let requested = false
  await page.route('**/api/lab-service-orders/order/specimen-holds', async r => {
    if (r.request().method() === 'POST') { expect(r.request().postDataJSON().reason).toBe('Please wait for approval'); requested = true }
    await r.fulfill({ json: { success: true, data: { workOrderId: 'work', specimens: [{ id: 'sample', name: 'RNA-01' }],
      holds: requested ? [{ id: 'hold', labSpecimenId: 'sample', state: 'Requested', reason: 'Please wait for approval', version: 0 }] : [],
      history: [], canRequest: true, canDecide: false } } })
  })
  await page.goto(`/e2e/fixtures/specimen-holds.html?theme=${theme}`)
  await page.getByRole('button', { name: 'Request pause' }).click()
  await page.getByLabel('Reason', { exact: false }).fill('Please wait for approval')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('dialog').getByRole('button', { name: 'Request pause' }).click()
  await expect(page.getByText('Pause requested — awaiting Phaeno')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Request resumption' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})
