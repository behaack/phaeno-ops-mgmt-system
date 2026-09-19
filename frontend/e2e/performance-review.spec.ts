import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import type { PerformanceDecision, PerformanceProposal, PerformanceProposalInput } from '../src/api/lab-performance-review'

test('performance proposals retain original evidence and need another supervisor', async ({ page }) => {
  let actor = 'recorder'
  let submission: PerformanceProposalInput | undefined
  const proposals: PerformanceProposal[] = []
  const decisions: PerformanceDecision[] = []
  const original = { performedByUserId: 'recorder', performedAtUtc: '2026-01-15T12:00:00Z', entryMode: 'now', precision: 'server', utcOffsetMinutes: 0 }
  const html = await readFile(new URL('./fixtures/sample-investigation.html', import.meta.url), 'utf8')
  await page.route('**/e2e/fixtures/sample-investigation.html*', route => route.fulfill({ contentType: 'text/html', body: html }))
  await page.route('**/api/platform/lab-operations/**', async route => {
    const path = new URL(route.request().url()).pathname
    const reply = (data: unknown) => route.fulfill({ json: { success: true, data, error: null } })
    if (path.endsWith('/performance-performers')) return reply([{ id: 'actual', name: 'Actual Operator', isActive: true }])
    if (path.endsWith('/performance-reviews')) {
      if (route.request().method() === 'POST') {
        submission = route.request().postDataJSON() as PerformanceProposalInput
        proposals.push({ id: submission.requestId, labProtocolExecutionId: submission.executionId, stepRecordId: submission.stepRecordId,
          basedOnProposalId: submission.basedOnProposalId, requestedByUserId: actor, requestedAtUtc: '2026-09-18T12:00:00Z', kind: 'Amendment', reason: submission.reason,
          originalPerformanceJson: JSON.stringify(original), performanceJson: JSON.stringify({ ...original, performedByUserId: submission.performedByUserId, performedAtUtc: submission.performedAt, verificationStatus: 'PendingReview' }) })
        return reply(proposals[0])
      }
      return reply({ canPropose: true, canReview: true, actorId: actor, proposals, decisions })
    }
    if (path.endsWith('/decision')) {
      const body = route.request().postDataJSON() as { approved: boolean; reason: string }
      decisions.push({ id: proposals[0].id, reviewedByUserId: actor, reviewedAtUtc: '2026-09-18T12:30:00Z', ...body })
      return reply(decisions[0])
    }
    if (path.endsWith('/reports')) return reply([])
    if (path.endsWith('/scientific-evidence')) return reply({ workOrderId: 'test-job', specimenId: 'test-sample', canRecord: false, outputs: [], analyses: [] })
    if (path.endsWith('/events')) return reply({ through: '2026-09-18T12:00:00Z', rows: [], next: null })
    return reply({ capturedAtUtc: '2026-09-18T12:00:00Z', limitedSections: [], coverage: [], evidence: {
      people: [{ id: 'recorder', name: 'Entry Author' }, { id: 'supervisor', name: 'Independent Supervisor' }, { id: 'actual', name: 'Actual Operator' }],
      executions: [{ id: 'execution', status: 'Completed', capturedResultsJson: JSON.stringify({ records: [{ id: 'step-record', stepKey: 'prepare-library', action: 'record', outcome: 'recorded', recordedByUserId: 'recorder', recordedAtUtc: '2026-01-15T12:00:00Z', performance: original, captures: {} }] }) }] } })
  })
  await page.goto('/e2e/fixtures/sample-investigation.html')
  await page.getByRole('button', { name: 'Propose performer/time change' }).click()
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page.getByText('Explain the proposed change.')).toBeVisible()
  await page.getByLabel('Actual performer', { exact: false }).selectOption('actual')
  await page.getByLabel('Actual date and time', { exact: false }).fill('2020-01-15T12:30')
  await page.getByLabel('Reason and supporting evidence', { exact: false }).fill('Signed bench worksheet')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Submit for review' }).click()
  await expect(page.getByText('Awaiting independent review')).toBeVisible()
  expect(submission).toMatchObject({ executionId: 'execution', stepRecordId: 'step-record', performedByUserId: 'actual', basedOnProposalId: null })
  expect(submission?.performedAt).toMatch(/^2020-01-15T12:30[+-]\d\d:\d\d$/)
  await expect(page.getByRole('button', { name: 'Review entry' })).toBeDisabled()
  actor = 'supervisor'
  await page.reload()
  await page.getByRole('button', { name: 'Review entry' }).click()
  await page.getByRole('button', { name: 'Save review decision' }).click()
  await expect(page.getByText('Explain the review decision.')).toBeVisible()
  await page.getByLabel('Review explanation', { exact: false }).fill('Compared with signed bench worksheet')
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([])
  await page.getByRole('button', { name: 'Save review decision' }).click()
  await expect(page.getByText('Approved', { exact: true })).toBeVisible()
  expect(decisions[0]).toMatchObject({ reviewedByUserId: 'supervisor', approved: true })
  await page.getByText('Previous and proposed evidence', { exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Previous attribution' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
