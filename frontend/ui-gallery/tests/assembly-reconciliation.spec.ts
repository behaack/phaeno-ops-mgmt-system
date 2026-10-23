import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

for (const state of ['save-error', 'pending']) test(`actual assembly reconciliation preserves review during ${state}`, async ({ page }) => {
  const escaped: string[] = []
  page.on('request', request => { if (['xhr', 'fetch'].includes(request.resourceType()) && new URL(request.url()).pathname.startsWith('/api/')) escaped.push(request.url()) })
  await page.goto(`/features.html?scene=assembly-reconciliation&state=${state}`)
  const trigger = page.getByRole('button', { name: 'Reconcile for repeat', exact: true })
  await trigger.focus(); await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await expect(dialog.locator('[data-slot=dialog-body]')).toContainText('original execution times')
  await expect(dialog.locator('[data-slot=dialog-footer]')).toContainText('Required')
  await expect(dialog.getByText('demo-original-failure-event', { exact: true })).toBeVisible()
  expect(await dialog.evaluate(node => node.scrollWidth <= node.clientWidth)).toBe(true)
  await dialog.getByRole('textbox', { name: 'Decision reason' }).fill('Retain the saved failed outcome.')
  await dialog.getByRole('textbox', { name: 'Independent verification evidence' }).fill('The provider operator verified that the original execution stopped and cannot resume.')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Record reconciliation', exact: true }).click()
  await expect(dialog.getByRole('textbox', { name: 'Decision reason' })).toHaveValue('Retain the saved failed outcome.')
  if (state === 'pending') {
    await expect(dialog.getByRole('button', { name: 'Recording…' })).toBeDisabled()
    await page.keyboard.press('Escape'); await expect(dialog).toBeVisible()
    await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  } else {
    await expect(dialog.getByRole('alert')).toContainText('demonstration service')
    const accessibility = await new AxeBuilder({ page }).include('[data-slot=dialog-content]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
    expect(accessibility.violations).toEqual([])
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    const discard = page.getByRole('dialog', { name: /Discard/ })
    await expect(discard).toBeVisible()
    await discard.getByRole('button', { name: /Discard/ }).click()
    await expect(dialog).not.toBeVisible()
    await expect(trigger).toBeFocused()
  }
  expect(escaped).toEqual([])
})
