import { expect, test } from '@playwright/test'

test('loads the portal starter dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Phaeno Portal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send invite' })).toBeVisible()
})
