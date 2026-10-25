import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Download, type Locator } from '@playwright/test'
import { createHash } from 'node:crypto'

const host = process.env.PSEQ_PHASE4_TEST_API
test.skip(!host, 'Run with the isolated Phase 4 restored-database/browser wrapper.')
test.setTimeout(180_000)
test.afterEach(async ({ page }) => {
  // Drain real forwarded requests before Playwright closes their page/context.
  await page.unrouteAll({ behavior: 'wait' })
})
const staff = { Authorization: 'Bearer phase4-staff' }
type Scene = { workId: string; specimenId: string; packageId: string; analysisId: string; sourceBarcode: string; reportId: string; reportSha256: string; rawFileId: string; sha256: string; originalStorageUnavailable: boolean }
type EventPage = { through: string; rows: { id: string; eventCode: string }[] }
async function bytes(file: Download) {
  const stream = await file.createReadStream(); expect(stream).not.toBeNull()
  const chunks: Buffer[] = []; for await (const chunk of stream!) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks)
}
async function expand(section: Locator) { await section.locator(':scope > summary').click() }

for (const theme of ['light', 'dark']) test(`restored chain, truthful failures, replay and long history (${theme})`, async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const runtimeErrors: string[] = []; page.on('pageerror', error => runtimeErrors.push(error.message))
  const prepare = async (state: string) => {
    const response = await page.request.post(`${host}/api/verification/phase4/state/${state}`, { headers: staff })
    expect(response.ok(), await response.text()).toBe(true)
  }
  await prepare('reset')
  const sceneResponse = await page.request.get(`${host}/api/verification/phase4`, { headers: staff })
  expect(sceneResponse.ok()).toBe(true)
  const scene = await sceneResponse.json() as Scene
  expect(scene.originalStorageUnavailable).toBe(true)
  const base = `/api/platform/lab-operations/work-orders/${scene.workId}/specimens/${scene.specimenId}`
  expect((await page.request.get(`${host}${base}/investigation`)).status()).toBe(401)
  expect((await page.request.get(`${host}${base}/investigation`, { headers: { Authorization: 'Bearer phase4-customer' } })).status()).toBe(403)
  expect((await page.request.get(`${host}${base}/scientific-evidence/files/${scene.rawFileId}`, { headers: { Authorization: 'Bearer phase4-customer' } })).status()).toBe(403)
  let loseResponse = false
  let trackHistory = false
  const eventPages: EventPage[] = []
  const replayBodies: string[] = []
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const request = route.request(), url = new URL(request.url())
    const response = await route.fetch({ url: `${host}${url.pathname}${url.search}`, headers: { ...request.headers(), ...staff } })
    if (trackHistory && url.pathname === `${base}/investigation/events`) eventPages.push((await response.json()).data as EventPage)
    if (request.method() === 'POST' && url.pathname === `${base}/investigation/reports`) {
      replayBodies.push(request.postData() ?? '')
      if (loseResponse) { loseResponse = false; await route.abort('failed'); return }
    }
    await route.fulfill({ response })
  })
  const url = `/e2e/fixtures/sample-recovery-phase4.html?${new URLSearchParams({ work: scene.workId, specimen: scene.specimenId, file: scene.rawFileId, theme })}`
  await page.goto(url)
  await expect(page.getByRole('heading', { name: 'History & investigation' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save investigation report' })).toBeEnabled()
  const saved = page.getByRole('region', { name: 'Saved investigation reports' })
  const originalRow = saved.locator('div.rounded-lg').filter({ hasText: scene.reportSha256 })
  await expect(originalRow).toBeVisible()
  const actions = originalRow.getByRole('button', { name: 'Actions', exact: true })
  await actions.focus(); await page.keyboard.press('Enter'); await expect(page.getByRole('menuitem', { name: 'Download evidence manifest' })).toBeVisible()
  await page.keyboard.press('Escape'); await expect(actions).toBeFocused()
  await actions.click()
  const manifest = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Download evidence manifest' }).click()
  const frozen = await bytes(await manifest)
  expect(createHash('sha256').update(frozen).digest('hex').toUpperCase()).toBe(scene.reportSha256.toUpperCase())
  expect(frozen.toString()).toContain('TEST-ACTUAL-PHASE4-RUN')
  expect(frozen.toString()).toContain(scene.sourceBarcode)

  // The command commits, but the browser loses its response. Retrying must reuse its request ID.
  const countBefore = (await (await page.request.get(`${host}${base}/investigation/reports`, { headers: staff })).json()).data.length as number
  loseResponse = true
  await page.getByRole('button', { name: 'Save investigation report' }).click()
  await expect(saved.getByRole('alert')).toBeVisible()
  await page.getByRole('button', { name: 'Save investigation report' }).click()
  await expect(saved.getByRole('status')).toHaveText('Investigation report saved.')
  expect(replayBodies).toHaveLength(2); expect(replayBodies[0]).toBe(replayBodies[1])
  expect((await (await page.request.get(`${host}${base}/investigation/reports`, { headers: staff })).json()).data).toHaveLength(countBefore + 1)

  await prepare('report-corrupt')
  await actions.click(); await page.getByRole('menuitem', { name: 'Download evidence manifest' }).click()
  await expect(saved.getByRole('alert')).toContainText('checksum')
  await prepare('report-healthy')
  await actions.click(); const recovered = page.waitForEvent('download'); await page.getByRole('menuitem', { name: 'Download evidence manifest' }).click()
  expect(await bytes(await recovered)).toEqual(frozen)

  await page.getByRole('button', { name: 'Results view' }).click()
  await page.getByLabel('Result version').selectOption(scene.packageId)
  await expect(page.getByText(`Source tube: ${scene.sourceBarcode}`, { exact: true })).toBeVisible()
  const producing = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Producing analysis/ }) }).first()
  await expand(producing); await expand(producing.locator('details').first())
  await expect(producing).toContainText(scene.analysisId)
  const inputs = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Sequencing inputs/ }) }).first()
  await expand(inputs); await expand(inputs.locator('details').first())
  await expect(inputs).toContainText('TEST-ACTUAL-PHASE4-RUN')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Result lineage must reflow at this viewport').toBe(true)
  await page.screenshot({ path: info.outputPath(`recovery-${theme}-result-chain.png`), fullPage: true })
  await page.getByRole('button', { name: 'Processing view' }).click()
  const physical = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Physical Lifecycle/ }) }).first()
  await expand(physical); await expand(physical.locator('details').filter({ hasText: 'HoldPlaced' }).first())
  await expect(physical).toContainText('TEST ONLY preservation through recovery')

  const managed = page.getByRole('region', { name: 'Managed scientific file' })
  const rawButton = managed.getByRole('button', { name: /^Download / })
  await expect(rawButton).toBeVisible()
  await rawButton.click({ trial: true }); const raw = page.waitForEvent('download'); await rawButton.click()
  expect(createHash('sha256').update(await bytes(await raw)).digest('hex').toUpperCase()).toBe(scene.sha256.toUpperCase())
  await prepare('corrupt'); await rawButton.click()
  await expect(managed.getByRole('alert')).toContainText('fingerprint')
  await prepare('missing'); await rawButton.click()
  await expect(managed.getByRole('alert')).toContainText(/not found|unavailable/i)
  await page.screenshot({ path: info.outputPath(`recovery-${theme}-unavailable.png`), fullPage: true })
  await prepare('healthy'); const retry = page.waitForEvent('download'); await rawButton.click()
  expect(createHash('sha256').update(await bytes(await retry)).digest('hex').toUpperCase()).toBe(scene.sha256.toUpperCase())
  await expect(managed.getByRole('alert')).toHaveCount(0)

  await prepare('long-history'); trackHistory = true; await page.goto(url)
  const longReportCount = (await (await page.request.get(`${host}${base}/investigation/reports`, { headers: staff })).json()).data.length as number
  await page.getByRole('button', { name: 'Save investigation report' }).click()
  await expect(saved.getByRole('alert')).toContainText('exceeds the supported report size')
  expect((await (await page.request.get(`${host}${base}/investigation/reports`, { headers: staff })).json()).data).toHaveLength(longReportCount)
  const coverage = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Evidence coverage and limits' }) }).first()
  await expand(coverage); await expect(coverage).toContainText('coverage does not certify scientific validity')
  const history = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: /^Event history$/ }) }).first()
  await history.locator(':scope > summary').focus(); await page.keyboard.press('Enter')
  const firstResponse = await page.request.get(`${host}${base}/investigation/events?through=${encodeURIComponent(new Date().toISOString())}`, { headers: staff })
  expect((await firstResponse.json()).data.rows.length).toBe(50)
  await expect(history.getByText('Page 1', { exact: true })).toBeVisible()
  expect(eventPages).toHaveLength(1)
  const firstLabels = await history.locator(':scope > div > details > summary').allTextContents()
  await prepare('append')
  await history.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(history.getByText('Page 2', { exact: true })).toBeVisible()
  expect(eventPages).toHaveLength(2)
  expect(eventPages[1].through).toBe(eventPages[0].through)
  expect(new Set(eventPages.flatMap(p => p.rows.map(row => row.id))).size).toBe(100)
  expect(eventPages.flatMap(p => p.rows).some(row => row.eventCode === 'TESTPhase4BrowserLaterAppend')).toBe(false)
  expect(await history.locator(':scope > div > details > summary').allTextContents()).toHaveLength(50)
  await history.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(history.getByText('Page 1', { exact: true })).toBeVisible()
  expect(await history.locator(':scope > div > details > summary').allTextContents()).toEqual(firstLabels)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath(`recovery-${theme}-history.png`), fullPage: true })
  await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: info.outputPath(`recovery-${theme}-viewport.png`) })
  expect(runtimeErrors).toEqual([])
  await prepare('reset')
})
