import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { labExecutionFixture, executionId, recordingUserId } from '../src/test-helpers/lab-execution'
import type { LabExecutionStepInput } from '../src/api/lab-operations'

async function setup(page: Page, conflict = false) {
  const data = labExecutionFixture()
  const bodies: LabExecutionStepInput[] = []
  let conflictSent = false
  const envelope = (value: unknown) => ({ success: true, data: value, error: null })
  function refresh() {
    data.completionBlockers = []
    const active = ['InProgress', 'Blocked'].includes(data.execution.status)
    let previousReady = true
    for (const step of data.steps) {
      const latest = step.records.at(-1)
      const ready = Boolean(latest && (latest.outcome === 'skipped' || !step.definition.qcGate || latest.qcOutcome === 'pass'))
      step.canRecord = active && previousReady && !latest
      step.canCorrect = active && previousReady && Boolean(latest)
      step.canRepeat = step.canCorrect && step.definition.repeatable
      step.completionBlocker = ready ? null : `${step.definition.name}: ${latest?.qcOutcome === 'hold' ? 'QC is hold; resolve it before continuing.' : 'record the required evidence.'}`
      step.actionBlocker = previousReady ? null : 'Complete the preceding step first.'
      if (step.completionBlocker) data.completionBlockers.push(step.completionBlocker)
      previousReady &&= ready
    }
    data.canAbandon = !['Completed', 'Abandoned'].includes(data.execution.status)
  }
  const html = await readFile(new URL('./fixtures/lab-execution.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/lab-execution.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.route('**/api/platform/lab-operations**', async route => {
    const url = new URL(route.request().url())
    const body = route.request().method() === 'POST' ? route.request().postDataJSON() : undefined
    if (url.pathname.endsWith('/steps')) {
      bodies.push(body)
      if (conflict && !conflictSent) {
        conflictSent = true
        data.execution.version += 1
        return route.fulfill({ status: 409, json: { success: false, data: null, error: { code: 'concurrency_conflict', message: 'The execution changed.' } } })
      }
      data.steps.find(step => step.definition.key === body.stepKey)!.records.push({ ...body, id: `record-${bodies.length}`, recordedByUserId: recordingUserId, recordedAtUtc: '2026-09-05T12:00:00Z' })
      data.execution.version += 1
      data.execution.status = body.qcOutcome === 'hold' ? 'Blocked' : 'InProgress'
    }
    if (url.pathname.endsWith('/transition')) {
      data.execution.status = body.action === 'start' ? 'InProgress' : body.action === 'complete' ? 'Completed' : 'Abandoned'
      data.execution.version += 1
      data.execution.completedAtUtc = body.action === 'complete' ? '2026-09-05T13:00:00Z' : null
    }
    refresh()
    if (url.pathname.includes('/executions/')) return route.fulfill({ json: envelope(url.pathname.endsWith('/transition') ? data.execution : data) })
    if (url.pathname.includes('/work-orders/')) return route.fulfill({ json: envelope({ workOrder: { id: data.workOrderId, commercialOrderNumber: 'TRAINING-JOB', status: 'Processing', version: 1, labServiceWorkflowVersionId: 'workflow', serviceKey: 'pseq-lab-service' }, specimens: [], containers: [], executions: [data.execution], libraries: [], exceptions: [], scientificApprovals: [] }) })
    return route.fulfill({ json: envelope({ workOrders: [], protocols: [], serviceWorkflows: [], marketedServices: [], materialLots: [], materialDefinitions: [], suppliers: [], storageLocations: [], equipment: [], batches: [], roleAssignments: [] }) })
  })
  await page.goto('/e2e/fixtures/lab-execution.html')
  await page.getByRole('link', { name: `Execution ${executionId.slice(0, 8)}` }).click()
  await expect(page.getByRole('heading', { name: 'Synthetic library preparation', exact: true })).toBeVisible()
  return { data, bodies }
}

test('guided execution preserves typed evidence, QC hold, correction, skip, and completion', async ({ page }, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const { bodies } = await setup(page)
  await page.getByRole('button', { name: 'Start execution', exact: true }).click()
  await page.getByRole('button', { name: 'Record Verify sample identity' }).click()
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByText('Source barcode is required.')).toBeVisible()
  await page.getByLabel('Source barcode', { exact: false }).fill('TRAINING-001')
  await page.getByLabel('I performed this step', { exact: false }).check()
  await page.keyboard.press('Tab')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.getByRole('link', { name: 'Back to laboratory job' }).click()
  await page.getByRole('link', { name: `Execution ${executionId.slice(0, 8)}` }).click()
  await expect(page.getByText('Source barcode:', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Record Review library QC' }).click()
  await page.getByLabel('Library concentration', { exact: false }).fill('0')
  await page.getByLabel('Measurement date', { exact: false }).fill('2026-09-05')
  await page.getByLabel('Measurement method', { exact: false }).selectOption('Fluorometry')
  await page.getByLabel('QC file reference', { exact: false }).fill('training-qc-001')
  await page.getByLabel('QC outcome', { exact: false }).selectOption('hold')
  await page.getByLabel('Reason or condition assessment', { exact: false }).fill('Waiting for supervisor review')
  await page.screenshot({ path: info.outputPath('typed-step.png'), fullPage: true })
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByRole('button', { name: 'Complete execution', exact: true })).toBeDisabled()
  await expect(page.getByText('QC is hold', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Correct Review library QC' }).click()
  await expect(page.getByLabel('Library concentration', { exact: false })).toHaveValue('0')
  await page.getByLabel('QC outcome', { exact: false }).selectOption('pass')
  await page.getByLabel('Reason or condition assessment', { exact: false }).fill('Corrected recorded QC after supervisor review')
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByText('Step history (2)', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Record Additional review' }).click()
  await page.getByLabel('Step decision', { exact: false }).selectOption('skipped')
  await page.getByLabel('Reason or condition assessment', { exact: false }).fill('Supervisor did not request additional review')
  await page.getByRole('button', { name: 'Save step record' }).click()
  await page.getByRole('button', { name: 'Complete execution', exact: true }).click()
  await page.getByRole('button', { name: 'Confirm completion' }).click()
  await expect(page.getByText('This execution and its evidence are locked.', { exact: false })).toBeVisible()
  expect(bodies[1].captures.concentration).toBe(0)
  expect(bodies[1].captures.measured).toBe('2026-09-05')
  expect(bodies[3]).toMatchObject({ outcome: 'skipped', captures: {}, operatorConfirmed: false, qcOutcome: null })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('execution-completed.png'), fullPage: true })
  await page.getByRole('link', { name: 'Back to laboratory job' }).click()
  await expect(page.getByRole('tab', { name: 'Execution', exact: true })).toHaveAttribute('data-state', 'active')
  expect(errors).toEqual([])
})

test('stale step write reloads its version and preserves entered evidence', async ({ page }) => {
  const { bodies } = await setup(page, true)
  await page.getByRole('button', { name: 'Start execution', exact: true }).click()
  await page.getByRole('button', { name: 'Record Verify sample identity' }).click()
  await page.getByLabel('Source barcode', { exact: false }).fill('KEEP-THIS-VALUE')
  await page.getByLabel('I performed this step', { exact: false }).check()
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByText('Your entered values are preserved.', { exact: false })).toBeVisible()
  await expect(page.getByLabel('Source barcode', { exact: false })).toHaveValue('KEEP-THIS-VALUE')
  await page.getByRole('button', { name: 'Save step record' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect(bodies[1].version).toBe(bodies[0].version + 1)
  expect(bodies[1].captures).toEqual(bodies[0].captures)
})

test('keyboard dismissal protects unsaved evidence and restores focus', async ({ page }) => {
  await setup(page)
  await page.getByRole('button', { name: 'Start execution', exact: true }).click()
  const recordButton = page.getByRole('button', { name: 'Record Verify sample identity' })
  await recordButton.focus()
  await page.keyboard.press('Enter')
  await page.getByLabel('Source barcode', { exact: false }).fill('UNSAVED')
  page.once('dialog', dialog => dialog.dismiss())
  await page.keyboard.press('Escape')
  await expect(page.getByLabel('Source barcode', { exact: false })).toHaveValue('UNSAVED')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(recordButton).toBeFocused()
})
