import { expect, test } from '@playwright/test'

test('shows Customer laboratory services in mock mode', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.goto('/lab-services')

  await expect(page.getByRole('heading', { name: 'Lab services' })).toBeVisible()
  await expect(page.getByText('Connected orders are paused in mock-session mode')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request lab service' })).toBeVisible()
})

test('shows Partner reagent and data-assembly work in mock mode', async ({ page }) => {
  await selectOrganization(page, 'genome-partner')

  await page.goto('/reagent-orders')
  await expect(page.getByRole('heading', { name: 'Reagent orders' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Place reagent order' })).toBeVisible()

  await page.goto('/data-assembly')
  await expect(page.getByRole('heading', { name: 'Data assembly' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request data assembly' })).toBeVisible()
})

test('shows Phaeno operations and configuration workspaces in mock mode', async ({ page }) => {
  await selectOrganization(page, 'phaeno')

  await page.goto('/order-operations')
  await expect(page.getByRole('heading', { name: 'Order operations' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Integrations' })).toBeVisible()

  await page.goto('/order-configuration')
  await expect(page.getByRole('heading', { name: 'Order configuration' })).toBeVisible()
  await expect(page.getByText('Connected configuration is paused in mock-session mode')).toBeVisible()
})

async function selectOrganization(page: import('@playwright/test').Page, organizationId: string) {
  await page.addInitScript((selectedOrganizationId) => {
    window.localStorage.setItem('phaeno.selectedOrganizationId', selectedOrganizationId)
  }, organizationId)
}
