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
  await page.getByRole('button', { name: 'Review and accept scope' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('For Research Use Only. Not for use in diagnostic procedures.')).toBeVisible()
  await expect(dialog.getByText('FASTQ sequencing reads')).toBeVisible()
  await dialog.getByRole('checkbox').check()
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await dialog.getByRole('button', { name: 'Accept Trial scope' }).click()
  await expect(dialog).toHaveCount(0)
  await page.getByRole('button', { name: 'Submit samples' }).click()
  await dialog.getByLabel('Coded sample reference', { exact: false }).fill('RNA-CODE-01')
  await dialog.getByLabel('Biological source', { exact: false }).fill('Synthetic research RNA')
  await dialog.getByLabel('Number of tubes', { exact: false }).fill('2')
  await dialog.getByLabel('Quantity (ng)', { exact: false }).fill('100')
  await dialog.getByLabel('Storage requirements', { exact: false }).fill('Frozen')
  await dialog.getByLabel('Research material safety declaration', { exact: false }).fill('Nonhazardous research material')
  await dialog.getByLabel('Organism', { exact: false }).fill('Synthetic organism')
  await dialog.getByRole('button', { name: 'Add another sample' }).click()
  const second = dialog.getByRole('group', { name: 'Sample 2', exact: true })
  await second.getByLabel('Coded sample reference', { exact: false }).fill('RNA-CODE-02')
  await second.getByLabel('Biological source', { exact: false }).fill('Second research RNA')
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
      expect(route.request().postDataJSON()).toMatchObject({ version: 5, workflowVersionId: 'workflow-1', analysisIds: ['analysis-1'], deliverableIds: ['deliverable-1'], sampleAllowance: 2, materialDisposition: 'Destroy', reason: 'Reviewed initial PSeq scope' })
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
        current = { ...current, version: 9, approvedScopeRevision: 2, scope: { ...current.scope!, revision: 2, termsVersion: 'trial-terms-v2', terms: 'Amended Trial terms: return residual RNA under the agreed arrangements.', sampleAllowance: 3 } }
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
  await page.goto('/e2e/fixtures/trials.html'); await page.getByRole('button', { name: 'Review and accept scope' }).click()
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

test('Company handoff opens the exact eligible request even outside configuration choices', async ({ page }) => {
  let requestRead = false; let created = false
  await page.route(url => url.pathname === '/api/trials' || url.pathname.startsWith('/api/trials/'), async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (url.pathname.endsWith('/requests')) {
      expect(url.searchParams.get('requestId')).toBe('handoff-251'); expect(url.searchParams.get('companyId')).toBe('company-1'); requestRead = true
      return route.fulfill({ json: { success: true, data: { items: [{ id: 'handoff-251', companyName: 'Synthetic Research', opportunityName: 'RNA Evaluation', summary: 'Selected Company request' }], page: 0, pageSize: 25, total: 1 } } })
    }
    if (url.pathname.endsWith('/candidates')) return route.fulfill({ json: { success: true, data: [] } })
    if (route.request().method() === 'POST') { expect(route.request().postDataJSON()).toEqual({ crmHandoffId: 'handoff-251' }); created = true; return route.fulfill({ json: { success: true, data: { ...trialDetail, isStaff: true } } }) }
    return route.fulfill({ json: { success: true, data: url.pathname === '/api/trials' ? [] : { ...trialDetail, isStaff: true } } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html?view=request&requestId=handoff-251&fromCompanyId=company-1')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('combobox', { name: /CRM Trial request/ })).toHaveValue('Synthetic Research · RNA Evaluation · Selected Company request')
  expect(requestRead).toBe(true); await dialog.getByRole('button', { name: 'Start Trial', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'RNA transcript evaluation' })).toBeVisible(); expect(created).toBe(true)
})

test('Trial request choices handle Escape from a focused option before offering to discard the draft', async ({ page }, info) => {
  if (info.project.name === 'mobile-chrome') await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const requests = [
    { id: 'handoff-1', companyName: 'Synthetic Research', opportunityName: 'First RNA evaluation', summary: 'First eligible request' },
    { id: 'handoff-2', companyName: 'Synthetic Research', opportunityName: 'Second RNA evaluation', summary: 'Second eligible request' },
  ]
  const label = (index: number) => `${requests[index].companyName} · ${requests[index].opportunityName} · ${requests[index].summary}`
  let submissions = 0
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.route(url => url.pathname === '/api/trials' || url.pathname.startsWith('/api/trials/'), async route => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/configuration')) return route.fulfill({ json: { success: true, data: trialConfiguration } })
    if (url.pathname.endsWith('/requests')) return route.fulfill({ json: { success: true, data: { items: requests, page: 0, pageSize: 25, total: requests.length } } })
    if (route.request().method() === 'POST') submissions++
    return route.fulfill({ json: { success: true, data: [] } })
  })
  const html = (await readFile(new URL('./fixtures/release-receipt.html', import.meta.url), 'utf8')).replaceAll('release-receipt', 'trials')
  await page.route('**/e2e/fixtures/trials.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.goto('/e2e/fixtures/trials.html?view=request')
  await page.getByRole('button', { name: 'Start Trial', exact: true }).click()
  const dialog = page.getByRole('dialog')
  const input = dialog.getByRole('combobox', { name: /CRM Trial request/ })
  await expect(dialog.getByText('2 eligible requests.', { exact: true })).toBeVisible()
  await input.focus(); await input.press('ArrowDown'); await input.press('Enter')
  await expect(input).toHaveValue(label(1)); await expect(input).toBeFocused()
  await expect(dialog.getByRole('listbox')).toHaveCount(0)

  let confirmations = 0
  let discard = false
  page.on('dialog', async prompt => {
    expect(prompt.type()).toBe('confirm'); expect(prompt.message()).toBe('Discard the unsaved Trial changes?')
    confirmations++
    if (discard) await prompt.accept(); else await prompt.dismiss()
  })
  await input.press('ArrowDown'); await input.press('Tab')
  await expect(dialog.getByRole('option', { name: label(1), exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await expect(input).toBeFocused(); await expect(input).toHaveValue(label(1))
  await expect(input).toHaveAttribute('aria-expanded', 'false')
  await expect(dialog).toBeVisible(); expect(confirmations).toBe(0)
  expect((await new AxeBuilder({ page }).include('[role="dialog"]').withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([])
  await page.screenshot({ path: info.outputPath('option-escape-draft-preserved.png') })
  await page.keyboard.press('Escape')
  await expect.poll(() => confirmations).toBe(1)
  await expect(dialog).toBeVisible(); await expect(input).toHaveValue(label(1))

  await input.fill('Synthetic Research')
  await dialog.getByRole('option', { name: label(0), exact: true }).click()
  await expect(input).toHaveValue(label(0)); await expect(dialog.getByRole('listbox')).toHaveCount(0)
  await expect(dialog.getByRole('button', { name: 'Start Trial', exact: true })).toBeEnabled()
  discard = true
  await input.press('Escape')
  await expect(dialog).toHaveCount(0); expect(confirmations).toBe(2)
  expect(submissions).toBe(0); expect(errors).toEqual([])
})
