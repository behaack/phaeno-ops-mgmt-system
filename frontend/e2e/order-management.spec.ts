import { expect, test } from '@playwright/test'

test('shows Customer laboratory services in mock mode', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.goto('/lab-services')

  // A cold development server must hydrate the stored mock organization first.
  await expect(page.getByRole('heading', { name: 'Lab services' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText('Connected records are paused in mock-session mode')).toBeVisible()
  await page.getByRole('link', { name: 'Request lab service' }).click()

  const jobDetails = page.getByRole('dialog', { name: 'New lab service order' })
  await expect(jobDetails).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-header"]')).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-body"]')).toBeVisible()
  await expect(jobDetails.locator(':scope > [data-slot="dialog-footer"]')).toBeVisible()
  await expect(jobDetails.getByLabel('Job name')).toBeVisible()
  await expect(jobDetails.getByRole('group', { name: /Biological-source composition/ })).toBeVisible()
  await expect(jobDetails.getByRole('textbox', { name: 'Biological source' })).toBeVisible()
  await expect(jobDetails.getByRole('spinbutton', { name: 'Samples' })).toHaveValue('1')
  await expect(jobDetails.getByRole('checkbox', { name: 'Use different storage requirements' })).toBeVisible()
  await expect(jobDetails.getByLabel('Safety declaration')).toBeVisible()
  await expect(jobDetails.getByLabel('Job notes (optional)')).toBeVisible()
  await expect(jobDetails.getByLabel('Customer sample ID')).toHaveCount(0)
  await expect(jobDetails.getByRole('button', { name: 'Save draft' })).toBeDisabled()
  await expect(jobDetails.getByRole('button', { name: 'Review order' })).toBeDisabled()
  await expect(jobDetails.getByRole('checkbox', { name: 'Use phases' })).toHaveCount(0)

  await page.mouse.click(4, 4)
  await expect(jobDetails).toBeVisible()
})

test('shows Partner reagent and data-assembly work in mock mode', async ({ page }) => {
  await selectOrganization(page, 'genome-partner')

  await page.goto('/reagent-orders')
  await expect(page.getByRole('heading', { name: 'PSeq Kit orders' })).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: 'Create PSeq Kit order' })).toBeVisible()

  await page.goto('/data-assembly')
  await expect(page.getByRole('heading', { name: 'Assembly cases' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request data assembly' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Open PSeq Kit orders' })).toBeVisible()
})

test('shows Phaeno operations and configuration workspaces in mock mode', async ({ page }) => {
  await selectOrganization(page, 'phaeno')

  await page.goto('/order-operations')
  await expect(page.getByRole('heading', { name: 'Order operations', level: 1 })).toBeVisible()
  await expect(page).toHaveURL(/\/order-operations\/lab-services\?/)
  await openSidebarIfCollapsed(page, 'Order operations')
  await expect(page.getByRole('button', { name: /^Order intake/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByText('LAB SERVICES', { exact: true })).toBeVisible()
  await expect(page.getByText('PARTNER SERVICES', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Attention/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^PSeq kits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Data assembly/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Result release/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Finance/ })).toHaveCount(0)
  await closeSidebarIfExpanded(page, 'Order operations')
  await page.getByRole('button', { name: 'New Order', exact: true }).click()
  await expect(page).toHaveURL(/\/lab-services\/orders\/new/)
  await expect(page.getByText('Draft entry unavailable')).toBeVisible()
  await expect(page.getByText('A real Phaeno session with Commercial Operator access is required.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save draft' })).toHaveCount(0)
  await page.goto('/order-operations')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect
    .poll(() => page.locator('body').evaluate((body) => getComputedStyle(body).overflow))
    .not.toBe('hidden')

  await page.goto('/lab-operations')
  await expect(page.getByRole('heading', { name: 'Lab operations', level: 1 })).toBeVisible()
  await openSidebarIfCollapsed(page, 'Lab operations')
  await expect(page.getByRole('button', { name: /^Jobs/ })).toHaveAttribute('aria-current', 'page')
  for (const group of ['SAMPLE PROCESSING', 'RESULTS', 'LAB PREPARATIONS', 'KITS & FULFILLMENT']) {
    await expect(page.getByText(group, { exact: true })).toBeVisible()
  }
  await expect(page.getByRole('button', { name: /^PSeq kit fulfillment/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Data assembly/ })).toBeVisible()
  await page.getByRole('button', { name: /^Transportation kit requests/ }).click()
  await expect(page.getByRole('heading', { name: 'Transportation kit requests' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Kit requests' })).toHaveCount(0)
  await page.getByRole('radio', { name: 'Fulfilled requests' }).click()
  await expect(page).toHaveURL(/section=kit-requests/)
  await page.goto('/lab-operations?section=receipt&receiptTab=kit-requests&requestSearch=JOB-1')
  await expect(page).toHaveURL(/section=kit-requests/)
  await expect(page).toHaveURL(/requestSearch=JOB-1/)
  await openSidebarIfCollapsed(page, 'Lab operations')
  await expect(page.getByRole('button', { name: /^Transportation kit requests/ })).toHaveAttribute('aria-current', 'page')
  await page.getByRole('button', { name: /^Sample receipt & accession/ }).click()
  await expect(page.getByRole('tab', { name: 'Receive shipments' })).toHaveAttribute('aria-selected', 'true')
  await expect(page.getByRole('tab', { name: 'Accession samples' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Kit requests' })).toHaveCount(0)

  await page.goto('/order-configuration')
  await expect(page.getByRole('heading', { name: 'Order settings' })).toBeVisible()
  await expect(page.getByText('Connected configuration is paused in mock-session mode')).toBeVisible()
  await openSidebarIfCollapsed(page, 'Order Settings')
  await expect(page.getByRole('button', { name: /^Quote & workflow/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: /^Analyses/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^PSeq kits/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Assembly/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Legacy links/ })).toBeVisible()
})

test('grouped service queues and moved result bookmarks use their owning routes', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/order-operations')
  await expect(page).toHaveURL(/\/order-operations\/lab-services\?/)
  await openSidebarIfCollapsed(page, 'Order operations')
  await page.getByRole('button', { name: /^PSeq kits/ }).click()
  await expect(page).toHaveURL(/\/order-operations\/partner-services\?section=kits/)
  await openSidebarIfCollapsed(page, 'Order operations')
  await page.getByRole('button', { name: /^Data assembly/ }).click()
  await expect(page).toHaveURL(/\/order-operations\/partner-services\?section=assembly/)
  await page.goto('/order-operations?intakePage=1&queuePage=1&orderSection=results')
  await expect(page).toHaveURL(/\/lab-operations\/result-release/)
  await expect(page.getByRole('heading', { name: 'Result release', level: 1 })).toBeVisible()
})

test('Finance uses sidebar sections and retains Customer search when switching pages', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/finance')
  await expect(page.getByRole('heading', { name: 'Finance', level: 1 })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Finance sections' })).toHaveCount(0)
  // Wait for an interactive route transition before typing into the server-rendered form.
  await openSidebarIfCollapsed(page, 'Finance')
  await page.getByRole('navigation', { name: 'Finance sections' }).getByRole('button', { name: /^Receipts/ }).click()
  await expect.poll(() => new URL(page.url()).searchParams.get('financeSection')).toBe('receipts')
  await page.getByRole('textbox', { name: 'Search customers', exact: true }).fill('Atlas')
  await expect.poll(() => new URL(page.url()).searchParams.get('financeSearch')).toBe('Atlas')
  for (const [label, section] of [
    ['Receipts', 'receipts'], ['Customer billing', 'customers'], ['Import receipts', 'imports'],
    ['Reconciliation', 'reconciliation'], ['Invoices and aging', 'invoices'],
  ]) {
    await openSidebarIfCollapsed(page, 'Finance')
    await page.getByRole('navigation', { name: 'Finance sections' }).getByRole('button', { name: new RegExp(`^${label}`) }).click()
    await expect.poll(() => new URL(page.url()).searchParams.get('financeSection')).toBe(section)
    await expect.poll(() => new URL(page.url()).searchParams.get('financeSearch')).toBe('Atlas')
  }
  await expect(page.getByRole('textbox', { name: 'Search customers', exact: true })).toHaveValue('Atlas')
})

test('Trial configuration bookmarks open the Order settings section', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/order-operations/lab-services/trials/configuration')
  await expect(page).toHaveURL(/\/order-configuration\?configurationSection=trials/)
  await expect(page.getByRole('heading', { name: 'Order Settings', level: 1 })).toBeVisible()
  await openSidebarIfCollapsed(page, 'Order Settings')
  await expect(page.getByRole('button', { name: /^Trial configuration/ })).toHaveAttribute('aria-current', 'page')
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
