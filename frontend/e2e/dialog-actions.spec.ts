import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('dialog actions survive blur-driven layout changes while keyboard validation remains available', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/dialog-actions.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/dialog-actions.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/dialog-actions.html')
  const opener = page.getByRole('button', { name: 'Open example form' })
  const dialog = page.getByRole('dialog', { name: 'Example form' })
  for (const action of ['Cancel', 'Close']) {
    await opener.click()
    await expect(dialog.getByLabel('Customer')).toBeFocused()
    const bounds = await dialog.getByRole('button', { name: action, exact: true }).boundingBox()
    if (!bounds) throw new Error(`${action} is not visible`)
    // A single physical click exposes movement between mouse-down and mouse-up.
    await page.mouse.click(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    await expect(dialog).toHaveCount(0)
    await expect(opener).toBeFocused()
  }
  await opener.click()
  await page.keyboard.press('Tab')
  await expect(dialog.getByText('Customer is required.')).toBeVisible()
  await expect(dialog.getByLabel('Reference')).toBeFocused()
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog.getByText('Reference is required.')).toBeVisible()
  await expect(dialog.getByLabel('Customer')).toBeFocused()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await dialog.getByLabel('Customer').selectOption('example')
  await dialog.getByLabel('Reference').fill('EXAMPLE-1')
  await dialog.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Example saved')
  await opener.click()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
  await opener.click()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).press('Enter')
  await expect(dialog).toHaveCount(0)
  if (info.project.name === 'mobile-chrome') {
    await opener.tap()
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).tap()
    await expect(dialog).toHaveCount(0)
  }
})
