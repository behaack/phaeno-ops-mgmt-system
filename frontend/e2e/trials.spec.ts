import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { trialDetail, trialConfiguration } from '../src/test-helpers/trials'

test('Prospect reviews scope in the dialog, accepts it, and submits coded RNA with conflict recovery', async ({ page }, info) => {
  let current = structuredClone(trialDetail)
  let sampleAttempts = 0
  let waitingForReload = false
  let finishReload!: () => void
  const reloaded = new Promise<void>(resolve => { finishReload = resolve })
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
        if (sampleAttempts === 1) { current.version = 6; waitingForReload = true; return route.fulfill({ status: 409, json: { success: false, error: { code: 'trial_version_conflict', message: 'This Trial changed. Reload it and review your entries before retrying.' } } }) }
        expect(payload).toMatchObject({ version: 6, samples: [{ reference: 'RNA-CODE-01', quantityUnit: 'ng', inputs: { organism: 'Synthetic organism' } }, { reference: 'RNA-CODE-02', quantityUnit: 'ng' }] })
        current = { ...current, version: 7, originalSamplesRemaining: 0, canSubmit: false, status: 'InProgress', samples: payload.samples.map((sample: { reference: string; biologicalSource: string; tubeCount: number }, index: number) => ({ id: `sample-${index + 1}`, ...sample, status: 'Submitted', labMilestone: null, customerSafeSummary: null, labWorkOrderId: null, replacesSampleId: null, outcomeReason: null, submittedAtUtc: '2026-09-05T12:00:00Z' })) }
      }
    }
    if (route.request().method() === 'GET' && waitingForReload) { await reloaded; waitingForReload = false }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials').replace('Release receipt fixture', 'Trial project fixture')
  await page.route('**/e2e/fixtures/trials.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html')
  await expect(page.getByRole('heading', { name: 'RNA transcript evaluation' })).toBeVisible()
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await trialAction(page, 'Review and accept scope')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('For Research Use Only. Not for use in diagnostic procedures.')).toBeVisible()
  await expect(dialog.getByText('FASTQ sequencing reads')).toBeVisible()
  await dialog.getByRole('checkbox').check()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Accept Trial scope' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Submit samples' }).click()
  await dialog.getByLabel('Coded sample reference', { exact: false }).fill('RNA-CODE-01')
  await dialog.getByLabel('Biological source', { exact: false }).selectOption('Research RNA')
  await dialog.getByLabel('Number of tubes', { exact: false }).fill('2')
  await dialog.getByLabel('Quantity (ng)', { exact: false }).fill('100')
  await dialog.getByLabel('Storage requirements', { exact: false }).fill('Frozen')
  await dialog.getByLabel('Research material safety declaration', { exact: false }).fill('Nonhazardous research material')
  await dialog.getByLabel('Organism', { exact: false }).fill('Synthetic organism')
  await dialog.getByRole('button', { name: 'Add another sample' }).click()
  const second = dialog.getByRole('group', { name: 'Sample 2', exact: true })
  await second.getByLabel('Coded sample reference', { exact: false }).fill('RNA-CODE-02')
  await second.getByLabel('Biological source', { exact: false }).selectOption('Second research RNA')
  await second.getByLabel('Quantity (ng)', { exact: false }).fill('120')
  await second.getByLabel('Storage requirements', { exact: false }).fill('Frozen')
  await second.getByLabel('Research material safety declaration', { exact: false }).fill('Nonhazardous research material')
  await second.getByLabel('Organism', { exact: false }).fill('Synthetic organism')
  page.once('dialog', dialog => dialog.dismiss())
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(second.getByLabel('Coded sample reference', { exact: false })).toHaveValue('RNA-CODE-02')
  await dialog.getByRole('checkbox').check()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-sample-roster.png'), fullPage: true })
  await dialog.getByRole('button', { name: 'Submit 2 samples', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('This Trial changed')
  await dialog.getByRole('button', { name: 'Reload current Trial; keep my entries' }).click()
  await expect(dialog.getByRole('status')).toContainText('Reloading current Trial and sample requirements')
  await expect(dialog.getByRole('button', { name: 'Reloading…', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Submit 2 samples', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Add another sample', exact: true })).toBeDisabled()
  await expect(second.getByLabel('Coded sample reference', { exact: false })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0)
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible(); expect(sampleAttempts).toBe(1)
  await page.keyboard.press('Tab')
  await expect(dialog.getByRole('form', { name: 'Trial sample roster' })).toBeFocused()
  const body = dialog.locator('[data-slot="dialog-body"]')
  await body.evaluate(element => { element.scrollTop = 0 })
  await page.keyboard.press('PageDown')
  await expect.poll(() => body.evaluate(element => element.scrollTop)).toBeGreaterThan(0)
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-sample-reloading.png'), fullPage: true })
  finishReload()
  await expect(dialog.getByRole('status')).toContainText('sample requirements were reloaded')
  await expect(dialog.getByRole('group', { name: 'Sample 1', exact: true }).getByLabel('Coded sample reference', { exact: false })).toHaveValue('RNA-CODE-01')
  await dialog.getByRole('button', { name: 'Submit 2 samples', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('RNA-CODE-01', { exact: true })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(errors).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-project.png'), fullPage: true })
})


test('Phaeno scopes a Trial using the existing PSeq catalog and explicit material terms', async ({ page }, info) => {
  const scope = { ...trialDetail.scope!, internalValues: { ...trialDetail.scope!, workflowVersionId: 'workflow-1', estimatedRetailValue: 2000, anticipatedInternalCost: 500 } }
  let current = { ...trialDetail, isStaff: true, canManage: true, canAccept: false, status: 'UnderReview', scope, scopeHistory: [scope] }
  const config = { ...trialConfiguration, analyses: scope.analyses.map(value => ({ id: value.id, name: value.name, version: value.version })), workflows: [{ id: 'workflow-1', name: 'Approved PSeq workflow', version: 3 }], deliverables: scope.deliverables, defaultDeliverableIds: ['deliverable-1'] }
  let submitted = false
  let attempts = 0; let waitingForReload = false; let finishReload!: () => void
  const reloaded = new Promise<void>(resolve => { finishReload = resolve })
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route('**/api/trials/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: config } })
    if (path.endsWith('/candidates')) return route.fulfill({ json: { success: true, data: [] } })
    if (route.request().method() === 'POST') {
      attempts++
      if (attempts === 1) { current = { ...current, version: 5 }; waitingForReload = true; return route.fulfill({ status: 409, json: { success: false, error: { code: 'trial_version_conflict', message: 'The Trial scope changed.' } } }) }
      expect(route.request().postDataJSON()).toMatchObject({ version: 5, workflowVersionId: 'workflow-1', analysisIds: ['analysis-1'], deliverableIds: ['deliverable-1'], sampleTypeId: 'rna', sources: [{ biologicalSource: 'Research RNA', specimenCount: 1 }, { biologicalSource: 'Second research RNA', specimenCount: 1 }], materialDisposition: 'Destroy', reason: 'Reviewed initial PSeq scope' })
      expect(route.request().postDataJSON()).not.toHaveProperty('sampleAllowance')
      submitted = true
    }
    if (route.request().method() === 'GET' && waitingForReload) { await reloaded; waitingForReload = false }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html?view=scope', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html?view=scope')
  await expect(page.getByRole('heading', { name: 'Amend Trial scope' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /PSeq transcript analysis/ })).toBeChecked()
  await expect(page.getByRole('checkbox', { name: /FASTQ sequencing reads/ })).toBeChecked()
  await expect(page.getByLabel('Return destination', { exact: false })).toHaveCount(0)
  await page.getByLabel('Planned disposition', { exact: false }).selectOption('Return')
  await expect(page.getByLabel('Return destination', { exact: false })).toBeVisible()
  await page.getByLabel('Planned disposition', { exact: false }).selectOption('Destroy')
  await page.getByLabel('Reason for this scope revision', { exact: false }).fill('Reviewed initial PSeq scope')
  page.once('dialog', dialog => dialog.dismiss())
  await page.getByRole('link', { name: /Back to TR-RESEARCH-01/ }).click()
  await expect(page.getByLabel('Reason for this scope revision', { exact: false })).toHaveValue('Reviewed initial PSeq scope')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('trial-scope.png'), fullPage: true })
  await page.getByRole('button', { name: 'Submit scope for approval' }).click()
  await expect(page.getByRole('alert')).toContainText('The Trial scope changed')
  await page.getByRole('button', { name: 'Reload current Trial; keep my entries' }).click()
  await expect(page.getByRole('status')).toContainText('Reloading current Trial and configuration')
  await expect(page.getByRole('button', { name: 'Reloading…', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Submit scope for approval' })).toBeDisabled()
  await expect(page.getByLabel('Reason for this scope revision', { exact: false })).toBeDisabled()
  await expect(page.getByText('Back to TR-RESEARCH-01', { exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.getByText('Cancel', { exact: true })).toHaveAttribute('aria-disabled', 'true')
  await page.getByText('Back to TR-RESEARCH-01', { exact: true }).dispatchEvent('click')
  await expect(page.getByRole('heading', { name: 'Amend Trial scope' })).toBeVisible(); expect(attempts).toBe(1)
  finishReload()
  await expect(page.getByRole('status')).toContainText('The current Trial and configuration were reloaded')
  await expect(page.getByLabel('Reason for this scope revision', { exact: false })).toHaveValue('Reviewed initial PSeq scope')
  await page.getByRole('button', { name: 'Submit scope for approval' }).click()
  await expect(page.getByRole('heading', { name: 'RNA transcript evaluation' })).toBeVisible()
  expect(submitted).toBe(true); expect(errors).toEqual([])
})

for (const role of ['Platform administrator', 'Commercial leadership']) {
  test(`${role} submits a complete scope with approval and no separate decision`, async ({ page }, info) => {
    const scope = { ...trialDetail.scope!, internalValues: { ...trialDetail.scope!, workflowVersionId: 'workflow-1', estimatedRetailValue: 2000, anticipatedInternalCost: 500 } }
    let current = { ...trialDetail, isStaff: true, canManage: true, canApproveScopeOnSubmission: true, canAccept: false, status: 'UnderReview', scope }
    const config = { ...trialConfiguration, analyses: scope.analyses, workflows: [{ id: 'workflow-1', name: 'Approved PSeq workflow', version: 3 }], deliverables: scope.deliverables }
    const writes: string[] = []; const errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
    await page.route('**/api/trials/**', async route => {
      const path = new URL(route.request().url()).pathname
      if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: config } })
      if (path.endsWith('/candidates')) return route.fulfill({ json: { success: true, data: [] } })
      if (route.request().method() === 'POST') {
        writes.push(path)
        expect(path).toBe('/api/trials/trial-1/scope')
        expect(route.request().postDataJSON()).toMatchObject({ version: 4, reason: 'Approved scope on submission' })
        current = { ...current, status: 'AwaitingAcceptance', version: 5 }
      }
      return route.fulfill({ json: { success: true, data: current } })
    })
    const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
    await page.route('**/e2e/fixtures/trials.html**', route => route.fulfill({ contentType: 'text/html', body: html }))
    await page.goto('/e2e/fixtures/trials.html?view=scope')
    await expect(page.getByRole('button', { name: 'Approve and submit scope' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Submit scope for approval' })).toHaveCount(0)
    await page.getByLabel('Reason for this scope revision', { exact: false }).fill('Approved scope on submission')
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
    await page.screenshot({ path: info.outputPath('trial-direct-approval.png'), fullPage: true })
    await page.getByRole('button', { name: 'Approve and submit scope' }).click()
    await expect(page.getByText('Awaiting Acceptance · No charge · Research use only', { exact: true })).toBeVisible()
    expect(writes).toEqual(['/api/trials/trial-1/scope']); expect(errors).toEqual([])
  })
}

test('Changed approved scope reload refreshes visible terms and requires renewed acceptance after a failed refresh', async ({ page }) => {
  let current = structuredClone(trialDetail); let attempts = 0; let failNextRead = false
  let finishFailedReload!: () => void
  const failedReload = new Promise<void>(resolve => { finishFailedReload = resolve })
  await page.route('**/api/trials/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (route.request().method() === 'POST') {
      attempts++
      if (attempts === 1) {
        current = { ...current, version: 9, approvedScopeRevision: 2, scope: { ...current.scope!, revision: 2, termsVersion: 'trial-terms-v2', terms: 'Amended Trial terms: return residual RNA under the agreed arrangements.', sampleAllowance: 3, sources: [{ biologicalSource: 'Research RNA', specimenCount: 2 }, { biologicalSource: 'Second research RNA', specimenCount: 1 }] } }
        failNextRead = true
        return route.fulfill({ status: 409, json: { success: false, error: { code: 'trial_version_conflict', message: 'The approved scope changed.' } } })
      }
      expect(route.request().postDataJSON()).toMatchObject({ version: 9, scopeRevision: 2, termsVersion: 'trial-terms-v2', ruoNoPhiConfirmed: true })
      current = { ...current, canAccept: false, acceptedScopeRevision: 2, version: 10 }
    } else if (failNextRead) {
      failNextRead = false
      await failedReload
      return route.fulfill({ status: 503, json: { success: false, error: { code: 'temporary_failure', message: 'Refresh temporarily unavailable.' } } })
    }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html'); await trialAction(page, 'Review and accept scope')
  const dialog = page.getByRole('dialog'); await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Accept Trial scope' }).click()
  await expect(dialog.getByRole('alert')).toContainText('The approved scope changed')
  await dialog.getByRole('button', { name: 'Reload current Trial; keep my entries' }).click()
  await expect(dialog.getByRole('status')).toContainText('Reloading current Trial')
  await expect(dialog.getByRole('button', { name: 'Reloading…', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Accept Trial scope', exact: true })).toBeDisabled()
  await expect(dialog.getByRole('checkbox')).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toBeDisabled()
  await page.keyboard.press('Escape'); await expect(dialog).toBeVisible(); expect(attempts).toBe(1)
  await page.getByText('Back to Trial projects', { exact: true }).dispatchEvent('click')
  await expect(dialog).toBeVisible()
  finishFailedReload()
  await expect(dialog.getByRole('alert')).toContainText('Refresh temporarily unavailable'); await expect(dialog.getByRole('checkbox')).toBeChecked()
  await expect(dialog.getByRole('checkbox')).toBeEnabled()
  await dialog.getByRole('button', { name: 'Reload current Trial; keep my entries' }).click()
  await expect(dialog.getByText('Amended Trial terms: return residual RNA under the agreed arrangements.')).toBeVisible()
  await expect(dialog.getByRole('checkbox')).not.toBeChecked(); await dialog.getByRole('button', { name: 'Accept Trial scope' }).click()
  await expect(dialog.getByRole('alert')).toContainText('is required'); expect(attempts).toBe(1)
  await dialog.getByRole('checkbox').check(); await dialog.getByRole('button', { name: 'Accept Trial scope' }).click(); await expect(dialog).toHaveCount(0); expect(attempts).toBe(2)
})

test('Trial results show superseded and closed history and refresh availability after download failure', async ({ page }) => {
  const file = { id: 'file-1', fileName: 'research.fastq', fileKind: 'FASTQ', sizeBytes: 100, sha256: 'abc' }
  const retention = { snapshotId: 'receipt-1', releasedAtUtc: '2026-08-01T00:00:00Z', warningAtUtc: '2026-08-20T00:00:00Z', standardDeletionAtUtc: '2026-08-31T00:00:00Z', potentialFinalDeletionAtUtc: '2026-09-03T00:00:00Z', graceActivatedAtUtc: null, downloadAccessClosedAtUtc: '2026-09-03T00:00:00Z', byteDeletedAtUtc: null, deletionOutcome: null }
  const release = { id: 'release-current', releaseVersion: 3, scopeRevision: 1, isCompletePackage: true, isWithdrawn: false, releasedAtUtc: '2026-09-05T00:00:00Z', retentionSnapshotId: null, retention: null, isDownloadAvailable: true, downloadUnavailableReason: null, files: [file] }
  let current = { ...trialDetail, canAccept: false, status: 'Completed', releases: [release, { ...release, id: 'release-closed', releaseVersion: 2, isDownloadAvailable: false, retention, downloadUnavailableReason: 'The download period has ended. Contact Phaeno for an authorized reissue.' }, { ...release, id: 'release-partial', releaseVersion: 1, isCompletePackage: false, isDownloadAvailable: false, downloadUnavailableReason: 'Superseded by the complete Trial package; retained as release history.' }] }
  await page.route('**/api/trials/**', async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (path.endsWith('/download')) {
      current = { ...current, releases: current.releases.map(value => value.id === release.id ? { ...value, isDownloadAvailable: false, downloadUnavailableReason: 'The download period has ended. Contact Phaeno for an authorized reissue.' } : value) }
      return route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'trial_retention_closed', message: 'The download period changed. Refresh this Trial.' } }) })
    }
    return route.fulfill({ json: { success: true, data: current } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html')
  await expect(page.getByText('Superseded by the complete Trial package; retained as release history.')).toBeVisible()
  await expect(page.getByText('Downloads closed', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Download package', exact: true })).toHaveCount(1)
  await page.getByRole('button', { name: 'Download package', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('The download period changed. Refresh this Trial.')
  await expect(page.getByRole('button', { name: 'Download package', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Refresh results and access' })).toBeVisible()
})


test('Business Development creates a Trial directly with Company search and required Department, then leadership decides scope', async ({ page }, info) => {
  let current = { ...trialDetail, isStaff: true, canManage: true, canAccept: false, status: 'UnderReview', approvalDomains: ['Commercial'] }
  const writes: string[] = []
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, async route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/crm/companies')) return route.fulfill({ json: { success: true, data: { items: [{ id: 'company-1', name: 'Synthetic Research', domainName: 'research.example.test' }], totalCount: 1, page: 1, pageSize: 20 } } })
    if (path.endsWith('/departments/opportunity-choices')) return route.fulfill({ json: { success: true, data: [{ id: 'research', name: 'Research' }, { id: 'oncology', name: 'Oncology' }] } })
    if (path.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (route.request().method() === 'POST') {
      writes.push(path)
      const payload = route.request().postDataJSON()
      if (path.endsWith('/trials')) {
        expect(payload).toMatchObject({ companyId: 'company-1', departmentId: 'oncology', name: 'Oncology RNA evaluation', objective: 'Evaluate transcript research outputs.', sampleTypeId: 'rna', sources: [{ biologicalSource: 'Human PBMC', specimenCount: 6 }, { biologicalSource: 'Mouse liver', specimenCount: 4 }] })
        expect(payload.submissionOpensAtUtc).toBe('2026-10-10T00:00:00.000Z')
        expect(payload.submissionClosesAtUtc).toBe('2026-10-21T00:00:00.000Z')
        expect(route.request().headers()['idempotency-key']).toBeTruthy()
      } else if (path.endsWith('/decisions')) {
        expect(payload).toMatchObject({ domain: 'Commercial', decision: 'Approve' })
        current = { ...current, status: 'AwaitingAcceptance' }
      } else throw new Error('Unexpected write: ' + path)
      return route.fulfill({ json: { success: true, data: current } })
    }
    return route.fulfill({ json: { success: true, data: path.endsWith('/trials') ? [] : path.endsWith('/candidates') ? [] : current } })
  })
  const fixtureHtml = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html**', route => route.fulfill({ contentType: 'text/html', body: fixtureHtml }))
  await page.goto('/e2e/fixtures/trials.html?view=request')
  await expect(page.getByRole('heading', { name: 'Trial projects', exact: true })).toBeVisible({ timeout: 10000 })
  await expect(page.getByRole('link', { name: 'Trial configuration', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Create Trial', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Create Trial project' })
  await dialog.getByRole('textbox', { name: 'Trial name', exact: true }).fill('Oncology RNA evaluation')
  await dialog.getByRole('textbox', { name: 'Objective / Description', exact: true }).fill('Evaluate transcript research outputs.')
  await dialog.getByRole('combobox', { name: 'Sample type', exact: true }).selectOption('rna')
  await dialog.getByRole('textbox', { name: 'Biological source', exact: true }).fill('Human PBMC')
  await dialog.getByRole('spinbutton', { name: 'Samples', exact: true }).fill('6')
  await dialog.getByRole('button', { name: 'Add source' }).click()
  await dialog.getByRole('textbox', { name: 'Biological source', exact: true }).nth(1).fill('Mouse liver')
  await dialog.getByRole('spinbutton', { name: 'Samples', exact: true }).nth(1).fill('4')
  await expect(dialog.getByText('Total samples: 10', { exact: true })).toBeVisible()
  await dialog.getByLabel('Submission opens', { exact: false }).fill('2026-10-10')
  await dialog.getByLabel('Submission closes', { exact: false }).fill('2026-10-20')
  await expect(dialog.getByLabel('Submission opens', { exact: false })).toHaveAttribute('type', 'date')
  await expect(dialog.getByLabel('Submission closes', { exact: false })).toHaveAttribute('type', 'date')
  const company = dialog.getByRole('combobox', { name: 'Company' })
  await company.fill('Synthetic')
  const companyOption = page.getByRole('option', { name: /Synthetic Research/ })
  await expect(companyOption).toBeVisible()
  expect(await companyOption.evaluate(element => {
    const box = element.getBoundingClientRect()
    return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  })).toBe(true)
  expect(await dialog.getByRole('combobox', { name: 'Company' }).evaluate(element => {
    const box = element.getBoundingClientRect()
    const body = element.closest('[data-slot="dialog-body"]')!.getBoundingClientRect()
    return box.top >= body.top && box.bottom <= body.bottom
  })).toBe(true)
  await page.screenshot({ path: info.outputPath('trial-company-search-results.png') })
  await companyOption.click()
  await expect(dialog.getByRole('combobox', { name: 'Department' })).toHaveValue('')
  await dialog.getByRole('button', { name: 'Create Trial project' }).click()
  await expect(dialog.getByText('Select the Department this Trial belongs to.')).toBeVisible()
  expect(writes).toEqual([])
  await dialog.getByRole('combobox', { name: 'Department' }).selectOption('oncology')
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-direct-company-department.png') })
  await dialog.getByLabel('Submission closes', { exact: false }).scrollIntoViewIfNeeded()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  await page.screenshot({ path: info.outputPath('trial-creation-dates.png') })
  await dialog.getByRole('button', { name: 'Create Trial project' }).click()
  const actions = page.getByRole('button', { name: 'Actions', exact: true })
  await expect(actions.locator('[data-slot="action-menu-indicator"]')).toHaveCount(1)
  await actions.focus(); await actions.press('Enter')
  await page.getByRole('menuitem', { name: 'Record decision' }).click()
  const decision = page.getByRole('dialog', { name: 'Commercial leadership decision' })
  await decision.getByRole('combobox', { name: 'Decision' }).fill('Approve')
  await page.getByRole('option', { name: 'Approve', exact: true }).click()
  await decision.getByRole('textbox', { name: /Reason/ }).fill('Leadership approved the submitted evaluation.')
  await decision.getByRole('button', { name: 'Save', exact: true }).click()
  await expect(decision).toHaveCount(0)
  await expect(page.getByText('Awaiting Acceptance · No charge · Research use only', { exact: true })).toBeVisible()
  await expect(actions).toBeFocused()
  expect(writes).toEqual(['/api/trials', '/api/trials/trial-1/decisions'])
})

test('Trial Company choices handle Escape and a Portal confirmation preserves or discards the draft', async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, route => {
    const path = new URL(route.request().url()).pathname
    if (path.endsWith('/crm/companies')) return route.fulfill({ json: { success: true, data: { items: [{ id: 'company-1', name: 'Synthetic Research', domainName: null }] } } })
    if (path.endsWith('/departments/opportunity-choices')) return route.fulfill({ json: { success: true, data: [{ id: 'research', name: 'Research' }] } })
    return route.fulfill({ json: { success: true, data: path.endsWith('/configuration') ? trialConfiguration : [] } })
  })
  const fixtureHtml = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html**', route => route.fulfill({ contentType: 'text/html', body: fixtureHtml }))
  await page.goto('/e2e/fixtures/trials.html?view=request')
  await expect(page.getByRole('heading', { name: 'Trial projects', exact: true })).toBeVisible({ timeout: 10000 })
  const opener = page.getByRole('button', { name: 'Create Trial', exact: true })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Create Trial project' })
  const input = dialog.getByRole('combobox', { name: 'Company' })
  await input.fill('Synthetic')
  await expect(page.getByRole('option', { name: 'Synthetic Research', exact: true })).toBeVisible()
  await input.press('Escape')
  await expect(page.getByRole('listbox')).toHaveCount(0); await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  const discard = page.getByRole('dialog', { name: 'Discard unsaved Trial project?' })
  await expect(discard.locator('[data-slot="dialog-body"]')).toContainText('No Trial has been created.')
  await expect(discard.getByRole('button', { name: 'Keep editing' })).toBeFocused()
  await discard.getByRole('button', { name: 'Keep editing' }).click()
  await expect(input).toHaveValue('Synthetic')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.screenshot({ path: info.outputPath('trial-discard-dark.png') })
  await discard.getByRole('button', { name: 'Discard changes' }).click()
  await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused()
})

test('Trial staff reach configuration in Order settings without broader order configuration access', async ({ page }, info) => {
  const errors: string[] = []
  const apiPaths: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.route(/^https:\/\/127\.0\.0\.1:\d+\/api\//, route => {
    const path = new URL(route.request().url()).pathname
    apiPaths.push(path)
    expect(route.request().method()).toBe('GET')
    return route.fulfill({ json: { success: true, data: path.endsWith('/configuration') ? { ...trialConfiguration, canAssignPrimary: true } : [] } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html**', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html?view=configuration')
  await expect(page.getByRole('heading', { name: 'Order Settings', exact: true, level: 1 })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Trial configuration', exact: true })).toBeVisible()
  const sidebarTrigger = page.getByRole('button', { name: /^Open Order Settings navigation/ })
  if (info.project.name === 'mobile-chrome') await sidebarTrigger.click()
  await expect(page.getByRole('button', { name: /^Trial configuration/ })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('button', { name: /^Service catalog/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^Quote & workflow/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Trial configuration/ }).click()
  await expect(page.getByRole('main')).toHaveCount(1)
  await expect(page.getByRole('link', { name: 'Back to Trial projects' })).toHaveCount(0)
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
  expect(apiPaths).not.toContain('/api/platform/order-configuration')
  expect(errors).toEqual([])
  await page.screenshot({ path: info.outputPath('trial-order-settings.png'), fullPage: true })
})

async function trialAction(page: import('@playwright/test').Page, name: string) {
  const button = page.getByRole('button', { name, exact: true })
  await button.or(page.getByRole('button', { name: 'Actions', exact: true })).first().waitFor({ state: 'visible' })
  if (await button.count()) { await button.click(); return }
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  await page.getByRole('menuitem', { name, exact: true }).click()
}
