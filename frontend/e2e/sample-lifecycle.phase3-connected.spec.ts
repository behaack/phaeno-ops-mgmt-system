import AxeBuilder from '@axe-core/playwright'
import { createHash } from 'node:crypto'
import { expect, test, type Page, type Locator } from '@playwright/test'

test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: 'wait' }) })

const host = process.env.PSEQ_PHASE3_TEST_API
test.skip(!host, 'Use the isolated Phase 3 PostgreSQL/browser wrapper.')
test.setTimeout(240_000)
const base = '/api/platform/lab-operations'
const headers = { Authorization: 'Bearer phase3-staff' }
type Scene = { id: string; workId: string; specimenIds: string[]; tubeIds: string[]; barcodes: string[]; prepId: string; executionIds: string[]; reviewerId: string; mixId: string; boxBarcode: string; equipmentId: string; equipmentAssetCode: string; equipmentVersion: number }
const minute = (minutesAgo = 0) => new Date(Date.now() - minutesAgo * 60000).toISOString().slice(0, 16) + '+00:00'
async function mount(page: Page, theme: string, parameters: Record<string, string>) {
  await page.goto(`/e2e/fixtures/sample-lifecycle-phase3.html?${new URLSearchParams({ theme, ...parameters })}`)
}
async function accessible(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
}
async function regions(dialog: Locator) {
  await expect(dialog.locator('[data-slot="dialog-header"]')).toBeVisible()
  await expect(dialog.locator('[data-slot="dialog-body"]')).toBeVisible()
  await expect(dialog.locator('[data-slot="dialog-footer"]')).toBeVisible()
}
async function openPhysical(page: Page, kind = 'Placed') {
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Record physical action' }).click()
  const dialog = page.getByRole('dialog', { name: 'Record physical lifecycle' })
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await regions(dialog)
  await dialog.locator('#physical-kind').selectOption(kind)
  return dialog
}
async function record(page: Page, scene: Scene, kind: string, reason: string, extra: Record<string, unknown> = {}, index = 0) {
  const work = (await (await page.request.get(`${host}${base}/work-orders/${scene.workId}`, { headers })).json()).data
  const tube = work.containers.find((t: { id: string }) => t.id === scene.tubeIds[index])
  return page.request.post(`${host}${base}/containers/${tube.id}/physical`, { headers, data: { requestId: crypto.randomUUID(), version: tube.version, kind, scannedBarcode: scene.barcodes[index], reason, ...extra } })
}
for (const theme of ['light', 'dark']) test(`Phase 3 connected lifecycle and timing (${theme})`, async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.setViewportSize({ width: 320, height: 800 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  let actor = 'staff'
  await page.route(url => url.pathname.startsWith('/api/'), async route => {
    const url = new URL(route.request().url())
    const response = await route.fetch({ url: `${host}${url.pathname}${url.search}`, headers: { ...route.request().headers(), Authorization: `Bearer phase3-${actor}` } })
    await route.fulfill({ response })
  })
  const seeded = await page.request.post(`${host}/api/verification/phase3/scenes`, { headers })
  expect(seeded.ok(), await seeded.text()).toBe(true)
  const scene = await seeded.json() as Scene
  const physicalPath = `${base}/containers/${scene.tubeIds[0]}/physical`
  expect((await page.request.get(`${host}${physicalPath}`)).status()).toBe(401)
  expect((await page.request.get(`${host}${physicalPath}`, { headers: { Authorization: 'Bearer phase3-customer' } })).status()).toBe(403)
  const physical = async (i = 0) => (await (await page.request.get(`${host}${base}/containers/${scene.tubeIds[i]}/physical`, { headers })).json()).data

  await mount(page, theme, { mode: 'box', box: scene.boxBarcode })
  let dialog = page.getByRole('dialog', { name: 'Register freezer box' })
  await regions(dialog)
  await dialog.getByLabel('Room', { exact: false }).fill('TEST room')
  await dialog.getByLabel('Freezer', { exact: false }).fill('TEST freezer')
  await dialog.getByLabel('Rack', { exact: false }).fill('TEST rack')
  await dialog.getByLabel('Shelf / box location', { exact: false }).fill('TEST shelf 1')
  await dialog.getByLabel('Reason', { exact: false }).fill('TEST observed box registration')
  await accessible(page)
  await dialog.getByRole('button', { name: 'Register box and confirm' }).click()
  await expect(page.getByText('Box confirmed', { exact: true })).toBeVisible()
  await mount(page, theme, { mode: 'box', box: scene.boxBarcode })
  dialog = page.getByRole('dialog', { name: 'Confirm freezer box' })
  await expect(dialog.getByText(/TEST room \/ TEST freezer \/ TEST rack \/ TEST shelf 1/)).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await dialog.getByRole('button', { name: 'Confirm box and location' }).click()

  await mount(page, theme, { work: scene.workId, tube: scene.tubeIds[0] })
  await expect(page.getByRole('heading', { name: scene.barcodes[0], exact: true })).toBeVisible()
  await expect(page.getByText(/Box hierarchy not yet registered/)).toBeVisible()
  const actions = page.getByRole('button', { name: 'Actions', exact: true })
  await actions.focus(); await page.keyboard.press('Enter')
  await page.getByRole('menuitem', { name: 'Record physical action' }).press('Enter')
  dialog = page.getByRole('dialog', { name: 'Record physical lifecycle' })
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeFocused()
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden(); await expect(actions).toBeFocused()
  dialog = await openPhysical(page)
  await dialog.locator('#physical-reason').fill('TEST unsaved draft')
  await page.keyboard.press('Escape')
  const discard = page.getByRole('dialog').filter({ hasText: 'Discard the unsaved physical record?' })
  await regions(discard)
  await discard.getByRole('button', { name: 'Keep editing', exact: true }).click()
  await expect(dialog.locator('#physical-reason')).toHaveValue('TEST unsaved draft')
  await dialog.locator('#physical-reason').fill('')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(dialog).toBeHidden()
  dialog = await openPhysical(page)
  await dialog.locator('#physical-scannedBarcode').fill('WRONG-TUBE')
  await dialog.locator('#physical-destination').fill(scene.boxBarcode)
  await dialog.locator('#physical-position').fill('A1')
  await dialog.locator('#physical-reason').fill('TEST actual placement')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click()
  await expect(dialog.getByText(/Scan this physical tube/)).toBeVisible()
  expect((await physical()).history.events).toHaveLength(0)
  await dialog.locator('#physical-scannedBarcode').fill(scene.barcodes[0])
  await dialog.getByRole('button', { name: 'Confirm or register destination box' }).click()
  await page.getByRole('button', { name: 'Confirm box and location' }).click()
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/Tube position A1/)).toBeVisible()
  const earlierPlacement = (await physical()).history.events.find((event: { kind: string }) => event.kind === 'Placed').occurredAtUtc.replace('Z', '+00:00')
  expect((await record(page, scene, 'Placed', 'TEST current confirmed storage', { destination: scene.boxBarcode, position: 'A1' })).ok()).toBe(true)
  await mount(page, theme, { work: scene.workId, tube: scene.tubeIds[0] })
  dialog = await openPhysical(page)
  await dialog.locator('#physical-scannedBarcode').fill(scene.barcodes[0])
  await dialog.locator('#physical-destination').fill(scene.boxBarcode)
  await dialog.locator('#physical-position').fill('A2')
  await dialog.locator('#physical-occurredAt').fill(earlierPlacement)
  await dialog.locator('#physical-reason').fill('TEST contradictory late placement')
  const handlingBefore = await physical()
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click()
  await expect(dialog.getByText(/precedes later recorded physical handling/)).toBeVisible()
  expect((await physical()).history.events).toHaveLength(handlingBefore.history.events.length)
  expect((await physical()).storagePosition).toBe('A1')
  await dialog.locator('#physical-kind').selectOption('Returned')
  await dialog.locator('#physical-destination').fill('TEST premature return')
  await dialog.locator('#physical-method').fill('TEST handover')
  await dialog.locator('#physical-trackingReference').fill('TEST-TOO-EARLY')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click()
  await expect(dialog.getByText(/precedes later recorded physical handling/)).toBeVisible()
  expect((await physical()).history.events).toHaveLength(handlingBefore.history.events.length)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('dialog').filter({ hasText: 'Discard the unsaved physical record?' }).getByRole('button', { name: 'Discard changes', exact: true }).click()
  await expect(dialog).toBeHidden()
  await accessible(page)
  const collision = await record(page, scene, 'Placed', 'TEST occupied position', { destination: scene.boxBarcode, position: 'A1' }, 1)
  expect(collision.status()).toBe(409)
  expect((await record(page, scene, 'Placed', 'TEST second tube', { destination: scene.boxBarcode, position: 'B1' }, 1)).ok()).toBe(true)

  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Register or move freezer box' }).click()
  await page.getByLabel('Box barcode', { exact: false }).fill(scene.boxBarcode)
  await page.getByRole('button', { name: 'Look up box' }).click()
  dialog = page.getByRole('dialog', { name: 'Move freezer box' })
  await regions(dialog)
  await dialog.getByLabel('Shelf / box location', { exact: false }).fill('TEST shelf 2')
  await dialog.getByLabel('Reason', { exact: false }).fill('TEST collective box relocation')
  await dialog.getByRole('button', { name: 'Record box move' }).click()
  await expect(dialog).toBeHidden()
  await expect(page.getByText(/TEST shelf 2/).first()).toBeVisible()
  expect((await physical(1)).box.shelf).toBe('TEST shelf 2')

  dialog = await openPhysical(page, 'RetentionSet')
  await dialog.locator('#physical-scannedBarcode').fill(scene.barcodes[0])
  await dialog.locator('#physical-retainUntilUtc').fill(new Date(Date.now() - 86400000).toISOString().slice(0, 10))
  await dialog.locator('#physical-reason').fill('TEST agreed Job terms')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click(); await expect(dialog).toBeHidden()
  dialog = await openPhysical(page, 'HoldPlaced')
  await dialog.locator('#physical-scannedBarcode').fill(scene.barcodes[0]); await dialog.locator('#physical-reason').fill('TEST incident preservation')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click(); await expect(dialog).toBeHidden()
  expect((await record(page, scene, 'Destroyed', 'TEST forbidden destruction', { method: 'TEST disposal' })).status()).toBe(409)
  await mount(page, theme, { mode: 'queue' })
  await expect(page.getByRole('link', { name: scene.barcodes[0] })).toBeVisible()
  await page.getByLabel('Show', { exact: true }).selectOption('holds')
  await expect(page.getByText('Hold: TEST incident preservation')).toBeVisible()
  await accessible(page)
  await page.screenshot({ path: info.outputPath('retention.png'), fullPage: true })
  expect((await record(page, scene, 'HoldReleased', 'TEST preservation released')).ok()).toBe(true)

  await mount(page, theme, { work: scene.workId, tube: scene.tubeIds[1] })
  dialog = await openPhysical(page, 'Returned')
  await dialog.locator('#physical-scannedBarcode').fill(scene.barcodes[1]); await dialog.locator('#physical-occurredAt').fill(new Date().toISOString().replace('Z', '+00:00'))
  await dialog.locator('#physical-method').fill('TEST sealed return'); await dialog.locator('#physical-destination').fill('TEST approved destination'); await dialog.locator('#physical-reason').fill('TEST return authorization')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click()
  await expect(dialog.getByText('Record the shipment or handover tracking reference.')).toBeVisible()
  await dialog.locator('#physical-trackingReference').fill('TEST-RETURN-TRACK')
  await dialog.locator('#physical-measuredQuantityText').fill('11')
  await dialog.getByRole('button', { name: 'Record confirmed action' }).click(); await expect(dialog).toBeHidden()
  await expect(page.getByText('No current laboratory storage', { exact: true })).toBeVisible()
  const returned = await physical(1); expect(returned.box).toBeNull()
  expect(returned.history.events.at(-1).kind).toBe('Returned')
  expect(JSON.parse(returned.history.events.at(-1).detailsJson)).toMatchObject({ before: { quantityText: '11' }, measuredQuantityText: '11', trackingReference: 'TEST-RETURN-TRACK' })
  const box = (await physical()).box
  expect((await page.request.post(`${host}${base}/storage-boxes`, { headers, data: { requestId: crypto.randomUUID(), barcode: scene.boxBarcode, room: box.room, freezer: box.freezer, rack: box.rack, shelf: 'TEST shelf 3', reason: 'TEST after second tube departure', version: box.version } })).ok()).toBe(true)
  expect((await physical(1)).history.boxMoves).toHaveLength(1)
  const departedLocation = (await physical(1)).history.locations[0]
  expect(departedLocation.location.shelf).toBe('TEST shelf 1')
  expect(departedLocation.sourceMoveId).toBeTruthy()
  await mount(page, theme, { work: scene.workId, tube: scene.tubeIds[1] })
  await page.getByText(/Physical and box movement history/).click()
  await expect(page.getByText('TEST room / TEST freezer / TEST rack / TEST shelf 1', { exact: true })).toBeVisible()
  await expect(page.getByText('No current laboratory storage', { exact: true })).toBeVisible()
  await accessible(page)
  await page.getByText('Registered location when placed', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('departed-location.png') })
  expect((await physical()).history.boxMoves).toHaveLength(2)
  expect((await record(page, scene, 'Destroyed', 'TEST authorized destruction', { method: 'TEST disposal', occurredAt: new Date().toISOString().replace('Z', '+00:00'), measuredQuantityText: '0', measuredQuantityUnit: 'uL' })).ok()).toBe(true)

  await mount(page, theme, { mode: 'prep', prep: scene.prepId })
  dialog = page.getByRole('dialog', { name: 'Record step: TEST timed step' })
  await dialog.getByRole('button', { name: 'Save step record' }).click()
  await expect(dialog.getByText(/Record actual start\/end in order/)).toBeVisible()
  async function timingFields(container: Locator, startAgo: number, endAgo: number, reason: string) {
    await container.getByLabel('Actual step start', { exact: true }).fill(minute(startAgo))
    await container.getByLabel('Actual step end', { exact: true }).fill(minute(endAgo))
    await container.getByRole('button', { name: 'Add participant' }).click()
    await container.getByLabel('Actual performer', { exact: false }).selectOption(scene.reviewerId)
    await container.getByLabel('Participant role in this step', { exact: false }).fill('TEST independent check')
    await container.getByLabel('Entry / participant attribution reason', { exact: false }).fill(reason)
  }
  await timingFields(dialog.locator('fieldset').first(), 10, 5, 'TEST common bench worksheet')
  const exceptions = dialog.locator('details').filter({ has: page.locator('summary', { hasText: 'Different performance for an individual tube' }) })
  await exceptions.locator('summary').first().click()
  await exceptions.getByLabel(/A2 · Use separate actual performance/).check()
  await timingFields(exceptions.locator('fieldset'), 8, 3, 'TEST tube-specific bench worksheet')
  await dialog.getByRole('checkbox', { name: /I performed this step according to/ }).check()
  await accessible(page)
  await page.screenshot({ path: info.outputPath('timing.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByRole('heading', { name: 'Step recorded' })).toBeVisible()
  const prep = (await (await page.request.get(`${host}${base}/preparation/batches/${scene.prepId}`, { headers })).json()).data
  const firstPerformance = prep.members[0].executions[0].evidence.records[0].performance
  const secondPerformance = prep.members[1].executions[0].evidence.records[0].performance
  expect(firstPerformance.verificationStatus).toBe('PendingReview'); expect(firstPerformance.participants).toEqual([{ userId: scene.reviewerId, role: 'TEST independent check' }])
  expect(firstPerformance.interval.startedAtUtc).not.toBe(secondPerformance.interval.startedAtUtc)

  const mixPath = `${base}/master-mixes/${scene.mixId}`
  let mix = (await (await page.request.get(`${host}${mixPath}`, { headers })).json()).data
  const mixStepReply = await page.request.post(`${host}${mixPath}/steps`, { headers, data: { requestId: crypto.randomUUID(), sequence: 0, notes: 'TEST actual mix', version: mix.version, input: { stepKey: 'mix', action: 'record', outcome: 'recorded', captures: { 'mix-equipment': scene.equipmentId }, operatorConfirmed: true, resourcesConfirmed: true, performance: { mode: 'now', personallyPerformed: true, lateEntryReason: 'TEST additional operator', interval: { startedAt: minute(10), completedAt: minute(5) }, participants: [{ userId: scene.reviewerId, role: 'TEST independent check' }] } } } })
  expect(mixStepReply.ok(), await mixStepReply.text()).toBe(true)
  mix = (await (await page.request.get(`${host}${mixPath}`, { headers })).json()).data
  expect((await page.request.post(`${host}${mixPath}/complete`, { headers, data: { preparedQuantity: 1, version: mix.version } })).status()).toBe(409)
  await mount(page, theme, { mode: 'mix', mix: scene.mixId })
  await page.getByRole('button', { name: 'Review performance', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Review recorded performance' })
  await dialog.getByLabel('Review evidence and reason', { exact: false }).fill('TEST self approval refused')
  await dialog.getByRole('button', { name: 'Save decision' }).click()
  await expect(dialog.getByText(/different supervisor must review/)).toBeVisible()
  actor = 'reviewer'
  await dialog.getByLabel('Review evidence and reason', { exact: false }).fill('TEST independently checked worksheet')
  await dialog.getByRole('button', { name: 'Save decision' }).click(); await expect(dialog).toBeHidden()
  await expect(page.getByText(/Approved by.*TEST independently checked worksheet/)).toBeVisible()
  expect((await page.request.post(`${host}${mixPath}/complete`, { headers, data: { preparedQuantity: 1, version: mix.version } })).ok()).toBe(true)
  actor = 'staff'
  await page.getByText('Frozen equipment conditions', { exact: true }).click()
  await expect(page.getByText(scene.equipmentAssetCode, { exact: true })).toBeVisible()
  await expect(page.getByText('TEST original equipment bench', { exact: true })).toBeVisible()
  await page.getByText('Frozen equipment conditions', { exact: true }).scrollIntoViewIfNeeded()
  await page.screenshot({ path: info.outputPath('frozen-equipment.png') })
  const frozenEquipment = mix.recordedSteps[0].evidence.equipmentUses[0].resourceSnapshotJson
  expect(JSON.parse(frozenEquipment).status).toBe('Active')
  expect((await page.request.post(`${host}${base}/equipment/${scene.equipmentId}/retire`, { headers, data: { version: scene.equipmentVersion, reason: 'TEST later retirement' } })).ok()).toBe(true)
  const mixAfterRetirement = (await (await page.request.get(`${host}${mixPath}`, { headers })).json()).data
  expect(mixAfterRetirement.recordedSteps[0].evidence.equipmentUses[0].resourceSnapshotJson).toBe(frozenEquipment)
  const currentPrep = (await (await page.request.get(`${host}${base}/preparation/batches/${scene.prepId}`, { headers })).json()).data
  const usedMix = (await (await page.request.get(`${host}${mixPath}`, { headers })).json()).data
  const useResponse = await page.request.post(`${host}${base}/preparation/batches/${scene.prepId}/commands`, { headers, data: { requestId: crypto.randomUUID(), version: currentPrep.version, action: 'step', step: {
    stageId: currentPrep.stages[0].id, stepKey: 'apply-mix', action: 'record', outcome: 'recorded', coveredMemberIds: currentPrep.members.map((m: { id: string }) => m.id), sharedCaptures: {}, tubes: [], sharedQcOutcome: null, reason: 'TEST actual shared mix exposure', coverageConfirmed: true, operatorConfirmed: true, resourcesConfirmed: true,
    resourceEntries: [{ fieldKey: 'mix-used', resourceId: scene.mixId, resourceVersion: usedMix.version, quantity: 0.5, quantityUnit: 'uL', mixBarcode: usedMix.barcode }], performance: { mode: 'now', personallyPerformed: true },
  } } })
  expect(useResponse.ok(), await useResponse.text()).toBe(true)
  await accessible(page)
  const performancePath = `${base}/work-orders/${scene.workId}/specimens/${scene.specimenIds[0]}/performance-reviews`
  const reviews = (await (await page.request.get(`${host}${performancePath}`, { headers })).json()).data
  const original = reviews.proposals[0]
  expect((await page.request.post(`${host}${performancePath}/${original.id}/decision`, { headers, data: { approved: true, reason: 'TEST self approval refused' } })).status()).toBeGreaterThanOrEqual(400)
  actor = 'reviewer'
  await mount(page, theme, { mode: 'history', work: scene.workId, specimen: scene.specimenIds[0] })
  await page.getByRole('button', { name: 'Review entry', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Review performer/time evidence' })
  await regions(dialog)
  await dialog.getByLabel('Review explanation', { exact: false }).fill('TEST independent sample worksheet review')
  await dialog.getByRole('button', { name: 'Save review decision' }).click(); await expect(dialog).toBeHidden()
  actor = 'staff'
  await mount(page, theme, { mode: 'history', work: scene.workId, specimen: scene.specimenIds[0] })
  const related = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Find related samples' }) })
  await related.locator(':scope > summary').click()
  await related.getByLabel('Reference type', { exact: true }).selectOption('equipment')
  await related.getByLabel('Exact reference', { exact: true }).fill(scene.equipmentAssetCode)
  await related.getByRole('button', { name: 'Find samples', exact: true }).click()
  await expect(related.getByRole('link')).toHaveCount(2)
  await expect(page.getByText('Storage Locations (2)', { exact: true })).toBeVisible()
  const locations = page.locator('details').filter({ has: page.locator(':scope > summary', { hasText: 'Storage Locations (2)' }) })
  await locations.locator(':scope > summary').click()
  await locations.locator('details > summary').first().click()
  await expect(locations.getByText('TEST shelf 1', { exact: true }).first()).toBeVisible()
  await accessible(page)
  await page.getByRole('button', { name: 'Propose performer/time change' }).click()
  dialog = page.getByRole('dialog', { name: 'Propose performer/time change' })
  const originalPerformance = JSON.parse(original.performanceJson)
  await dialog.locator('#proposal-performer').selectOption(originalPerformance.performedByUserId)
  await dialog.locator('#proposal-time').fill(minute().slice(0, 16))
  await expect(dialog.getByLabel('Actual step start', { exact: true })).not.toHaveValue('')
  await dialog.getByLabel('Actual step start', { exact: true }).fill(minute(11))
  await dialog.locator('#proposal-reason').fill('TEST reviewed interval correction')
  await dialog.getByRole('button', { name: 'Submit for review' }).click(); await expect(dialog).toBeHidden()
  actor = 'reviewer'
  await mount(page, theme, { mode: 'history', work: scene.workId, specimen: scene.specimenIds[0] })
  await page.getByRole('button', { name: 'Review entry', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Review performer/time evidence' })
  await dialog.getByLabel('Review explanation', { exact: false }).fill('TEST independently verified interval amendment')
  await dialog.getByRole('button', { name: 'Save review decision' }).click(); await expect(dialog).toBeHidden()
  const updatedReviews = (await (await page.request.get(`${host}${performancePath}`, { headers })).json()).data
  expect(updatedReviews.decisions).toHaveLength(2)
  expect(updatedReviews.proposals.find((p: { id: string }) => p.id === original.id).performanceJson).toBe(original.performanceJson)
  await accessible(page)
  await page.screenshot({ path: info.outputPath('reviewed-history.png'), fullPage: true })
  actor = 'staff'
  const reportPath = `${base}/work-orders/${scene.workId}/specimens/${scene.specimenIds[0]}/investigation/reports`
  const reportReply = await page.request.post(`${host}${reportPath}`, { headers, data: { requestId: crypto.randomUUID() } })
  expect(reportReply.ok(), await reportReply.text()).toBe(true)
  const report = (await reportReply.json()).data
  const bytes = await (await page.request.get(`${host}${reportPath}/${report.id}`, { headers })).body()
  expect(createHash('sha256').update(bytes).digest('hex')).toBe(report.sha256.toLowerCase())
  const text = bytes.toString(); expect(text).toContain('TEST authorized destruction'); expect(text).not.toContain(scene.barcodes[1])
  expect(errors).toEqual([])
})
