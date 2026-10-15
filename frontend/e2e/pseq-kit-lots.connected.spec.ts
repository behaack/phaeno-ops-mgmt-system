import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page, type TestInfo } from '@playwright/test'
import { readFile } from 'node:fs/promises'

// Launched by the opt-in backend test host. No feature API responses are mocked.
// Clerk, scanning and blob storage remain explicitly synthetic test boundaries.
const host = process.env.PSEQ_KIT_TEST_API
test.skip(!host, 'Run through BrowserStandaloneLotThenAssemblyUsesRealHttpAndPostgres.')
test.setTimeout(120_000)
test.use({ actionTimeout: 15_000, launchOptions: { args: ['--disable-features=LocalNetworkAccessChecks'] } })
type Scenario = { orderId: string; caseId: string; organizationId: string; departmentId: string; otherDepartmentId: string; lotId: string; lotNumber: string; usedOn: string; expiredUseDate: string; expirationDate: string }
async function api(path: string, method = 'GET', data?: unknown, actor = 'partner') {
  const response = await fetch(`${host}${path}`, { method, headers: { Authorization: `Bearer kit-test-${actor}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: data === undefined ? undefined : JSON.stringify(data) })
  const body = await response.json()
  expect(response.ok, JSON.stringify(body)).toBe(true)
  return body.data ?? body
}
async function mount(page: Page, scenario: Scenario, screen = 'kit', requestId?: string) {
  const errors: string[] = []
  page.on('pageerror', error => { errors.push(error.message); console.log('Browser error:', error.message) })
  page.on('console', message => { if (message.type() === 'error') console.log('Browser console:', message.text()) })
  page.on('response', response => { if (response.status() >= 400) console.log('HTTP', response.status(), new URL(response.url()).pathname) })
  await page.unrouteAll({ behavior: 'wait' })
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/verification/bootstrap') return route.fulfill({ json: { order: scenario.orderId, case: scenario.caseId, organization: scenario.organizationId, department: scenario.departmentId, ...(requestId ? { request: requestId } : {}) } })
    const response = await route.fetch({ url: `${host}${path}`, headers: { ...route.request().headers(), Authorization: `Bearer kit-test-${screen === 'assembly-staff' ? 'staff' : 'partner'}` } })
    await route.fulfill({ response })
  })
  const html = await readFile(new URL('./fixtures/bundled-orders.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/bundled-orders.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto(`/e2e/fixtures/bundled-orders.html?screen=${screen}&connected=1`)
  await expect(page.locator('main')).toBeVisible({ timeout: 20_000 })
  expect(errors).toEqual([])
  return errors
}
async function caseAction(page: Page, name: string) {
  const section = page.locator('article').filter({ has: page.getByRole('heading', { level: 3 }) }).last()
  await section.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
async function capture(page: Page, info: TestInfo, name: string) {
  await page.evaluate(async () => { await Promise.all(document.getAnimations().filter(a => a.effect?.getTiming().iterations !== Infinity).map(a => a.finished.catch(() => undefined))) })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  const result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
  expect(result.violations).toEqual([])
  await page.screenshot({ path: info.outputPath(`${name}.png`), fullPage: true })
}
async function saveLot(page: Page, lot: string, usedOn?: string) {
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('textbox', { name: /Lot number/ }).fill(lot)
  if (usedOn) await dialog.getByLabel('Actual kit-use date', { exact: false }).fill(usedOn)
  await dialog.getByRole('button', { name: 'Save and check lot' }).click()
  await expect(dialog).toHaveCount(0)
}

test('standalone early lot persists, later assembly reuses it and analysis rechecks recall', async ({ page }, info) => {
  const scenario: Scenario = await api('/verification/scenario', 'POST')
  const kitUrl = `${host}/api/reagent-orders/${scenario.orderId}`
  expect((await page.request.get(kitUrl)).status()).toBe(401)
  const headers = { Authorization: 'Bearer kit-test-partner', 'X-Organization-Id': scenario.organizationId, 'X-Department-Id': scenario.departmentId }
  const kitResponse = await page.request.get(kitUrl, { headers })
  expect(kitResponse.ok()).toBe(true)
  const kit = (await kitResponse.json()).data
  const denied = await page.request.post(`${kitUrl}/assembly-cases/${scenario.caseId}/lot`, {
    headers: { ...headers, 'X-Department-Id': scenario.otherDepartmentId, 'Idempotency-Key': crypto.randomUUID() },
    data: { caseVersion: kit.assemblyCases[0].version, version: null, lotNumber: scenario.lotNumber, usedOn: null },
  })
  expect(denied.status()).toBe(404)
  const errors = await mount(page, scenario)
  await caseAction(page, 'Submit kit lot')
  const dialog = page.getByRole('dialog')
  await expect(dialog.locator('input[type=file]')).toHaveCount(0)
  await expect(dialog.getByLabel('Actual kit-use date', { exact: false })).toHaveValue('')
  await capture(page, info, 'early-lot-dialog')
  await dialog.getByRole('textbox', { name: /Lot number/ }).fill('WRONG-LOT')
  await dialog.getByRole('button', { name: 'Save and check lot' }).click()
  await expect(dialog.getByText('Lot was not saved', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('textbox', { name: /Lot number/ })).toHaveValue('WRONG-LOT')
  await saveLot(page, scenario.lotNumber)
  await expect(page.getByText('Kit lot has expired', { exact: true })).toBeVisible()
  await expect(page.getByText(new RegExp(`Expires ${scenario.expirationDate}$`))).toBeVisible()
  let evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.submissions).toHaveLength(1)
  expect(evidence.submissions[0].usedOn).toBeNull()
  expect(evidence.requests).toEqual([])
  expect(evidence.files).toEqual([])
  await page.reload()
  await expect(page.getByText(`Lot ${scenario.lotNumber}`, { exact: true })).toBeVisible()
  await capture(page, info, 'standalone-lot-saved')
  await caseAction(page, 'Prepare inputs')
  await expect(page.getByText(`Lot ${scenario.lotNumber}`, { exact: true })).toBeVisible()
  await page.getByRole('textbox', { name: /Partner project or reference/ }).fill('SIMULATED connected lot study')
  await page.locator('input[type=file]').setInputFiles({ name: 'simulated.fasta', mimeType: 'text/plain', buffer: Buffer.from('>SIMULATED\nACGT\n') })
  await page.getByRole('checkbox').check()
  await page.getByRole('button', { name: 'Submit for intake validation', exact: true }).click()
  await expect(page.getByText('Save the kit lot and actual kit-use date before submitting assembly inputs. You can still save your draft.')).toBeVisible()
  evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.requests).toEqual([])
  await page.getByRole('button', { name: 'Update kit lot submission' }).click()
  await saveLot(page, scenario.lotNumber, scenario.usedOn)
  await expect(page.getByText('No recall or expiration warning for this check.', { exact: true })).toBeVisible()
  await expect(page.getByText('Kit lot has expired', { exact: true })).toHaveCount(0)
  await capture(page, info, 'actual-use-before-expiration')
  await page.getByRole('button', { name: 'Save draft', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'SIMULATED connected lot study', exact: true })).toBeVisible({ timeout: 20_000 })
  evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.requests).toHaveLength(1)
  expect(evidence.files).toHaveLength(1)
  expect(evidence.revisions).toEqual([])
  const requestId = evidence.requests[0].id
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Submit for intake', exact: true }).click()
  await expect(page.getByText('Revision 1', { exact: true })).toBeVisible()
  evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.revisions).toHaveLength(1)
  const frozen = JSON.parse(evidence.revisions[0].kitLotAssessmentJson)
  expect(frozen.isExpired).toBe(false)
  expect(frozen.isRecalled).toBe(false)
  expect(evidence.revisions[0].kitUsedOn).toBe(scenario.usedOn)
  await capture(page, info, 'assembly-submitted-reused-lot')
  let request = await api(`/api/platform/data-assembly-requests/${requestId}`, 'GET', undefined, 'staff')
  request = await api(`/api/platform/data-assembly-requests/${requestId}/begin-intake`, 'POST', { version: request.version }, 'staff')
  await api(`/api/platform/data-assembly-requests/${requestId}/accept-intake`, 'POST', { version: request.version }, 'staff')
  await mount(page, scenario, 'assembly-staff', requestId)
  await page.getByRole('button', { name: 'Start processing', exact: true }).click()
  await page.getByLabel('Pipeline version', { exact: false }).fill('SIMULATED-browser-1')
  await page.getByLabel('Provenance', { exact: false }).fill('SIMULATED; no scientific processing performed')
  // Change the authoritative lot after the Phaeno start form has loaded.
  await api(`/api/platform/order-configuration/kit-lots/${scenario.lotId}/recall`, 'POST', { version: 1, isRecalled: true, reason: 'SIMULATED recall after submission' }, 'staff')
  await page.getByRole('button', { name: 'Start run', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('Operation was not saved', { exact: true })).toBeVisible()
  expect((await api(`/verification/evidence/${scenario.orderId}`)).runs).toEqual([])
  await page.getByRole('button', { name: 'Refresh lot information', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('Lot recalled', { exact: true })).toBeVisible()
  await capture(page, info, 'analysis-stale-lot-refresh')
  await page.getByRole('button', { name: 'Start run', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.requests).toHaveLength(1)
  expect(evidence.runs).toHaveLength(1)
  expect(JSON.parse(evidence.runs[0].kitLotAssessmentJson).isRecalled).toBe(true)
  expect(JSON.parse(evidence.revisions[0].kitLotAssessmentJson)).toEqual(frozen)
  await capture(page, info, 'analysis-run-current-recall')
  expect(errors).toEqual([])
})

test('early recalled and expired lot shows both warnings, keyboard cancel retains saved evidence', async ({ page }, info) => {
  const scenario: Scenario = await api('/verification/scenario', 'POST')
  await api(`/api/platform/order-configuration/kit-lots/${scenario.lotId}/recall`, 'POST', { version: 1, isRecalled: true, reason: 'SIMULATED affected reagent' }, 'staff')
  const errors = await mount(page, scenario)
  await caseAction(page, 'Submit kit lot')
  await saveLot(page, scenario.lotNumber, scenario.expiredUseDate)
  await expect(page.getByText('Lot recalled', { exact: true })).toBeVisible()
  await expect(page.getByText('Kit was expired when used', { exact: true })).toBeVisible()
  for (const theme of ['light', 'dark']) {
    await page.evaluate(value => document.documentElement.classList.toggle('dark', value === 'dark'), theme)
    await capture(page, info, `both-warnings-${theme}`)
  }
  await caseAction(page, 'Update kit lot submission')
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.locator('article').last().getByRole('button', { name: 'Actions', exact: true })).toBeFocused()
  const evidence = await api(`/verification/evidence/${scenario.orderId}`)
  expect(evidence.submissions).toHaveLength(1)
  expect(evidence.requests).toEqual([])
  expect(errors).toEqual([])
})
