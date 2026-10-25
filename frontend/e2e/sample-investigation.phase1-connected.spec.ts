import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'

const host = process.env.PSEQ_PHASE1_TEST_API
test.skip(!host, 'Run through the isolated Phase 1 PostgreSQL/browser wrapper.')
test.setTimeout(120_000)
type Scene = { samples: { workId: string; specimenId: string; accession: string }[]; lotNumber: string; componentLotNumber: string }
const routing = new WeakMap<Page, { scene: Scene; sample: number; limited: boolean }>()
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }); routing.delete(page) })

async function mount(page: Page, scene: Scene, sample = 0, theme = 'light', limited = false, expectReady = true) {
  const installed = routing.has(page)
  routing.set(page, { scene, sample, limited })
  if (!installed) await page.route(url => url.pathname.startsWith('/api/'), async route => {
      const active = routing.get(page)!
      let path = new URL(route.request().url()).pathname + new URL(route.request().url()).search
      if (active.limited && path.endsWith('/investigation')) path = `/api/verification/phase1-limited/${active.scene.samples[active.sample].workId}/${active.scene.samples[active.sample].specimenId}`
      const response = await route.fetch({ url: `${host}${path}`, headers: { ...route.request().headers(), Authorization: 'Bearer phase1-staff' } })
      await route.fulfill({ response })
    })
  await page.goto(`/e2e/fixtures/sample-investigation.html?${new URLSearchParams({ work: scene.samples[sample].workId, specimen: scene.samples[sample].specimenId, theme })}`)
  await expect(page.getByRole('heading', { name: 'History & investigation' })).toBeVisible()
  if (expectReady) await expect(page.getByText('Preparation Resources (1)', { exact: true })).toBeVisible()
}

for (const theme of ['light', 'dark']) test(`connected Phase 1 shared resources, scoped history and immutable reports (${theme})`, async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const runtimeErrors: string[] = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  const response = await page.request.get(`${host}/api/verification/phase1`, { headers: { Authorization: 'Bearer phase1-staff' } })
  expect(response.ok()).toBe(true)
  const scene = await response.json() as Scene
  const sample = scene.samples[0]
  const path = `/api/platform/lab-operations/work-orders/${sample.workId}/specimens/${sample.specimenId}/investigation`
  expect((await page.request.get(`${host}${path}`)).status()).toBe(401)
  expect((await page.request.get(`${host}${path}`, { headers: { Authorization: 'Bearer phase1-customer' } })).status()).toBe(403)

  await mount(page, scene, 0, theme)
  if (info.project.name === 'mobile-chrome') {
    const explanation = await page.getByText('Review source tubes, laboratory work and the evidence behind a specific result.', { exact: true }).boundingBox()
    const reload = await page.getByRole('button', { name: 'Reload evidence' }).boundingBox()
    expect(explanation?.width).toBeGreaterThan(200)
    expect(reload!.y).toBeGreaterThanOrEqual(explanation!.y + explanation!.height)
  }
  const resources = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Preparation Resources/ }) }).first()
  await resources.locator(':scope > summary').focus()
  await page.keyboard.press('Enter')
  await resources.locator('details > summary').first().click()
  await expect(resources.getByText(/not an individual sample allocation/)).toBeVisible()
  await expect(resources.getByText('Shared command total; individual sample amount not recorded')).toBeVisible()
  await expect(resources.getByText('Physical Quantity', { exact: true })).toBeVisible()
  await expect(page.getByText('Vendor Results (2)', { exact: true })).toBeVisible()
  await page.getByText('Vendor Results (2)', { exact: true }).click()
  const vendor = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Vendor Results/ }) }).first()
  const version = vendor.locator('details').first()
  await version.locator(':scope > summary').click()
  await expect(version.getByText('Selected library run not performed', { exact: true })).toBeVisible()
  expect(await page.locator('body').innerText()).not.toContain('OTHER-SAMPLE-SECRET')

  await page.getByText('Find related samples', { exact: true }).click()
  await page.getByLabel('Reference type').selectOption('lot')
  await page.getByLabel('Exact reference').fill(scene.componentLotNumber)
  await page.getByRole('button', { name: 'Find samples' }).click()
  for (const entry of scene.samples) await expect(page.getByRole('link', { name: entry.accession, exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath(`phase1-${theme}.png`), fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.screenshot({ path: info.outputPath(`phase1-${theme}-viewport.png`) })

  await page.getByRole('button', { name: 'Save investigation report' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Investigation report saved.' })).toBeVisible()
  const reportRow = page.getByRole('region', { name: 'Saved investigation reports' }).locator('div.rounded-lg').first()
  const actions = reportRow.getByRole('button', { name: 'Actions', exact: true })
  await actions.click()
  await page.keyboard.press('Escape')
  await expect(actions).toBeFocused()
  await actions.click()
  const download = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download evidence manifest' }).click()
  const file = await download
  expect(file.suggestedFilename()).toMatch(/^sample-investigation-.*\.json$/)
  const stream = await file.createReadStream()
  expect(stream).not.toBeNull()
  const chunks: Buffer[] = []
  for await (const bytes of stream!) chunks.push(Buffer.from(bytes))
  const reportBytes = Buffer.concat(chunks)
  const body = reportBytes.toString('utf8')
  expect(createHash('sha256').update(reportBytes).digest('hex').toUpperCase()).toBe((await reportRow.innerText()).match(/[A-Fa-f0-9]{64}/)?.[0].toUpperCase())
  expect(body).toContain('preparationResources')
  expect(body).toContain('Selected library run not performed')
  expect(body).not.toContain('OTHER-SAMPLE-SECRET')

  await page.getByRole('button', { name: 'Processing view' }).click()
  await expect(page.getByRole('heading', { name: 'Processing evidence' })).toBeVisible()
  await expect(page.getByText('Preparation Resources (1)', { exact: true })).toBeVisible()
  await mount(page, scene, 1, theme)
  await expect(page.getByText('Preparation Resources (1)', { exact: true })).toBeVisible()
  await mount(page, scene, 0, theme, true)
  await expect(page.getByRole('button', { name: 'Save investigation report' })).toBeDisabled()

  const wrong = { ...scene, samples: [{ ...sample, workId: crypto.randomUUID() }] }
  await mount(page, wrong, 0, theme, false, false)
  await expect(page.getByRole('alert').first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save investigation report' })).toBeDisabled()
  expect(runtimeErrors).toEqual([])
})
