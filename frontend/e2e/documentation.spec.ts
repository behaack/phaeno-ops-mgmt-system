import { expect, test } from '@playwright/test'

test('keeps Documentation navigation below the external organization header after resizing', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/docs')
  await expect(page.getByRole('heading', { name: 'Customer documentation' })).toBeVisible()
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 })
    const trigger = page.getByRole('button', { name: /^Open Documentation navigation/ })
    const header = page.locator('[data-portal-header]')
    await expect.poll(async () => (await trigger.boundingBox())!.y - (await header.boundingBox())!.height).toBeGreaterThanOrEqual(0)
    await trigger.click()
    const sidebar = page.getByRole('complementary', { name: 'Documentation sidebar' })
    await expect(sidebar).toBeVisible()
    expect((await sidebar.boundingBox())!.y).toBeGreaterThanOrEqual((await header.boundingBox())!.height)
    await page.keyboard.press('Escape')
    await expect(trigger).toBeFocused()
  }
})

test('shows Customer guide navigation and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, 'northline-labs')
  await openDocumentationFromUserMenu(page)

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
  await openDocumentationFromUserMenu(page)

  await expect(
    page.getByRole('heading', { name: 'Partner documentation' }),
  ).toBeVisible()
  await page.getByRole('region', { name: 'Guides' }).getByRole('link', {
    name: 'Prepare included Assembly',
  }).click()
  await expect(
    page.getByRole('heading', { name: 'Included assembly inputs and outputs', level: 1 }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Prepare an included case' })).toBeVisible()
})

test('shows only Phaeno guides in expandable topic groups', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await openDocumentationFromUserMenu(page)

  await expect(
    page.getByRole('heading', { name: 'Phaeno documentation' }),
  ).toBeVisible()
  await openSidebarIfCollapsed(page)
  await expect(
    page.getByRole('navigation', { name: 'Documentation audience' }),
  ).toHaveCount(0)

  const guideNavigation = page.getByRole('navigation', { name: 'Guides' })
  const topLevelItems = guideNavigation.locator(':scope > ul > li')
  await expect(topLevelItems.nth(0)).toContainText('Phaeno operations guide')
  await expect(topLevelItems.nth(1)).toContainText('POMS user administration')
  await expect(topLevelItems.nth(2)).toContainText('CRM')
  await expect(page.getByRole('region', { name: 'How-to guides' }).getByRole('link')).toHaveCount(5)
  await expect(page.getByRole('region', { name: 'How-to guides' }).getByRole('link', { name: /How to onboard a Customer/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'How-to guides' }).getByRole('link', { name: /How to record an R&D experiment/ })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Guides' }).getByRole('link', { name: 'Trial Projects', exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Browse by topic' }).getByRole('link', { name: 'Trial Projects', exact: true })).toHaveCount(0)
  await expect(
    guideNavigation.getByRole('button', {
      name: 'Expand CRM topics',
    }),
  ).toBeVisible()
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
    name: 'Expand CRM topics',
  }).click()
  const crmTopics = page.locator('#documentation-topics-crm')
  await expect(crmTopics.getByRole('link')).toHaveCount(9)
  await expect(crmTopics.locator('a > svg')).toHaveCount(9)
  await crmTopics.getByRole('link', {
    name: 'Reports and administration',
  }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Reports and administration',
      level: 1,
    }),
  ).toBeVisible()
  await openSidebarIfCollapsed(page)
  await expect(
    page.getByRole('button', {
      name: 'Collapse CRM topics',
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
  await expect(orderTopics.getByRole('link')).toHaveCount(8)
  await expect(orderTopics.locator('a > svg')).toHaveCount(8)
  await expect(orderTopics.getByRole('link', { name: 'Trial Projects', exact: true })).toBeVisible()
  await orderTopics.getByRole('link', {
    name: 'PSeq billing, cash, and result release',
  }).click()
  await expect(
    page.getByRole('heading', {
      name: 'PSeq billing, cash, and result release',
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

test('renders an illustrated Phaeno task guide with written callout explanations', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/docs/phaeno/how-to-place-customer-order')
  await expect(page.getByRole('heading', { name: 'How to place a Customer order', exact: true })).toBeVisible()
  const screenshot = page.getByRole('img', { name: /Empty New Customer order form/ })
  await screenshot.scrollIntoViewIfNeeded()
  await expect(screenshot).toBeVisible()
  await expect.poll(() => screenshot.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(screenshot.locator('..').locator('[aria-hidden="true"]')).toHaveCount(5)
  await expect(page.getByText('Illustrative empty form; no Customer has been selected.', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '3. Save, then submit for pricing' })).toBeVisible()
})

test('shows Prospect guides and denies a cross-audience route', async ({ page }) => {
  await selectOrganization(page, '7dbd474b-c73f-4df4-a9c9-9f1a72b5341b')
  await openDocumentationFromUserMenu(page)

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

async function openDocumentationFromUserMenu(page: import('@playwright/test').Page) {
  if (test.info().project.name === 'mobile-chrome') {
    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  }
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await expect(page.locator('header').getByRole('link', {
    name: /^(Docs|Documentation)$/,
  })).toHaveCount(0)
  const trigger = page.getByRole('button', { name: 'Open user menu' })
  await trigger.focus()
  await trigger.press('Enter')
  const mobile = test.info().project.name === 'mobile-chrome'
  const navigationSurface = mobile ? page.getByRole('dialog', { name: 'Menu', exact: true }) : page.getByRole('menu')
  await expect(navigationSurface).toBeVisible()
  const documentation = page.getByRole(mobile ? 'link' : 'menuitem', {
    name: 'Documentation', exact: true,
  })
  await expect(documentation).toHaveCount(1)
  await expect(documentation).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('documentation-menu.png') })
  await documentation.focus()
  await documentation.press('Enter')
  await expect(navigationSurface).toHaveCount(0)
}

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
    name: /^(?:Open|Close) Documentation navigation/,
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


test('renders the R&D walkthrough and its annotated original captures', async ({ page }) => {
  await selectOrganization(page, 'phaeno')
  await page.goto('/docs/phaeno/how-to-record-research')
  await expect(page.getByRole('heading', { name: 'How to record an R&D experiment', exact: true })).toBeVisible()
  await expect(page.locator('img[src*="research-20261017/"]')).toHaveCount(14)
  const first = page.getByRole('img', { name: /R&D Projects showing/ })
  await first.scrollIntoViewIfNeeded()
  await expect.poll(() => first.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(first.locator('..').locator('[aria-hidden="true"]')).toHaveCount(4)
  await expect(page.getByRole('heading', { name: '11. Find earlier work' })).toBeVisible()
})
