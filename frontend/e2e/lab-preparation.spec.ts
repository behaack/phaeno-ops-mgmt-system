import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { preparationFixture } from '../src/test-helpers/lab-preparation'
import type { PreparationCommand, PreparationDetail } from '../src/api/lab-preparation'

async function setup(page: Page, failedSecond = false, options: { resourceAvailability?: boolean; rejectFirstAsStale?: boolean; loseFirst?: boolean; configure?: (data: PreparationDetail) => void } = {}) {
  const data = preparationFixture()
  if (failedSecond) { data.members[1].state = 'Failed'; data.members[1].failureEvidence = 'TEST failure'; data.members[1].executions[0].status = 'Abandoned' }
  options.configure?.(data)
  const bodies: PreparationCommand[] = []
  const applied = new Set<string>()
  const html = await readFile(new URL('./fixtures/lab-preparation.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/lab-preparation.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.route('**/api/platform/lab-operations**', async route => {
    const url = new URL(route.request().url())
    const envelope = (value: unknown) => ({ success: true, data: value, error: null })
    if (url.pathname.endsWith('/commands')) {
      const body = route.request().postDataJSON() as PreparationCommand; bodies.push(body)
      if (options.rejectFirstAsStale && bodies.length === 1) {
        data.version++
        return route.fulfill({ status: 409, json: { success: false, data: null, error: { code: 'version_conflict', message: 'This batch changed. Review the latest version.' } } })
      }
      if (applied.has(body.requestId)) return route.fulfill({ json: envelope(data) })
      applied.add(body.requestId); data.version++
      if (body.action === 'output') data.members.find(m => m.id === body.memberId)!.output = { id: 'output', barcode: 'PH-L-TEST-OUTPUT', quantity: body.quantity!, quantityUnit: body.quantityUnit!, confirmed: false }
      if (body.action === 'confirm-output') data.members.find(m => m.id === body.memberId)!.output!.confirmed = true
      if (options.loseFirst && bodies.length === 1) return route.abort('failed')
      return route.fulfill({ json: envelope(data) })
    }
    if (url.pathname.endsWith('/lab-operations')) return route.fulfill({ json: envelope({ materialLots: [...(options.resourceAvailability ? [{ id: 'expired', name: 'Expired reagent', lotNumber: 'EXPIRED', availableQuantity: 100, quantityUnit: 'mL', qcDisposition: 'Passed', expirationOrRetestDate: '2000-01-01', version: 1 }, { id: 'due-today', name: 'Due today reagent', lotNumber: 'TODAY', availableQuantity: 100, quantityUnit: 'mL', qcDisposition: 'Passed', expirationOrRetestDate: new Date().toISOString().slice(0, 10), version: 1 }] : []), { id: 'lot', name: 'TEST reagent', lotNumber: 'TEST-LOT', availableQuantity: 100, quantityUnit: 'mL', qcDisposition: 'Passed', version: 1 }], equipment: options.resourceAvailability ? [{ id: 'overdue', name: 'Overdue equipment', assetCode: 'OVERDUE', status: 'Active', calibrationDueOn: '2000-01-01' }, { id: 'current', name: 'Current equipment', assetCode: 'CURRENT', status: 'Active', calibrationDueOn: new Date().toISOString().slice(0, 10) }, { id: 'retired', name: 'Retired equipment', assetCode: 'RETIRED', status: 'Retired', calibrationDueOn: null }] : [], batches: [] }) })
    if (url.pathname.includes('/preparation/batches/')) return route.fulfill({ json: envelope(data) })
    return route.fulfill({ status: 400, json: { success: false, error: { message: 'Unexpected fixture request' } } })
  })
  await page.goto('/e2e/fixtures/lab-preparation.html')
  await expect(page.getByRole('heading', { name: data.name })).toBeVisible()
  return { data, bodies }
}

test('shared capture and a tube exception retain explicit coverage and accessible fields', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const { bodies } = await setup(page)
  await page.getByRole('button', { name: 'Record step', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true }).first().fill('20')
  await page.getByRole('combobox', { name: 'QC outcome', exact: true }).first().selectOption('pass')
  await page.getByText('A2 · TEST-TUBE-2 — values and exceptions', { exact: true }).click()
  await page.locator('[id="member-1_temperature"]').fill('2')
  await page.locator('[id="member-1_qc"]').selectOption('hold')
  await page.locator('[id="member-1_reason"]').fill('TEST ONLY tube exception')
  await page.getByLabel('I performed this step', { exact: false }).check()
  await page.getByLabel('I confirm this entry applies', { exact: false }).check()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  const widths = await page.getByRole('combobox', { name: 'QC outcome', exact: true }).first().evaluate(e => ({ control: e.getBoundingClientRect().width, field: e.parentElement!.getBoundingClientRect().width }))
  expect(Math.abs(widths.control - widths.field)).toBeLessThan(2)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('shared-step.png'), fullPage: true })
  await page.getByRole('button', { name: 'Save step evidence' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies[0].step?.sharedCaptures).toEqual({ temperature: 20 })
  expect(bodies[0].step?.tubes.find(t => t.memberId === 'member-1')).toEqual({ memberId: 'member-1', captures: { temperature: 2 }, qcOutcome: 'hold', reason: 'TEST ONLY tube exception' })
  expect(bodies[0].step?.coveredMemberIds).toEqual(['member-0', 'member-1'])
})

test('failed tubes are excluded from later evidence and output identity is carried forward', async ({ page }) => {
  const { bodies } = await setup(page, true, { configure: data => {
    data.members[1].output = { id: 'failed-output', barcode: 'TEST-FAILED-OUTPUT', quantity: 10, quantityUnit: 'uL', confirmed: false }
  } })
  await page.locator('summary').filter({ hasText: 'A2 · TEST-TUBE-2' }).click()
  await expect(page.getByText('Output retained for traceability. This attempt failed and cannot supply a sequencing library.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'TEST-FAILED-OUTPUT', exact: true })).toBeVisible()
  await expect(page.getByText('Output scan needed', { exact: false })).toHaveCount(0)
  await expect(page.getByText('Label the output, then scan its barcode to confirm identity.')).toHaveCount(0)
  await page.getByRole('button', { name: 'Record step', exact: true }).click()
  await expect(page.getByLabel('A2 · TEST-TUBE-2 · TEST-JOB-2', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(bodies).toHaveLength(0)
  await page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }).click()
  await page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }) }).first().getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Create library output' }).click()
  await expect(page.getByRole('combobox')).toHaveCount(0)
  await page.getByRole('spinbutton', { name: 'Actual output quantity' }).fill('10')
  await page.getByRole('textbox', { name: 'Quantity unit', exact: true }).fill('uL')
  await page.getByRole('textbox', { name: 'Storage location', exact: true }).fill('TEST-BOX')
  await page.getByRole('button', { name: 'Create library output', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies[0]).toMatchObject({ action: 'output', memberId: 'member-0', quantity: 10, quantityUnit: 'uL', location: 'TEST-BOX' })
  expect(bodies[0]).not.toHaveProperty('specimenId')
  await expect(page.getByText('Label the output, then scan its barcode to confirm identity.')).toBeVisible()
})


test('an uncertain save retains the same command and original version after refresh', async ({ page }) => {
  const { bodies, data } = await setup(page, true, { loseFirst: true })
  await page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }).click()
  await page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }) }).first().getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Create library output' }).click()
  await page.getByRole('spinbutton', { name: 'Actual output quantity' }).fill('10')
  await page.getByRole('textbox', { name: 'Quantity unit', exact: true }).fill('uL')
  await page.getByRole('textbox', { name: 'Storage location', exact: true }).fill('TEST-BOX')
  await page.getByRole('button', { name: 'Create library output', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('latest batch')
  await expect(page.getByRole('spinbutton', { name: 'Actual output quantity' })).toHaveValue('10')
  await page.getByRole('button', { name: 'Create library output', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies).toHaveLength(2)
  expect(bodies[1]).toEqual(bodies[0])
  expect(bodies[1].version).toBe(4)
  expect(data.version).toBe(5)
})

test('resource use follows selected step coverage and preserves the unfinished step', async ({ page }) => {
  const { bodies } = await setup(page, false, { configure: data => { data.stages[0].definition.steps[0].inputMaterials = ['TEST reagent'] } })
  await page.getByRole('button', { name: 'Record step', exact: true }).click()
  await page.getByLabel('A2 · TEST-TUBE-2 · TEST-JOB-2', { exact: true }).uncheck()
  await page.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true }).first().fill('20')
  await page.getByRole('dialog').getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Record material use', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('One use record covers: A1.')
  await page.getByRole('combobox', { name: 'Material lot' }).selectOption('lot')
  await page.getByRole('spinbutton', { name: 'Total quantity used for these tubes' }).fill('2')
  await page.getByRole('combobox', { name: 'Confirm resource coverage' }).selectOption('yes')
  await page.getByRole('button', { name: 'Record material use', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Record step: Assess preparation' })).toBeVisible()
  await expect(page.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true }).first()).toHaveValue('20')
  expect(bodies[0]).toMatchObject({ action: 'material', quantity: 2, coveredMemberIds: ['member-0'], confirmed: true })
})

test('an existing output is selected by identity without retyping its relationships or quantities', async ({ page }) => {
  const { bodies } = await setup(page, true, { configure: data => { data.members[0].availableOutputs = [{ id: 'existing-output', barcode: 'TEST-EXISTING', quantity: 10, quantityUnit: 'uL' }] } })
  await page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }).click()
  await page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }) }).first().getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Select existing output' }).click()
  await page.getByRole('combobox', { name: 'Existing library output' }).selectOption('existing-output')
  await page.getByRole('textbox', { name: 'Scan existing output barcode' }).fill('TEST-EXISTING')
  await expect(page.getByRole('spinbutton')).toHaveCount(0)
  await page.getByRole('button', { name: 'Select existing output', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies[0]).toMatchObject({ action: 'output', memberId: 'member-0', outputContainerId: 'existing-output', barcode: 'TEST-EXISTING', quantity: 10, quantityUnit: 'uL' })
})

test('stage completion identifies the affected stage without an empty required form', async ({ page }) => {
  const { bodies } = await setup(page)
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Complete stage', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Complete stage', exact: true })
  await expect(dialog.getByText('Library preparation', { exact: true })).toBeVisible()
  await expect(dialog.getByText('TEST ONLY — mixed preparation tray', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Recorded evidence remains in history.', { exact: false })).toBeVisible()
  await expect(dialog.getByText('* Required', { exact: true })).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  expect(bodies).toHaveLength(0)
})

test('resource choices exclude expired lots and overdue equipment but include the due date', async ({ page }) => {
  await setup(page, false, { resourceAvailability: true })
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Record material use', exact: true }).click()
  const lots = page.getByRole('combobox', { name: 'Material lot', exact: true })
  await expect(lots.locator('option')).toHaveText(['Choose…', 'Due today reagent · TODAY · 100 mL', 'TEST reagent · TEST-LOT · 100 mL'])
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Record equipment use', exact: true }).click()
  await expect(page.getByRole('combobox', { name: 'Equipment', exact: true }).locator('option')).toHaveText(['Choose…', 'Current equipment · CURRENT'])
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
})

for (const role of ['Operator', 'ScientificReviewer']) {
  test(`${role} cannot record a Supervisor preparation step`, async ({ page }) => {
    const { bodies } = await setup(page, false, { configure: data => {
      data.roles = [role]
      data.canOperate = role === 'Operator'
      data.canCorrect = false
      data.stages[0].definition.steps[0].requiredRole = 'Supervisor'
    } })
    await expect(page.getByText('Requires Supervisor.', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Record step', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Correct step', exact: true })).toHaveCount(0)
    if (role === 'ScientificReviewer') {
      await expect(page.getByRole('button', { name: 'Actions', exact: true })).toHaveCount(0)
      await expect(page.getByRole('button', { name: 'Complete preparation batch', exact: true })).toHaveCount(0)
    }
    expect(bodies).toHaveLength(0)
  })
}

test('keyboard step cancellation restores focus without saving', async ({ page }) => {
  const { bodies } = await setup(page)
  const trigger = page.getByRole('button', { name: 'Record step', exact: true })
  await trigger.focus()
  await trigger.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('checkbox').first()).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('checkbox').nth(1)).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('spinbutton', { name: 'Temperature (°C)', exact: true }).first()).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()
  expect(bodies).toHaveLength(0)
})

test('a definite stale save preserves values and retries as a new reviewed command', async ({ page }) => {
  const { bodies, data } = await setup(page, true, { rejectFirstAsStale: true })
  await page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }).click()
  await page.locator('details').filter({ has: page.locator('summary').filter({ hasText: 'A1 · TEST-TUBE-1' }) }).first().getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Create library output' }).click()
  await page.getByRole('spinbutton', { name: 'Actual output quantity' }).fill('10')
  await page.getByRole('textbox', { name: 'Quantity unit', exact: true }).fill('uL')
  await page.getByRole('textbox', { name: 'Storage location', exact: true }).fill('TEST-STALE-BOX')
  await page.getByRole('button', { name: 'Create library output', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('This batch changed.')
  await expect(page.getByRole('spinbutton', { name: 'Actual output quantity' })).toHaveValue('10')
  await expect(page.getByRole('textbox', { name: 'Storage location', exact: true })).toHaveValue('TEST-STALE-BOX')
  expect(data.members[0].output).toBeNull()
  await page.getByRole('button', { name: 'Create library output', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies).toHaveLength(2)
  expect(bodies[0].version).toBe(4)
  expect(bodies[1].version).toBe(5)
  expect(bodies[1].requestId).not.toBe(bodies[0].requestId)
  expect(bodies[1]).toMatchObject({ action: 'output', quantity: 10, quantityUnit: 'uL', location: 'TEST-STALE-BOX' })
  expect(data.version).toBe(6)
})
