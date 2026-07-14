import { expect, test } from '@playwright/test'

test('shows the Phaeno data-provisioning workspace', async ({ page }) => {
  await page.goto('/data-provisioning')

  await expect(
    page.getByRole('heading', { name: 'Data provisioning' }),
  ).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Source registry' })).toBeVisible()
  await expect(page.getByRole('tab', { name: 'Curated catalog' })).toBeVisible()
  await expect(
    page.getByRole('tab', { name: 'Organization grants' }),
  ).toBeVisible()
})

test('shows the Data Library in a Prospect organization context', async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'phaeno.selectedOrganizationId',
      '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b',
    )
  })

  await page.goto('/data-library')

  await expect(page.getByRole('heading', { name: 'Data Library' })).toBeVisible()
  await expect(
    page.getByText('Connected data is paused in mock-session mode'),
  ).toBeVisible()
})
