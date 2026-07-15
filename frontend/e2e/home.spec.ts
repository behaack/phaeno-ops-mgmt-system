import { expect, test } from '@playwright/test'

test('loads the portal starter dashboard', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Phaeno Portal' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Preview invite' })).toBeVisible()
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
    ).toBeVisible()
    await expect(
      header.getByRole('link', { name: 'Order operations' }),
    ).toBeVisible()
    await expect(
      header.getByRole('link', { name: 'Organizations' }),
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
    await expect(
      page.getByRole('menuitem', { name: 'Data provisioning' }),
    ).toBeVisible()
  }

  await expect(page.getByText('Administration', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Organizations' }),
  ).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Order configuration' }),
  ).toBeVisible()
  await expect(page.getByText('Resources', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('menuitem', { name: 'Documentation' }),
  ).toBeVisible()

  const displayChoices = page.getByRole('menuitemradio')
  await expect(displayChoices).toHaveCount(3)
  const organizationSearch = page.getByRole('combobox', {
    name: 'Search organizations',
  })
  const organizationSearchLeftPadding = await organizationSearch.evaluate(
    (input) => Number.parseFloat(getComputedStyle(input).paddingLeft),
  )
  expect(organizationSearchLeftPadding).toBeGreaterThanOrEqual(8)
  const selectedDisplayChoice = page.locator(
    '[role="menuitemradio"][data-state="checked"]',
  )
  await expect(selectedDisplayChoice).toHaveCount(1)
  await organizationSearch.focus()
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
  await expect(organizationSearch).toBeFocused()
  await organizationSearch.press('ArrowDown')
  const nextMenuItemName = isMobile ? 'Dashboard' : 'Organizations'
  await expect(
    page.getByRole('menuitem', { name: nextMenuItemName }),
  ).toBeFocused()
  await page
    .getByRole('menuitem', { name: nextMenuItemName })
    .press('ArrowUp')
  await expect(organizationSearch).toBeFocused()

  await organizationSearch.fill('north')
  await expect(organizationSearch).toHaveAttribute('aria-expanded', 'true')
  await expect(page.getByRole('listbox')).toBeVisible()
  await organizationSearch.press('ArrowDown')
  await expect(organizationSearch).toHaveAttribute(
    'aria-activedescendant',
    /.+/,
  )
  await organizationSearch.press('Escape')
  await expect(organizationSearch).toHaveAttribute('aria-expanded', 'false')
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

  await organizationSearch.press('Escape')
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
