import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import type { SequencingTubeCommand, SequencingTubeWorkspace } from '../src/api/lab-material-transfers'

test('an interrupted physical transfer survives reload and retries without another debit', async ({ page }, info) => {
  page.on('dialog', dialog => dialog.accept())
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const html = await readFile(new URL('./fixtures/lab-material-transfers.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/lab-material-transfers.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  const source = { id: 'source', labSpecimenId: 'sample', parentContainerId: 'original', kind: 'Library', barcode: 'LIBRARY-123', barcodeSource: 'Manufacturer' as const, externalBarcodeReferenceId: null, label: 'Library', labelPrintCount: 0, location: 'Freezer A', quantity: 100, quantityUnit: 'µL', status: 'Available', retainUntilUtc: null, version: 4 }
  const data: SequencingTubeWorkspace = { batchId: 'test-batch', batchVersion: 3, batchStatus: 'Draft', hasSendout: false, members: [{ id: 'member', labWorkOrderId: 'work', labLibraryId: 'library', libraryKey: source.barcode, source, sequencingTube: { ...source, id: 'destination', parentContainerId: source.id, kind: 'Sequencing', barcode: 'SEQUENCING-123', quantity: null, quantityUnit: null, version: 1 }, transfer: null }] }
  const submitted: SequencingTubeCommand[] = []
  let debits = 0
  await page.route('**/api/platform/lab-operations/batches/test-batch/**', async route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: { success: true, data } })
    const command = route.request().postDataJSON() as SequencingTubeCommand
    submitted.push(command)
    if (submitted.length === 1) {
      debits++
      source.quantity = 0; source.status = 'Consumed'; source.version++
      data.batchVersion++
      data.members[0].sequencingTube!.quantity = Number(command.quantityText ?? command.quantity)
      data.members[0].transfer = { id: 'transfer', sourceContainerId: source.id, sourceBarcode: source.barcode,
        destinationContainerId: 'destination', destinationBarcode: 'SEQUENCING-123', quantity: Number(command.quantityText ?? command.quantity), quantityText: command.quantityText, quantityUnit: command.quantityUnit!,
        sourceQuantityBefore: 100, sourceQuantityAfter: 0, sourceQuantityBasis: 'LaboratoryMeasured', exhaustedOverride: true, balanceAdjustmentQuantity: 80,
        performedByUserId: 'operator', performedAtUtc: '2026-09-23T10:00:00Z', recordedByUserId: 'operator', recordedAtUtc: '2026-09-23T10:00:00Z' }
      return route.abort('failed')
    }
    expect(command).toEqual(submitted[0])
    return route.fulfill({ json: { success: true, data } })
  })
  await page.goto('/e2e/fixtures/lab-material-transfers.html')
  await page.getByRole('button', { name: 'Record transfer', exact: true }).click()
  await page.getByLabel('Scan source library barcode', { exact: false }).fill('*library-123*')
  await page.getByLabel('Scan sequencing tube barcode', { exact: false }).fill('*sequencing-123*')
  await page.getByLabel('Actual amount transferred', { exact: false }).fill('20')
  await page.getByRole('checkbox', { name: /Material exhausted/ }).check()
  await page.getByRole('checkbox', { name: /I personally performed/ }).check()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Record transfer', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retry same command' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('button', { name: 'Retry same command' })).toBeVisible()
  await expect(page.getByLabel('Actual amount transferred', { exact: false })).toHaveValue('20')
  await page.getByRole('button', { name: 'Retry same command' }).click()
  await expect(page.getByText(/Physical transfer recorded/)).toBeVisible()
  await expect(page.getByText('Transferred 20 µL', { exact: false })).toBeVisible()
  await expect(page.getByText('Tube assigned. Physical transfer has not been recorded.')).toHaveCount(0)
  expect(submitted).toHaveLength(2)
  expect(debits).toBe(1)
  expect(submitted[1]).toMatchObject({ sourceVersion: 4, batchVersion: 3, quantityText: '20', materialExhausted: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('recovered-material-transfer.png'), fullPage: true })
})
