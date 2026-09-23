import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'

test('Customer metrics and selected Jobs share one scoped dashboard response', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/customer-dashboard.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/customer-dashboard.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  const views: string[] = []
  let legacyRequests = 0
  page.on('request', request => {
    if (request.url().includes('/lab-service-orders/dashboard-summary') || /\/lab-service-orders\?/.test(request.url())) legacyRequests++
  })
  await page.route('**/api/lab-service-orders/dashboard?*', route => {
    const url = new URL(route.request().url())
    expect(route.request().headers()['x-organization-id']).toBe('customer')
    expect(route.request().headers()['x-department-id']).toBe('general')
    const view = url.searchParams.get('dashboardView') ?? 'active'
    views.push(view)
    const order = { id: view === 'results' ? 'finished' : 'active', number: 'LAB-101', reference: view === 'results' ? 'Completed research' : 'Current research',
      status: view === 'results' ? 'Completed' : 'QuoteIssued', organizationId: 'customer', version: 1,
      createdAt: '2026-09-23T10:00:00Z', updatedAt: '2026-09-23T10:00:00Z', tenantSafeReason: null }
    return route.fulfill({ json: { success: true, data: { summary: { attentionCount: 1, newResultCount: 1 },
      requests: { items: [order], page: 1, pageSize: 10, totalCount: 1 } } } })
  })
  await page.goto('/e2e/fixtures/customer-dashboard.html')
  await expect(page.getByRole('link', { name: 'View pricing for Current research' })).toBeVisible()
  await expect(page.getByRole('button', { name: '1 new result' })).toBeVisible()
  expect(views).toEqual(['active'])
  await page.getByRole('button', { name: '1 new result' }).click()
  await expect(page.getByRole('link', { name: 'View results for Completed research' })).toBeVisible()
  expect(views).toEqual(['active', 'results'])
  expect(legacyRequests).toBe(0)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
