import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

for (const theme of ['light', 'dark']) test(`sample investigation distinguishes unknown lineage, supports reports and handles source failure (${theme})`, async ({ page }, testInfo) => {
  let fail = false
  let attachmentAvailable = false
  const runtimeErrors: string[] = []
  page.on('pageerror', error => runtimeErrors.push(error.message))
  page.on('console', message => { if (message.text().includes('same key')) runtimeErrors.push(message.text()) })
  let reports: object[] = []
  const html = await readFile(new URL('./fixtures/sample-investigation.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/sample-investigation.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.route('**/api/platform/lab-operations/**', async route => {
    const path = new URL(route.request().url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { success: true, data, error: null } })
    if (path.endsWith('/attachments/preparation-record/qcReport')) return attachmentAvailable
      ? route.fulfill({ contentType: 'application/pdf', body: '%PDF-TEST ONLY' })
      : route.fulfill({ status: 409, json: { success: false, error: { message: 'The stored report does not match its recorded checksum. Investigate the original attachment.' } } })
    if (path.endsWith('/reports')) {
      if (route.request().method() === 'POST') reports = [{ id: 'report-1', generatedAtUtc: '2026-09-18T12:00:00Z', sha256: 'A'.repeat(64), formatVersion: 1 }]
      return reply(route.request().method() === 'POST' ? reports[0] : reports)
    }
    if (path.endsWith('/lineage')) return reply({ resultId: 'legacy-result', coverage: 'LegacyUnknown', sourceBarcode: null, analysisRun: null, inputs: [], artifacts: [] })
    if (path.endsWith('/related-samples')) return reply([])
    if (path.endsWith('/performance-reviews')) return reply({ canPropose: false, canReview: false, actorId: 'test-actor', proposals: [], decisions: [] })
    if (path.endsWith('/scientific-evidence')) return reply({ workOrderId: 'test-job', specimenId: 'test-sample', canRecord: false, outputs: [], analyses: [] })
    if (path.endsWith('/events')) return reply({ through: '2026-09-18T12:00:00Z', rows: [], next: null })
    if (fail) return route.fulfill({ status: 503, json: { success: false, error: { message: 'The evidence source is unavailable.' } } })
    return reply({ formatVersion: 1, workOrderId: 'test-job', specimenId: 'test-sample', capturedAtUtc: '2026-09-18T12:00:00Z', limitedSections: [],
      coverage: [{ area: 'Result attribution', status: 'Legacy unknown', explanation: 'The source tube was not captured for the historical result.' }],
      evidence: { results: [{ id: 'legacy-result', packageVersion: 1 }], executions: [], materials: [], equipment: [],
        attachments: [{ id: 'preparation-record', role: 'qcReport', fileName: 'qc.pdf', scanStatus: 'Clean', recordedAtUtc: '2026-09-18T11:00:00Z', sha256: 'B'.repeat(64) }] } })
  })
  await page.goto(`/e2e/fixtures/sample-investigation.html?theme=${theme}`)
  await expect(page.getByRole('heading', { name: 'Sample history' })).toBeVisible()
  await page.getByLabel('Result version').selectOption('legacy-result')
  await expect(page.getByText('The exact source tube was not recorded for this result.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Save investigation report' }).click()
  await expect(page.getByRole('status')).toHaveText('Investigation report saved.')
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Download readable report' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Actions', exact: true })).toBeFocused()
  await page.getByText('Find related samples', { exact: true }).click()
  await page.getByLabel('Exact reference').fill('test-tube')
  await page.getByRole('button', { name: 'Find samples' }).click()
  await expect(page.getByText('No matching samples in this organization.')).toBeVisible()
  await page.getByText('Supporting reports (1)', { exact: true }).click()
  await page.getByRole('button', { name: 'Download qc.pdf' }).click()
  await expect(page.getByText('The stored report does not match its recorded checksum.', { exact: false })).toBeVisible()
  attachmentAvailable = true
  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download qc.pdf' }).click()
  expect((await downloadEvent).suggestedFilename()).toBe('qc.pdf')
  await expect(page.getByText('Report verified; download started.')).toBeVisible()
  await expect(page.getByText('The stored report does not match its recorded checksum.', { exact: false })).not.toBeVisible()
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: `../artifacts/sample-investigation-20260919/investigation-${testInfo.project.name}-${theme}.png`, fullPage: true })
  await page.setViewportSize({ width: 320, height: 800 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  fail = true
  await page.getByRole('button', { name: 'Reload evidence' }).click()
  await expect(page.getByText('The evidence source is unavailable.')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save investigation report' })).toBeDisabled()
  expect(runtimeErrors).toEqual([])
})
