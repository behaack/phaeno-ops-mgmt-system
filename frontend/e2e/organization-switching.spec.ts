import { expect, test } from '@playwright/test'

test('switches own organizations through the user menu and refreshes documentation scope', async ({ page, isMobile }) => {
  await page.goto('/docs')
  await expect(page.getByRole('heading', { name: 'Phaeno documentation', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open user menu', exact: true }).click()
  await page.getByRole('combobox', { name: 'Organization', exact: true }).selectOption({ label: 'Northline Labs' })
  await expect(page).toHaveURL(/\/$/)
  await expect(page.getByRole('link', { name: 'Portal home', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Open user menu', exact: true }).click()
  await page.getByRole(isMobile ? 'link' : 'menuitem', { name: 'Documentation', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Customer documentation', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Customer documentation', exact: true })).toBeVisible()
})
