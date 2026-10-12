import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function fixture(page: import('@playwright/test').Page) {
  page.on('pageerror', error => { throw new Error(`Work fixture runtime error: ${error.message}`) })
  page.on('requestfailed', request => console.error('Work fixture request failed', request.url(), request.failure()?.errorText))
  let completed = false, unavailable = false
  const html = await readFile(new URL('./fixtures/work-attention.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/work-attention.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\/work-attention(?:\?.*)?$/, route => {
    if (unavailable) return route.fulfill({ status: 503, json: { success: false, error: { code: 'service_unavailable' } } })
    const params = new URL(route.request().url()).searchParams
    const other = route.request().headers()['x-organization-id'] === 'organization-b'
    const pageNumber = Number(params.get('page') ?? 1), size = Number(params.get('pageSize') ?? 10)
    const actionCount = other ? 0 : completed ? 124 : 125
    const customer = new URL(page.url()).searchParams.get('customer') === 'true'
    const items = Array.from({ length: actionCount }, (_, index) => ({ key: `task-${index}`, sourceId: `task-${index}`, targetId: null, sourceType: 'CrmTask', domain: 'crm', messageKey: 'crm.task', recordLabel: `TASK-${index + 1}`,
      destination: '/crm/tasks?taskId=', kind: 'action', ownerUserId: 'staff-user', dueAtUtc: null, createdAtUtc: '2026-10-11T10:00:00Z', priority: 3 }))
      .map(item => customer ? { ...item, recordLabel: `RNA-ATCG-${item.sourceId}`, sourceType: 'LabServiceOrder', domain: 'commercial', messageKey: 'orders.quote', destination: '/lab-services/' } : item)
    return route.fulfill({ json: { success: true, data: { items: items.slice((pageNumber - 1) * size, pageNumber * size), totalCount: actionCount, actionCount, waitingCount: 0, updateCount: 0, page: pageNumber, pageSize: size, evaluatedAtUtc: '2026-10-11T10:00:00Z', disabledSources: [] } } })
  })
  await page.route('**/api/fixture/complete', route => { completed = true; return route.fulfill({ json: { success: true, data: {} } }) })
  return { fail: () => { unavailable = true }, recover: () => { unavailable = false } }
}

test('work counts, exact links, completion refresh and scope switching', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await fixture(page)
  await page.goto('/e2e/fixtures/work-attention.html')
  const bell = page.getByRole('button', { name: 'Notifications, 125 items need attention' })
  await expect(bell).toBeVisible()
  await bell.click()
  const dialog = page.getByRole('dialog', { name: 'Notifications' })
  await expect(dialog.getByRole('link', { name: 'Complete the linked CRM task' })).toHaveCount(5)
  await expect(dialog.getByRole('link').first()).toHaveAttribute('href', '/crm/tasks?taskId=task-0')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(bell).toBeFocused()
  await expect(bell).toBeVisible()
  await page.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(page.getByText('TASK-11', { exact: true })).toBeVisible()
  await page.getByRole('link', { name: 'Complete the linked CRM task' }).first().click()
  await expect(page.getByRole('heading', { name: 'Exact CRM task' })).toBeVisible()
  await page.getByRole('button', { name: 'Complete fixture task' }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 124 items need attention' })).toBeVisible()
  await page.getByRole('link', { name: 'Return to work' }).click()
  await page.getByRole('button', { name: 'Switch fixture organization' }).click()
  await expect(page.getByText('TASK-1', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Notifications, 0 items need attention' })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('pseudolocale applies only to Customer work and preserves source identifiers', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await fixture(page)
  await page.goto('/e2e/fixtures/work-attention.html?customer=true&pseudo=true')
  await expect(page.getByRole('heading', { name: /\[My wørk/ })).toBeVisible()
  await expect(page.getByText('RNA-ATCG-task-0', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /125 ïtëms nëëd áttëntïøn/ })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.goto('/e2e/fixtures/work-attention.html?pseudo=true')
  await expect(page.getByRole('heading', { name: 'My work', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Notifications, 125 items need attention' })).toBeVisible()
})

test('discard keeps safe focus and work failures recover with unknown counts', async ({ page }) => {
  const state = await fixture(page)
  await page.goto('/e2e/fixtures/work-attention.html')
  await expect(page.getByRole('button', { name: 'Notifications, 125 items need attention' })).toBeVisible()
  await page.getByRole('button', { name: 'Open draft example' }).click()
  await page.getByLabel('Draft note').fill('Keep RNA-ATCG-17')
  await page.getByRole('button', { name: 'Cancel example' }).click()
  const discard = page.getByRole('dialog', { name: 'Discard unsaved changes?' })
  await expect(discard.getByRole('button', { name: 'Keep editing' })).toBeFocused()
  await expect(discard.locator('[data-slot="dialog-body"]')).toContainText('Draft example')
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.keyboard.press('Escape')
  await expect(discard).toHaveCount(0)
  await expect(page.getByLabel('Draft note')).toHaveValue('Keep RNA-ATCG-17')
  await expect(page.getByRole('button', { name: 'Cancel example' })).toBeFocused()
  await page.getByRole('button', { name: 'Cancel example' }).click()
  await discard.getByRole('button', { name: 'Discard changes' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  state.fail()
  await page.getByRole('button', { name: 'Switch fixture organization' }).click()
  await expect(page.getByRole('button', { name: 'Notifications, Work count unavailable' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Current work is unavailable')
  state.recover()
  await page.getByRole('button', { name: 'Retry work' }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 0 items need attention' })).toBeVisible()
})

test('an out-of-range work page does not imply there are no outstanding actions', async ({ page }) => {
  await fixture(page)
  await page.goto('/e2e/fixtures/work-attention.html?workPage=99')
  await expect(page.getByText('This page has no work items. Choose an earlier page.', { exact: true })).toBeVisible()
  await expect(page.getByText('No outstanding actions in this view.', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'First page', exact: true }).click()
  await expect(page.getByText('TASK-1', { exact: true })).toBeVisible()
})

test('work summary failure remains recoverable when a filtered list succeeds', async ({ page }) => {
  await fixture(page)
  let summaryUnavailable = true
  await page.route('**/api/work-attention?*', route => {
    if (summaryUnavailable && !new URL(route.request().url()).searchParams.get('domain'))
      return route.fulfill({ status: 503, json: { success: false, error: { code: 'service_unavailable' } } })
    return route.fallback()
  })
  await page.goto('/e2e/fixtures/work-attention.html')
  await expect(page.getByRole('alert')).toContainText('Current work is unavailable')
  await page.getByRole('combobox', { name: 'Work area', exact: true }).selectOption('crm')
  await expect(page.getByText('TASK-1', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('Work counts are unavailable')
  await expect(page.getByRole('button', { name: 'Notifications, Work count unavailable' })).toBeVisible()
  summaryUnavailable = false
  await page.getByRole('button', { name: 'Retry work', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Notifications, 125 items need attention' })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
