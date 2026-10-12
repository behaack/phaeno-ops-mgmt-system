import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

test('Customer guide bodies load only when opened and keep navigation accessible', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.addInitScript(() => localStorage.setItem('phaeno.selectedOrganizationId', 'northline-labs'))
  const bodies: string[] = []
  page.on('request', request => { if (/\/content\/docs\/.*\.mdx/.test(request.url())) bodies.push(request.url()) })
  await page.goto('/docs')
  await expect(page.getByRole('heading', { name: 'Customer documentation' })).toBeVisible()
  await page.waitForLoadState('networkidle')
  expect(bodies).toEqual([])
  await page.getByRole('region', { name: 'Guides' }).getByRole('link', { name: /^Prepare and ship samples/ }).click()
  await expect(page.getByRole('heading', { name: 'Prepare and ship samples', exact: true })).toBeVisible()
  expect(bodies.some(url => url.includes('/customer/sample-shipping.mdx'))).toBe(true)
  expect(bodies.every(url => url.includes('/customer/'))).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('a failed Customer guide keeps navigation and can be reloaded', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('phaeno.selectedOrganizationId', 'northline-labs'))
  await page.goto('/docs')
  await page.waitForLoadState('networkidle')
  const guideModule = '**/content/docs/en-US/customer/sample-shipping.mdx*'
  await page.route(guideModule, route => route.abort())
  await page.getByRole('region', { name: 'Guides' }).getByRole('link', { name: /^Prepare and ship samples/ }).click()
  await expect(page.getByRole('button', { name: 'Reload guide' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Prepare and ship samples', exact: true })).toBeVisible()
  await page.unroute(guideModule)
  await page.getByRole('button', { name: 'Reload guide' }).click()
  await expect(page.getByRole('heading', { name: 'Four-stage preparation for a newly confirmed order' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reload guide' })).toHaveCount(0)
})
