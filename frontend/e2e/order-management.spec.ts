import { expect, test } from '@playwright/test'

test('shows Customer laboratory services in mock mode', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.goto('/lab-services')

  await expect(page.getByRole('heading', { name: 'Lab services' })).toBeVisible()
  await expect(page.getByText('Connected orders are paused in mock-session mode')).toBeVisible()
  await page.getByRole('link', { name: 'Request lab service' }).click()

  const jobDetails = page.getByRole('dialog', { name: 'Job pricing details' })
  await expect(jobDetails).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-header"]')).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-body"]')).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-footer"]')).toBeVisible()
  await expect(jobDetails.getByLabel('Job name')).toBeVisible()
  await expect(jobDetails.getByRole('group', { name: 'Biological-source composition' })).toBeVisible()
  await expect(jobDetails.getByLabel('Biological source for source group 1')).toBeVisible()
  await expect(jobDetails.getByLabel('Samples for source group 1')).toHaveValue('1')
  await expect(jobDetails.getByLabel('Storage requirements')).toBeVisible()
  await expect(jobDetails.getByLabel('Safety declaration')).toBeVisible()
  await expect(jobDetails.getByLabel('Job notes (optional)')).toBeVisible()
  await expect(jobDetails.getByLabel('Customer sample ID')).toHaveCount(0)
  await expect(jobDetails.getByRole('button', { name: 'Create job' })).toBeDisabled()

  await page.mouse.click(4, 4)
  await expect(jobDetails).toBeVisible()
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
  await openSidebarIfCollapsed(page, 'Order operations')
  await expect(page.getByRole('button', { name: /^Order intake/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: /^Order staging/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Attention/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^PSeq kits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Assembly/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Result release/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Finance/ })).toBeVisible()
  await closeSidebarIfExpanded(page, 'Order operations')
  await page.getByRole('button', { name: 'New Customer order' }).click()
  const initiatedOrder = page.getByRole('dialog', { name: 'New Customer order' })
  await expect(initiatedOrder).toBeVisible()
  await expect
    .poll(() => page.locator('body').evaluate((body) => getComputedStyle(body).overflow))
    .toBe('hidden')
  await expect(initiatedOrder.getByText('Creation is paused in mock-session mode')).toBeVisible()
  const customerSearch = initiatedOrder.getByRole('combobox', { name: 'Customer' })
  await expect(customerSearch).toBeVisible()
  await expect(customerSearch).toHaveAttribute('aria-autocomplete', 'list')
  await expect(initiatedOrder.getByLabel('Job name')).toBeVisible()
  await expect(initiatedOrder.getByRole('group', { name: 'Biological-source composition' })).toBeVisible()
  await expect(initiatedOrder.getByLabel(/no patient identifiers, PHI/)).toBeVisible()
  await expect(initiatedOrder.getByRole('button', { name: 'Start pricing' })).toBeDisabled()
  await initiatedOrder.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect
    .poll(() => page.locator('body').evaluate((body) => getComputedStyle(body).overflow))
    .not.toBe('hidden')

  await page.goto('/lab-operations')
  await expect(page.getByRole('heading', { name: 'Lab operations' })).toBeVisible()
  await openSidebarIfCollapsed(page, 'Lab operations')
  await expect(page.getByRole('button', { name: /^Receipt & accession/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: /^PSeq kits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Data assembly/ })).toBeVisible()

  await page.goto('/order-configuration')
  await expect(page.getByRole('heading', { name: 'Order configuration' })).toBeVisible()
  await expect(page.getByText('Connected configuration is paused in mock-session mode')).toBeVisible()
  await openSidebarIfCollapsed(page, 'Order configuration')
  await expect(page.getByRole('button', { name: /^Defaults/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: /^Analyses/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^PSeq kits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Assembly/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Legacy links/ })).toBeVisible()
})

async function selectOrganization(page: import('@playwright/test').Page, organizationId: string) {
  await page.addInitScript((selectedOrganizationId) => {
    window.localStorage.setItem('phaeno.selectedOrganizationId', selectedOrganizationId)
  }, organizationId)
}

async function openSidebarIfCollapsed(
  page: import('@playwright/test').Page,
  workspaceLabel: string,
) {
  const trigger = page.getByRole('button', {
    name: new RegExp(`^(?:Open|Close) ${workspaceLabel} navigation`),
  })
  if ((page.viewportSize()?.width ?? 1280) < 1024) {
    await expect(trigger).toBeVisible()
    await expect(async () => {
      if (await trigger.getAttribute('aria-expanded') !== 'true') {
        await trigger.click()
      }
      await expect(trigger).toHaveAttribute('aria-expanded', 'true')
    }).toPass()
  }
}

async function closeSidebarIfExpanded(
  page: import('@playwright/test').Page,
  workspaceLabel: string,
) {
  const trigger = page.getByRole('button', {
    name: new RegExp(`^(?:Open|Close) ${workspaceLabel} navigation`),
  })
  if (
    (page.viewportSize()?.width ?? 1280) < 1024 &&
    (await trigger.getAttribute('aria-expanded')) === 'true'
  ) {
    await trigger.click()
    await expect(trigger).toHaveAttribute('aria-expanded', 'false')
  }
}
