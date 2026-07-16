import { expect, test } from '@playwright/test'

test('shows Customer guide navigation and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Customer documentation' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Request laboratory services' })).toBeVisible()
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
  await page.getByRole('link', { name: 'Request data assembly' }).click()
  await expect(
    page.getByRole('heading', { name: 'Request data assembly', level: 1 }),
  ).toBeVisible()
  await expect(page.getByText('Accept the job quote')).toBeVisible()
})

test('lets Phaeno support switch among all audience guides', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Phaeno documentation' }),
  ).toBeVisible()
  const audienceNavigation = page.getByRole('navigation', {
    name: 'Documentation audience',
  })
  await expect(audienceNavigation.getByRole('link', { name: 'Prospect' })).toBeVisible()
  await expect(audienceNavigation.getByRole('link', { name: 'Customer' })).toBeVisible()
  await expect(audienceNavigation.getByRole('link', { name: 'Partner' })).toBeVisible()
  await expect(audienceNavigation.getByRole('link', { name: 'Phaeno' })).toBeVisible()

  await audienceNavigation.getByRole('link', { name: 'Customer' }).click()
  await expect(page).toHaveURL(/\/docs\/customer\/getting-started$/)
  await expect(
    page.getByRole('heading', { name: 'Getting started', level: 1 }),
  ).toBeVisible()
})

test('shows Prospect guides and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b')
  await page.goto('/docs')

  await expect(
    page.getByRole('heading', { name: 'Prospect documentation' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Use the Data Library' })).toBeVisible()
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
