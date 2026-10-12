import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test.beforeEach(async ({ page, isMobile }) => {
  if (isMobile) await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/scope-switch.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/scope-switch.html', route => route.fulfill({ contentType: 'text/html', body: html }))
})

async function switchScope(page: Page, isMobile: boolean, scope: 'organization' | 'department') {
  await page.getByRole('button', { name: 'Open user menu', exact: true }).click()
  if (scope === 'organization') await page.getByRole('combobox', { name: 'Organization', exact: true }).selectOption('customer')
  else if (isMobile) await page.getByRole('combobox', { name: 'Department', exact: true }).selectOption('research')
  else await page.getByRole('menuitemradio', { name: 'Research', exact: true }).click()
}

for (const scope of ['organization', 'department'] as const) {
  test(`${scope} switching on Dashboard keeps or discards the current draft explicitly`, async ({ page, isMobile }) => {
    await page.goto('/e2e/fixtures/scope-switch.html')
    await page.getByLabel('Unsaved note').fill('RETAIN MY SCIENTIFIC NOTE')
    await switchScope(page, isMobile, scope)
    const confirmation = page.getByRole('dialog', { name: 'Discard unsaved changes?' })
    await expect(confirmation).toBeVisible()
    await expect(confirmation.getByRole('button', { name: 'Keep editing' })).toBeFocused()
    expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    await confirmation.getByRole('button', { name: 'Keep editing' }).click()
    await expect(page.getByText('Scope: Phaeno / General', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Unsaved note')).toHaveValue('RETAIN MY SCIENTIFIC NOTE')
    await switchScope(page, isMobile, scope)
    await confirmation.getByRole('button', { name: 'Discard changes' }).click()
    await expect(page.getByText(scope === 'organization' ? 'Scope: My Customer / General' : 'Scope: Phaeno / Research', { exact: true })).toBeVisible()
    await expect(page.getByLabel('Unsaved note')).toHaveValue('')
  })

  test(`${scope} switching cannot discard a save in progress`, async ({ page, isMobile }) => {
    await page.goto('/e2e/fixtures/scope-switch.html')
    await page.getByRole('button', { name: 'Start fixture save' }).click()
    await switchScope(page, isMobile, scope)
    await expect(page.getByRole('button', { name: 'Open user menu', exact: true })).toBeFocused()
    await expect(page.getByText('Scope: Phaeno / General', { exact: true })).toBeVisible()
    await expect(page.getByRole('dialog')).toHaveCount(0)
    await page.getByRole('button', { name: 'Finish fixture save' }).click()
    await switchScope(page, isMobile, scope)
    await expect(page.getByText(scope === 'organization' ? 'Scope: My Customer / General' : 'Scope: Phaeno / Research', { exact: true })).toBeVisible()
  })
}
