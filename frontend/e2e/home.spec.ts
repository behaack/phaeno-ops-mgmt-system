import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function expectNoAccessibilityViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze()

  expect(results.violations).toEqual([])
}

test('loads the portal starter dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Phaeno Portal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Send invite' })).toBeVisible()
})

test('has no automated WCAG AA violations on the dashboard', async ({
  page,
}) => {
  await page.goto('/')

  await expectNoAccessibilityViolations(page)
})

test('moves primary navigation into the user menu on mobile', async ({
  page,
  isMobile,
}) => {
  test.skip(!isMobile, 'Mobile-only navigation behavior')

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Project' })).toBeHidden()

  await page.getByRole('button', { name: 'Open user menu' }).tap()
  await expect(page.getByRole('menuitem', { name: 'Project' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Query demo' })).toBeVisible()
  await expectNoAccessibilityViolations(page)
})
