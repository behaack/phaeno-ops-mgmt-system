import { expect, test, type Page } from '@playwright/test'

test('uses POMS branding in the internal Phaeno context', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('POMS')
  await expect(
    page.getByRole('heading', {
      name: 'Phaeno Operations Management System',
    }),
  ).toBeVisible()
  await expect(page.getByText('Phaeno operations', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'POMS home' })).toBeVisible()
  let dashboardSelector = await openDashboardNavigation(page)
  const orderButton = dashboardSelector.getByRole('button', {
    name: /Order Operations/,
  })
  const labButton = dashboardSelector.getByRole('button', {
    name: /Lab Operations/,
  })
  await expect(orderButton).toHaveAttribute('aria-current', 'page')
  await expect(
    page.getByRole('heading', { name: 'Order Operations', level: 2 }),
  ).toBeVisible()
  await labButton.click()
  await expect(
    page.getByRole('heading', { name: 'Lab Operations', level: 2 }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Order Operations', level: 2 }),
  ).toHaveCount(0)

  dashboardSelector = await openDashboardNavigation(page)
  const accountsButton = dashboardSelector.getByRole('button', {
    name: /Accounts/,
  })
  await accountsButton.click()
  await expect(
    page.getByRole('heading', {
      name: 'Customer, Partner & Prospect Accounts',
      level: 2,
    }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview invite' })).toBeVisible()

  dashboardSelector = await openDashboardNavigation(page)
  await dashboardSelector.getByRole('button', {
    name: /Web Operations/,
  }).click()
  await expect(
    page.getByRole('heading', { name: 'Web Operations', level: 2 }),
  ).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Mailing List' }),
  ).toBeVisible()
  await expect(page.getByText('Morgan Lee')).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Demo Requests' }),
  ).not.toBeVisible()
  await page.getByRole('tab', { name: /Demo Requests/ }).click()
  await expect(
    page.getByRole('region', { name: 'Demo Requests' }),
  ).toBeVisible()
  await expect(page.getByText('Atlas Bioanalytics')).toBeVisible()
})

test('uses Portal branding in an external organization context', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'phaeno.selectedOrganizationId',
      'northline-labs',
    )
  })
  await page.goto('/')

  await expect(page).toHaveTitle('Portal')
  await expect(page.getByRole('heading', { name: 'Portal' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Portal home' })).toBeVisible()
  await expect(
    page.getByText(/Copyright © \d{4} Phaeno Inc\./),
  ).toBeVisible()
  await expect(
    page.getByText('Support and policy links coming soon.'),
  ).toBeVisible()
  await expect(
    page.getByText('TanStack Start, Query, Shadcn, Axios'),
  ).toHaveCount(0)
  await expect(page.getByRole('navigation', {
    name: 'POMS dashboard sections',
  })).toHaveCount(0)
  await expect(page.getByRole('button', {
    name: /Open POMS dashboard navigation/,
  })).toHaveCount(0)
})

test('keeps workspace navigation concise and groups the user menu', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  const header = page.getByRole('navigation')
  const isMobile = testInfo.project.name === 'mobile-chrome'

  if (isMobile) {
    await expect(header.getByRole('link', { name: 'Dashboard' })).toHaveCount(0)
  } else {
    await expect(header.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(
      header.getByRole('link', { name: 'Data provisioning' }),
    ).toHaveCount(0)
    await expect(
      header.getByRole('link', { name: 'Order ops' }),
    ).toBeVisible()
    await expect(header.getByRole('link', { name: 'Docs' })).toBeVisible()
    await expect(
      header.getByRole('link', { name: 'Accounts' }),
    ).toHaveCount(0)
    await expect(
      header.getByRole('link', { name: 'Order configuration' }),
    ).toHaveCount(0)
  }

  const userMenuTrigger = page.getByRole('button', { name: 'Open user menu' })
  await userMenuTrigger.focus()
  await userMenuTrigger.press('Enter')

  if (isMobile) {
    await expect(page.getByText('Workspace', { exact: true })).toBeVisible()
    await expect(page.getByRole('menuitem', { name: 'Docs' })).toBeVisible()
  }

  await expect(page.getByText('Administration', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Accounts' }),
  ).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Order configuration' }),
  ).toBeVisible()
  await expect(page.getByText('Resources', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Data provisioning' }),
  ).toBeVisible()
  if (!isMobile) {
    await expect(page.getByRole('menuitem', { name: 'Docs' })).toHaveCount(0)
  }

  const displayChoices = page.getByRole('menuitemradio')
  await expect(displayChoices).toHaveCount(3)
  await expect(
    page.getByText('Organization context', { exact: true }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('combobox', { name: 'Search organizations' }),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Return to Phaeno' }),
  ).toHaveCount(0)
  const selectedDisplayChoice = page.locator(
    '[role="menuitemradio"][data-state="checked"]',
  )
  await expect(selectedDisplayChoice).toHaveCount(1)
  await page.getByRole('menuitem', { name: 'Accounts' }).focus()
  const selectedDisplayBackground = await selectedDisplayChoice.evaluate(
    (choice) => getComputedStyle(choice).backgroundColor,
  )
  const selectedDisplayRestShadow = await selectedDisplayChoice.evaluate(
    (choice) => getComputedStyle(choice).boxShadow,
  )
  const activeNavigationItem = isMobile
    ? page.getByRole('menuitem', { name: 'Dashboard' })
    : page.locator('nav a').filter({ hasText: 'Dashboard' })
  const activeNavigationBackground = await activeNavigationItem.evaluate(
    (item) => getComputedStyle(item).backgroundColor,
  )
  expect(selectedDisplayBackground).not.toBe(activeNavigationBackground)
  if (!isMobile) {
    await page.screenshot({
      path: testInfo.outputPath('selected-display-rest-desktop.png'),
      fullPage: false,
    })
  }
  await selectedDisplayChoice.focus()
  await expect(selectedDisplayChoice).toBeFocused()
  await expect
    .poll(() =>
      selectedDisplayChoice.evaluate(
        (choice) => getComputedStyle(choice).backgroundColor,
      ),
    )
    .toBe(selectedDisplayBackground)
  await expect
    .poll(() =>
      selectedDisplayChoice.evaluate(
        (choice) => getComputedStyle(choice).boxShadow,
      ),
    )
    .not.toBe(selectedDisplayRestShadow)
  if (!isMobile) {
    await page.screenshot({
      path: testInfo.outputPath('selected-display-focus-desktop.png'),
      fullPage: false,
    })
  }
  const darkThemeChoice = page.getByRole('menuitemradio', {
    name: 'Use dark theme',
  })
  await darkThemeChoice.focus()
  await darkThemeChoice.press('ArrowDown')
  const nextMenuItemName = isMobile ? 'Dashboard' : 'Accounts'
  await expect(
    page.getByRole('menuitem', { name: nextMenuItemName }),
  ).toBeFocused()
  await page
    .getByRole('menuitem', { name: nextMenuItemName })
    .press('ArrowUp')
  await expect(darkThemeChoice).toBeFocused()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect
    .poll(() =>
      page.locator('body').evaluate((body) => getComputedStyle(body).overflow),
    )
    .toBe('hidden')
  const displayLabelBox = await page
    .getByText('Display', { exact: true })
    .boundingBox()
  const administrationLabelBox = await page
    .getByText('Administration', { exact: true })
    .boundingBox()
  expect(displayLabelBox?.y).toBeLessThan(administrationLabelBox?.y ?? 0)
  const displayChoiceBoxes = await displayChoices.evaluateAll((items) =>
    items.map((item) => item.getBoundingClientRect().toJSON()),
  )
  expect(new Set(displayChoiceBoxes.map((box) => Math.round(box.y))).size).toBe(1)

  if (!isMobile) {
    await page.screenshot({
      path: testInfo.outputPath('navigation-desktop.png'),
      fullPage: false,
    })
  }

  await darkThemeChoice.focus()
  await darkThemeChoice.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect
    .poll(() =>
      page.locator('body').evaluate((body) => getComputedStyle(body).overflow),
    )
    .not.toBe('hidden')
})

test('locks background scrolling while a modal is open', async ({ page }) => {
  await page.goto('/phaeno-users')
  await page.waitForLoadState('networkidle')

  await page.getByRole('button', { name: 'Add Phaeno user' }).click()
  await expect(
    page.getByRole('dialog', { name: 'Add Phaeno user' }),
  ).toBeVisible()
  await expect
    .poll(() =>
      page.locator('body').evaluate((body) => getComputedStyle(body).overflow),
    )
    .toBe('hidden')

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect
    .poll(() =>
      page.locator('body').evaluate((body) => getComputedStyle(body).overflow),
    )
    .not.toBe('hidden')
})

async function openDashboardNavigation(page: Page) {
  const navigation = page.getByRole('navigation', {
    name: 'POMS dashboard sections',
  })
  if (!(await navigation.isVisible())) {
    await page.getByRole('button', {
      name: /Open POMS dashboard navigation/,
    }).click()
  }
  await expect(navigation).toBeVisible()
  return navigation
}
