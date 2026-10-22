import { expect, type Page } from '@playwright/test'

export async function openTrialReview(page: Page) {
  const direct = page.getByRole('button', { name: 'Review and accept scope', exact: true })
  if (await direct.isVisible()) await direct.click()
  else {
    await page.getByRole('button', { name: 'Actions', exact: true }).click()
    await page.getByRole('menuitem', { name: 'Review and accept scope', exact: true }).click()
  }
  return page.getByRole('dialog', { name: 'Accept approved Trial scope', exact: true })
}

export async function prepareWorkflow(page: Page, prepare?: string) {
  if (!prepare) return
  const dialog = await openTrialReview(page)
  await expect(dialog).toBeVisible()
  if (prepare === 'trial-submit') {
    await dialog.getByRole('checkbox').check()
    await dialog.getByRole('button', { name: 'Accept Trial scope', exact: true }).click()
    await expect(dialog.getByRole('alert')).toContainText('The record changed')
    await dialog.getByRole('checkbox').scrollIntoViewIfNeeded()
  }
}
