import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page }) => {
  const html = await readFile(new URL('./fixtures/lab-quote-acceptance.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/lab-quote-acceptance.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
})

test('saved quote acceptance reaches Progress with kit requests enabled, without discarding or refreshing', async ({ page }) => {
  await page.goto('/e2e/fixtures/lab-quote-acceptance.html')
  await page.getByRole('group', { name: 'Quote actions' }).getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Accept quote', exact: true }).click()
  const accept = page.getByRole('dialog', { name: /Accept quote for/ })
  await accept.getByRole('textbox', { name: /Purchase order number/ }).fill('SYNTHETIC-PO')
  await accept.getByRole('checkbox').check()
  await accept.getByRole('button', { name: 'Confirm price and order' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page).toHaveURL(/detailTab=phases/)
  await expect(page.getByRole('tab', { name: 'Progress', exact: true })).toHaveAttribute('aria-selected', 'true')
  const request = page.getByRole('button', { name: 'Request transportation kits', exact: true })
  await expect(request).toBeEnabled()
  await request.click()
  await expect(page.getByRole('dialog', { name: 'Request transportation kits', exact: true })).toBeVisible()
  await expect(page.getByTestId('synthetic-operations')).toHaveText('Accepted decisions: 1 · Kit requests: 0')
})

test('leaving unsubmitted acceptance still asks to discard and can keep the entries', async ({ page }) => {
  await page.goto('/e2e/fixtures/lab-quote-acceptance.html')
  await page.getByRole('group', { name: 'Quote actions' }).getByRole('button', { name: 'Actions' }).click()
  await page.getByRole('menuitem', { name: 'Accept quote', exact: true }).click()
  const accept = page.getByRole('dialog', { name: /Accept quote for/ })
  await accept.getByRole('textbox', { name: /Purchase order number/ }).fill('UNSAVED-PO')
  await accept.getByRole('checkbox').check()
  await accept.getByRole('button', { name: 'Keep reviewing' }).click()
  const discard = page.getByRole('dialog', { name: 'Discard unsaved order changes?' })
  await expect(discard).toBeVisible()
  await discard.getByRole('button', { name: 'Keep reviewing' }).click()
  await expect(accept.getByRole('textbox', { name: /Purchase order number/ })).toHaveValue('UNSAVED-PO')
  await expect(accept.getByRole('checkbox')).toBeChecked()
  await expect(page.getByTestId('synthetic-operations')).toHaveText('Accepted decisions: 0 · Kit requests: 0')
})
