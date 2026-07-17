import { expect, test } from '@playwright/test'

test('shows Customer guide navigation and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Customer documentation' }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Guides' }).getByRole('link', {
      name: 'Request laboratory services',
    }),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Documentation audience' })).toHaveCount(0)

  await page.goto('/docs/partner/getting-started')
  await expect(
    page.getByRole('heading', { name: 'Documentation unavailable' }),
  ).toBeVisible()
})

test('shows Partner guides and renders MDX content', async ({ page }) => {
  await selectOrganization(page, 'genome-partner')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Partner documentation' }),
  ).toBeVisible()
  await page.getByRole('region', { name: 'Guides' }).getByRole('link', {
    name: 'Request data assembly',
  }).click()
  await expect(
    page.getByRole('heading', { name: 'Request data assembly', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Accept the job quote')).toBeVisible()
})

test('shows only Phaeno guides in expandable topic groups', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Phaeno documentation' }),
  ).toBeVisible()
  await openSidebarIfCollapsed(page)
  await expect(
    page.getByRole('navigation', { name: 'Documentation audience' }),
  ).toHaveCount(0)

  const guideNavigation = page.getByRole('navigation', { name: 'Guides' })
  await expect(
    guideNavigation.getByRole('button', {
      name: 'Expand Data provisioning topics',
    }),
  ).toBeVisible()
  await expect(
    guideNavigation.getByRole('button', {
      name: 'Expand Order operations topics',
    }),
  ).toBeVisible()
  await expect(
    guideNavigation.getByRole('button', {
      name: 'Expand Laboratory operations topics',
    }),
  ).toBeVisible()

  await guideNavigation.getByRole('button', {
    name: 'Expand Data provisioning topics',
  }).click()
  const dataTopics = page.locator(
    '#documentation-topics-data-provisioning-and-accounts',
  )
  await expect(dataTopics.getByRole('link')).toHaveCount(5)

  await guideNavigation.getByRole('button', {
    name: 'Expand Order operations topics',
  }).click()
  await expect(dataTopics).toHaveCount(0)
  const orderTopics = page.locator('#documentation-topics-order-operations')
  await expect(orderTopics.getByRole('link')).toHaveCount(7)
  await expect(orderTopics.locator('a > svg')).toHaveCount(7)
  await orderTopics.getByRole('link', {
    name: 'Billing, payment, and release gates',
  }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Billing, payment, and release gates',
      level: 1,
    }),
  ).toBeVisible()
  await openSidebarIfCollapsed(page)
  await expect(
    page.getByRole('button', {
      name: 'Collapse Order operations topics',
    }),
  ).toBeVisible()

  await page.goto('/docs/customer/getting-started')
  await expect(
    page.getByRole('heading', { name: 'Documentation unavailable' }),
  ).toBeVisible()
})

test('shows Prospect guides and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Prospect documentation' }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Guides' }).getByRole('link', {
      name: 'Use the Data Library',
    }),
  ).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Documentation audience' })).toHaveCount(0)

  await page.goto('/docs/customer/getting-started')
  await expect(
    page.getByRole('heading', { name: 'Documentation unavailable' }),
  ).toBeVisible()
})

async function selectOrganization(
  page: import('@playwright/test').Page,
  organizationId: string,
) {
  await page.addInitScript((selectedOrganizationId) => {
    window.localStorage.setItem(
      'phaeno.selectedOrganizationId',
      selectedOrganizationId,
    )
  }, organizationId)
}

async function openSidebarIfCollapsed(page: import('@playwright/test').Page) {
  const trigger = page.getByRole('button', {
    name: /^Open Documentation navigation/,
  })
  if (await trigger.isVisible()) await trigger.click()
}
