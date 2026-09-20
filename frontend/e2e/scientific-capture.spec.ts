import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

for (const theme of ['light', 'dark']) test(`scientific capture, linked correction, exact inputs and upload attribution (${theme})`, async ({ page }, testInfo) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  const html = await readFile(new URL('./fixtures/scientific-capture.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/scientific-capture.html*', r => r.fulfill({ contentType: 'text/html', body: html }))
  const data = { workOrderId: 'test-job', specimenId: 'test-sample', accessionNumber: 'ACC-1', canRecord: true, canManualUpload: true, governedResults: false, orderId: 'order', submittedSampleId: 'sample', libraries: [{ id: 'library', libraryKey: 'LIB-1', barcode: 'TUBE-1', status: 'QcPassed' }], outputs: [] as Record<string, unknown>[], analyses: [] as Record<string, unknown>[], inputs: [] as Record<string, unknown>[] }
  const files: Record<string, unknown>[] = []; const uploads = new Map<string, Record<string, unknown>>()
  let failedOnce = false; const attempts: Record<string, unknown>[] = []; let upload = ''
  await page.route('**/api/platform/lab-service-orders/**', async r => { upload = r.request().postData() ?? ''; await r.fulfill({ json: { success: true, data: { id: 'file' } } }) })
  await page.route('**/api/platform/lab-operations/**', async r => {
    const path = new URL(r.request().url()).pathname
    const reply = (value: unknown) => r.fulfill({ json: { success: true, data: value } })
    if (path.endsWith('/scientific-evidence')) return reply(data)
    if (path.endsWith('/scientific-evidence/files')) return reply({ maximumBytes: 100 * 1024 * 1024, files })
    if (path.endsWith('/uploads')) {
      const body = r.request().postDataJSON(); uploads.set(body.id, body)
      return reply({ id: body.id, receivedBytes: 0, chunkBytes: 4 * 1024 * 1024, expiresAtUtc: '2099-01-01T00:00:00Z', file: null })
    }
    if (path.includes('/chunks/')) return reply({ receivedBytes: r.request().postDataBuffer()?.length ?? 0 })
    if (path.endsWith('/complete')) {
      const id = path.split('/').at(-2)!; const body = uploads.get(id)!
      const file = { ...body, externalFileReference: `poms-file:${id}`, recordedAtUtc: '2026-09-20T00:00:00Z' }; files.push(file)
      return reply({ file })
    }
    if (path.endsWith('/sendouts')) return reply([{ id: 'submission', providerName: 'Sequencer', providerReference: 'SHIP-1', status: 'Shipped' }])
    const body = r.request().postDataJSON() as Record<string, unknown>; attempts.push(body)
    if (!failedOnce) { failedOnce = true; return r.fulfill({ status: 503, json: { success: false, error: { message: 'Temporary recording failure. Retry the same evidence.' } } }) }
    const row = { ...body, labSpecimenAttemptId: 'attempt-1', scientificEvidenceJson: JSON.stringify(body.scientificEvidence), recordedAtUtc: '2026-09-19T10:00:00Z' }
    if (path.endsWith('/sequencing-outputs')) data.outputs.push(row)
    else { data.analyses.push({ ...row, requirementsSnapshotJson: '{"version":1}' }); data.inputs.push(...(body.sequencingOutputIds as string[]).map(id => ({ labAnalysisRunId: body.id, labSequencingOutputId: id }))) }
    return reply(row)
  })
  await page.goto(`/e2e/fixtures/scientific-capture.html?theme=${theme}`)
  await page.getByRole('link', { name: 'Record sequencing output' }).click()
  await page.getByLabel('Library preparation', { exact: false }).selectOption('ExistingLibrary')
  await page.getByLabel('Library / tube').selectOption('library')
  await page.getByLabel('Sequencing submission').selectOption('submission')
  await page.getByLabel('Provider / producing team').fill('Sequencer')
  await page.getByLabel('Actual run reference').fill('RUN-1')
  await page.getByLabel('Run started', { exact: false }).first().fill('2025-01-01T08:00')
  await page.getByLabel('Run completed', { exact: false }).first().fill('2025-01-01T09:00')
  await page.getByLabel('Sample mapping / index / lane reference').fill('lane-1:index-A')
  await page.getByLabel('Sequencing file', { exact: false }).setInputFiles({ name: 'reads-v1.fastq', mimeType: 'application/octet-stream', buffer: Buffer.from('TEST ONLY reads') })
  await expect(page.getByText('reads-v1.fastq', { exact: true })).toBeVisible()
  await page.getByLabel('QC summary').fill('Passed')
  await page.getByRole('button', { name: 'Add QC metric' }).click()
  await page.getByLabel('Metric name 1').fill('yield'); await page.getByLabel('Metric value 1').fill('2.5'); await page.getByLabel('Metric unit 1').fill('Gb')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  page.once('dialog', d => d.dismiss()); await page.getByRole('button', { name: 'Cancel', exact: true }).click(); await expect(page.getByLabel('Actual run reference')).toHaveValue('RUN-1')
  await page.getByRole('button', { name: 'Save evidence' }).click()
  await expect(page.getByText('Temporary recording failure. Retry the same evidence.')).toBeVisible()
  await page.getByRole('button', { name: 'Save evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Sequencing output', exact: true })).toBeVisible()
  expect(attempts[0].id).toBe(attempts[1].id)
  expect(attempts[1].sequencingRunNumber).toBe(1)
  expect(attempts[1].libraryPreparationChoice).toBe('ExistingLibrary')
  await page.getByRole('button', { name: 'Record correction' }).click()
  await page.getByLabel('Correction reason').fill('Corrected external version')
  await page.getByLabel('Sequencing file', { exact: false }).setInputFiles({ name: 'reads-v2.fastq', mimeType: 'application/octet-stream', buffer: Buffer.from('TEST ONLY corrected reads') })
  await expect(page.getByText('reads-v2.fastq', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save evidence' }).click()
  await expect(page.getByRole('link', { name: 'View preceding record' })).toBeVisible()
  expect(attempts[2].correctsOutputId).toBe(attempts[0].id)
  await page.getByRole('link', { name: 'Back to sample ACC-1' }).click()
  await page.getByRole('link', { name: 'Record analysis run' }).click()
  await page.getByLabel('reads-v2.fastq · RUN-1').check()
  await page.getByLabel('Input role for reads-v2.fastq').fill('reads')
  await page.getByLabel('Provider / producing team').fill('Analysis team'); await page.getByLabel('Actual run reference').fill('ANALYSIS-1')
  await page.getByLabel('Run started', { exact: false }).first().fill('2025-01-01T10:00'); await page.getByLabel('Run completed', { exact: false }).first().fill('2025-01-01T11:00')
  for (const label of ['Software', 'Settings', 'Reference data']) { await page.getByLabel(`${label} is not applicable`, { exact: true }).check(); await page.getByLabel(`Why ${label.toLowerCase()} is not applicable`).fill('TEST ONLY approved manual procedure') }
  await page.getByRole('button', { name: 'Save evidence' }).click()
  await expect(page.getByRole('heading', { name: 'Analysis run', exact: true })).toBeVisible()
  expect(attempts[3].requirementsVersion).toBe(1); expect(attempts[3].sequencingOutputIds).toEqual([attempts[2].id])
  await page.getByRole('button', { name: 'Actions', exact: true }).click(); await page.getByRole('menuitem', { name: 'Upload result' }).click()
  await page.getByLabel('Result file', { exact: false }).setInputFiles({ name: 'result.txt', mimeType: 'text/plain', buffer: Buffer.from('TEST result') })
  for (const label of ['Analysis profile', 'Pipeline version', 'Provenance', 'QC status']) await page.getByLabel(label, { exact: false }).fill('TEST')
  await page.getByLabel('Entire file belongs to this sample').check()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Upload result', exact: true }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible(); expect(upload).toContain(String(attempts[3].id)); expect(upload).toContain('name="resultLocator"\r\n\r\n*')
  await page.getByRole('button', { name: 'Actions', exact: true }).click(); await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Actions', exact: true })).toBeFocused()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  await page.screenshot({ path: `../artifacts/sample-investigation-20260919/scientific-${testInfo.project.name}-${theme}.png`, fullPage: true })
  expect(errors).toEqual([])
})

test('read-only capture permissions and failed sources stay explicit', async ({ page }) => {
  const html = await readFile(new URL('./fixtures/scientific-capture.html', import.meta.url), 'utf8'); await page.route('**/e2e/fixtures/scientific-capture.html*', r => r.fulfill({ contentType: 'text/html', body: html }))
  let fail = true
  await page.route('**/api/platform/lab-operations/**', r => fail ? r.fulfill({ status: 503, json: { success: false, error: { message: 'Scientific source unavailable.' } } }) : r.fulfill({ json: { success: true, data: { workOrderId: 'test-job', specimenId: 'test-sample', canRecord: false, outputs: [], analyses: [] } } }))
  await page.goto('/e2e/fixtures/scientific-capture.html'); await expect(page.getByText('Scientific source unavailable.')).toBeVisible(); fail = false
  await page.getByRole('button', { name: 'Reload scientific records' }).click(); await expect(page.getByRole('heading', { name: 'Sequencing outputs (0)' })).toBeVisible(); await expect(page.getByRole('link', { name: /Record/ })).toHaveCount(0)
})
