import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import version from '../src/features/documentation/documentation-version.json' with { type: 'json' }
import corpus from '../../backend/app/Documentation/corpus.json' with { type: 'json' }

const guide = corpus.guides.find(guide => guide.id === 'customer/en-US/sample-shipping')!
const section = guide.sections.find(section => section.anchor && section.text)!
const result = {
  items: [{ id: guide.id, slug: guide.slug, route: guide.route, title: guide.title, heading: section.heading, anchor: section.anchor,
    excerpt: [{ text: 'Prepare ', match: false }, { text: 'samples', match: true }, { text: ' <script> safely.', match: false }],
    contentType: 'Guide', topics: ['Sample shipping'], workflows: ['Lab services'], reviewedAt: guide.reviewedAt }],
  metadata: { corpusHash: version.corpusHash, total: 1, page: 1, pageSize: 10,
    topics: [{ id: 'shipping', label: 'Sample shipping', count: 1 }], workflows: [{ id: 'lab-services', label: 'Lab services', count: 1 }], contentTypes: [{ id: 'guide', label: 'Guide', count: 1 }] },
}

async function prepare(page: Page) {
  await page.addInitScript(() => localStorage.setItem('phaeno.selectedOrganizationId', 'northline-labs'))
}

test('search stays focused, uses only documentation API, links to a section, and restores results', async ({ page }, testInfo) => {
  await prepare(page)
  if (testInfo.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const requests: string[] = []
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()) })
  await page.route('**/api/documentation/search?*', async route => {
    expect(route.request().headers()['x-organization-id']).toBe('northline-labs')
    const url = new URL(route.request().url())
    expect(url.searchParams.get('corpusVersion')).toBe(version.corpusHash)
    expect(url.searchParams.has('audience')).toBe(false)
    await route.fulfill({ json: { success: true, data: result, error: null, meta: {} } })
  })
  await page.goto('/docs')
  const input = page.getByRole('searchbox', { name: 'Search documentation' })
  await input.fill('samples')
  await expect(page.getByRole('heading', { name: 'Documentation search', exact: true })).toBeVisible()
  await expect(input).toBeFocused()
  await expect(page.getByRole('status').filter({ hasText: '1 guide found' })).toBeVisible()
  await page.getByRole('button', { name: 'Filters', exact: true }).click()
  await page.getByLabel('Topic', { exact: true }).selectOption('shipping')
  await expect(page).toHaveURL(/topic=shipping/)
  await expect(page.getByText('Prepare samples <script> safely.', { exact: true })).toBeVisible()
  expect(await page.locator('main script').count()).toBe(0)
  await expect(page.locator('vite-error-overlay')).toHaveCount(0)
  expect((await new AxeBuilder({ page }).include('main').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('documentation-search.png'), fullPage: true })
  await page.getByRole('heading', { name: guide.title }).getByRole('link').click()
  await expect(page).toHaveURL(new RegExp(`#${section.anchor}$`))
  await expect(page.locator(`[id="${section.anchor}"]`)).toBeVisible()
  await page.goBack()
  await expect(input).toHaveValue('samples')
  await expect(page.getByLabel('Topic', { exact: true })).toHaveValue('shipping')
  expect(requests.filter(url => url.includes('web-ops'))).toEqual([])
  expect(errors).toEqual([])
})

test('topic browsing uses metadata and search outages remain distinct from no results', async ({ page }) => {
  await prepare(page)
  let status = 503
  await page.route('**/api/documentation/search?*', route => route.fulfill({ status, json: status === 200
    ? { success: true, data: { items: [], metadata: { ...result.metadata, total: 0, topics: [], workflows: [], contentTypes: [] } } }
    : { success: false, error: { code: 'documentation_search_unavailable' } } }))
  await page.goto('/docs')
  await page.getByRole('region', { name: 'Browse by topic' }).getByRole('link', { name: 'Sample shipping' }).click()
  await expect(page.getByText(/Documentation search is temporarily unavailable/)).toBeVisible()
  await expect(page.getByText(/No guides matched/)).toHaveCount(0)
  status = 200
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByText(/No guides matched/)).toBeVisible()
  await page.getByRole('link', { name: 'Browse all guides' }).click()
  await expect(page.getByRole('heading', { name: 'Customer documentation' })).toBeVisible()
})

test('stale corpus offers refresh and one-character input does not query', async ({ page }) => {
  await prepare(page)
  let count = 0
  await page.route('**/api/documentation/search?*', route => {
    count++
    return route.fulfill({ status: 409, json: { success: false, error: { code: 'documentation_corpus_changed' } } })
  })
  await page.goto('/docs/search?q=x')
  await expect(page.getByText('Enter a task or keyword, or select a topic or workflow.')).toBeVisible()
  expect(count).toBe(0)
  await page.getByRole('searchbox').fill('shipping')
  await expect(page.getByRole('button', { name: 'Refresh page' })).toBeVisible()
  await expect(page.getByText(/Documentation has been updated/)).toBeVisible()
})
