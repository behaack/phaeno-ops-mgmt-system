import { expect, test } from '@playwright/test'

test('shows the Phaeno data-provisioning workspace', async ({ page }) => {
  await page.goto('/data-provisioning')

  await expect(
    page.getByRole('heading', { name: 'Data provisioning' }),
  ).toBeVisible()
  await openSidebarIfCollapsed(page, 'Data provisioning')
  await expect(page.getByRole('button', { name: /^Source registry/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Curated catalog/ })).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^Organization grants/ }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: /^Governance/ })).toBeVisible()
})

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
