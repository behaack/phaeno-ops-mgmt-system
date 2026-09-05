import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { trialDetail, trialConfiguration } from '../src/test-helpers/trials'

test('Prospect reviews scope in the dialog, accepts it, and submits coded RNA with conflict recovery', async ({ page }, info) => {
  let current = structuredClone(trialDetail)
  let sampleAttempts = 0
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route('**/api/trials/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (route.request().method() === 'POST') {
      const payload = route.request().postDataJSON()
      if (path.endsWith('/accept')) {
        expect(payload).toMatchObject({ version: 4, scopeRevision: 1, ruoNoPhiConfirmed: true })
        current = { ...current, status: 'AwaitingSamples', canAccept: false, canSubmit: true, acceptedScopeRevision: 1, version: 5, submissionBlocker: null }
      }
      if (path.endsWith('/samples')) {
        sampleAttempts++
        if (sampleAttempts === 1) { current.version = 6; return route.fulfill({ status: 409, json: { success: false, error: { code: 'trial_version_conflict', message: 'This Trial changed. Reload it and review your entries before retrying.' } } }) }
        expect(payload).toMatchObject({ version: 6, samples: [{ reference: 'RNA-CODE-01', inputs: { organism: 'Synthetic organism' } }] })
        current = { ...current, version: 7, originalSamplesRemaining: 1, status: 'InProgress', samples: [{ id: 'sample-1', reference: 'RNA-CODE-01', biologicalSource: 'Synthetic research RNA', tubeCount: 2, status: 'Submitted', labMilestone: null, customerSafeSummary: null, labWorkOrderId: null, replacesSampleId: null, outcomeReason: null, submittedAtUtc: '2026-09-05T12:00:00Z' }] }
      }
    }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials').replace('Release receipt fixture', 'Trial project fixture')
  await page.route('**/e2e/fixtures/trials.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html')
  await expect(page.getByRole('heading', { name: 'RNA transcript evaluation' })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Review and accept scope' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('For Research Use Only. Not for use in diagnostic procedures.')).toBeVisible()
  await expect(dialog.getByText('FASTQ sequencing reads')).toBeVisible()
  await dialog.getByRole('checkbox').check()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Accept Trial scope' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Submit sample' }).click()
  await dialog.getByLabel('Coded sample reference', { exact: false }).fill('RNA-CODE-01')
  await dialog.getByLabel('Biological source', { exact: false }).fill('Synthetic research RNA')
  await dialog.getByLabel('Number of tubes', { exact: false }).fill('2')
  await dialog.getByLabel('Quantity*', { exact: true }).fill('100')
  await dialog.getByLabel('Quantity unit', { exact: false }).selectOption('ng')
  await dialog.getByLabel('Storage requirements', { exact: false }).fill('Frozen')
  await dialog.getByLabel('Research material safety declaration', { exact: false }).fill('Nonhazardous research material')
  await dialog.getByLabel('organism', { exact: false }).fill('Synthetic organism')
  await dialog.getByRole('checkbox').check()
  await dialog.getByRole('button', { name: 'Submit sample', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('This Trial changed')
  await dialog.getByRole('button', { name: 'Reload current Trial; keep my entries' }).click()
  await expect(dialog.getByRole('status')).toBeVisible()
  await expect(dialog.getByLabel('Coded sample reference', { exact: false })).toHaveValue('RNA-CODE-01')
  await dialog.getByRole('button', { name: 'Submit sample', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('RNA-CODE-01', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-project.png'), fullPage: true })
})


test('Phaeno scopes a Trial using the existing PSeq catalog and explicit material terms', async ({ page }, info) => {
  const scope = { ...trialDetail.scope!, internalValues: { ...trialDetail.scope!, workflowVersionId: 'workflow-1', estimatedRetailValue: 2000, anticipatedInternalCost: 500 } }
  const current = { ...trialDetail, isStaff: true, canManage: true, canAccept: false, status: 'UnderReview', scope, scopeHistory: [scope] }
  const config = { ...trialConfiguration, analyses: scope.analyses.map(value => ({ id: value.id, name: value.name, version: value.version })), workflows: [{ id: 'workflow-1', name: 'Approved PSeq workflow', version: 3 }], deliverables: scope.deliverables, defaultDeliverableIds: ['deliverable-1'] }
  let submitted = false
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route('**/api/trials/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: config } })
    if (path.endsWith('/candidates')) return route.fulfill({ json: { success: true, data: [] } })
    if (route.request().method() === 'POST') {
      expect(route.request().postDataJSON()).toMatchObject({ version: 4, workflowVersionId: 'workflow-1', analysisIds: ['analysis-1'], deliverableIds: ['deliverable-1'], sampleAllowance: 2, materialDisposition: 'Destroy', reason: 'Reviewed initial PSeq scope' })
      submitted = true
    }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html?view=scope', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html?view=scope')
  await expect(page.getByRole('heading', { name: 'Trial scope' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /PSeq transcript analysis/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /FASTQ sequencing reads/ })).toBeChecked()
  await expect(page.getByLabel('Return destination', { exact: false })).toHaveCount(0)
  await page.getByLabel('Planned disposition', { exact: false }).selectOption('Return')
  await expect(page.getByLabel('Return destination', { exact: false })).toBeVisible()
  await page.getByLabel('Planned disposition', { exact: false }).selectOption('Destroy')
  await page.getByLabel('Reason for this scope revision', { exact: false }).fill('Reviewed initial PSeq scope')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('trial-scope.png'), fullPage: true })
  await page.getByRole('button', { name: 'Submit scope for approval' }).click()
  await expect(page.getByRole('heading', { name: 'RNA transcript evaluation' })).toBeVisible()
  expect(submitted).toBe(true); expect(errors).toEqual([])
})
