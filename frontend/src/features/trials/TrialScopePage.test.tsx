import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TrialScopeDraftValues } from '#/api/trials'
import { trialConfiguration, trialDetail } from '#/test-helpers/trials'
import { TrialScopePage } from './TrialScopePage'

const mocks = vi.hoisted(() => ({ queries: vi.fn(), mutation: vi.fn(), blocker: vi.fn(), navigate: vi.fn() }))
vi.mock('./trial-hooks', () => ({ useTrialQueries: mocks.queries, useTrialMutation: () => ({ mutateAsync: mocks.mutation }) }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate, useBlocker: mocks.blocker,
  Link: ({ children, disabled, className }: ComponentProps<'a'> & { disabled?: boolean }) => <a href={disabled ? undefined : '#trial'} aria-disabled={disabled || undefined} className={className}>{children}</a>,
}))

beforeEach(() => { mocks.queries.mockReset(); mocks.mutation.mockReset(); mocks.blocker.mockClear(); mocks.navigate.mockReset() })

const draftValues: TrialScopeDraftValues = {
  departmentId: null, name: 'Early research idea', objective: '', sampleAllowance: null, submissionOpensAtUtc: null,
  submissionClosesAtUtc: null, workflowVersionId: null, analysisIds: [], deliverableIds: [], submissionInstructions: '',
  successCriteria: '', estimatedRetailValue: null, anticipatedInternalCost: null, residualRetentionDays: null,
  materialDisposition: 'Return', returnDestination: '', returnHandling: '', returnShippingPayer: '', terms: '', reason: '',
}

describe('Trial scope drafts', () => {
  it('saves incomplete work separately while approval submission requires complete scope', async () => {
    const trial = { ...trialDetail, isStaff: true, status: 'Requested', scope: null, scopeHistory: [] }
    mocks.queries.mockReturnValue({ staff: true, detail: { data: trial }, config: { data: trialConfiguration } })
    mocks.mutation.mockResolvedValue({ ...trial, version: 5 })
    render(<TrialScopePage trialId={trial.id} />)
    fireEvent.change(screen.getByLabelText('Trial name*'), { target: { value: 'Early research idea' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit scope for approval' }))
    await screen.findAllByText('Required for approval.')
    expect(mocks.mutation).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledOnce())
    expect(mocks.mutation.mock.calls[0][0]).toMatchObject({ path: '/trial-1/scope/draft', payload: { version: trial.version, values: { name: 'Early research idea', sampleAllowance: null, submissionOpensAtUtc: null, submissionClosesAtUtc: null } } })
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledOnce())
  })

  it('resumes saved empty fields, retains entries on failed save and uses the reviewed version after background refresh', async () => {
    const trial = { ...trialDetail, isStaff: true, scopeDraft: { values: draftValues, savedByUserId: 'staff-1', savedByName: 'Trial Operator', savedAtUtc: '2026-09-07T12:00:00Z' } }
    const query = { staff: true, detail: { data: trial }, config: { data: trialConfiguration } }
    mocks.queries.mockReturnValue(query); mocks.mutation.mockRejectedValue(new Error('Trial changed'))
    const view = render(<TrialScopePage trialId={trial.id} />)
    expect(screen.getByText('Resume Trial scope draft')).toBeTruthy()
    expect((screen.getByLabelText('Residual RNA retention days*') as HTMLInputElement).value).toBe('')
    expect((screen.getByLabelText('Prospect terms and RUO / no-PHI requirements*') as HTMLTextAreaElement).value).toBe('')
    fireEvent.change(screen.getByLabelText('Scientific objective*'), { target: { value: 'Retain this working idea' } })
    mocks.queries.mockReturnValue({ ...query, detail: { data: { ...trial, version: 9 } } }); view.rerender(<TrialScopePage trialId={trial.id} />)
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); await screen.findByText('Trial changed')
    expect(mocks.mutation.mock.calls[0][0].payload).toMatchObject({ version: trial.version, values: { objective: 'Retain this working idea', terms: '', residualRetentionDays: null } })
    expect((screen.getByLabelText('Scientific objective*') as HTMLTextAreaElement).value).toBe('Retain this working idea')
    expect(mocks.navigate).not.toHaveBeenCalled()
  })

  it('protects both actions and navigation during a draft save', async () => {
    const trial = { ...trialDetail, isStaff: true, scope: null }
    mocks.queries.mockReturnValue({ staff: true, detail: { data: trial }, config: { data: trialConfiguration } })
    let finish!: (value: unknown) => void
    mocks.mutation.mockImplementation(() => new Promise(resolve => { finish = resolve }))
    render(<TrialScopePage trialId={trial.id} />)
    fireEvent.change(screen.getByLabelText('Trial name*'), { target: { value: 'Draft for tomorrow' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); await screen.findByRole('button', { name: 'Saving draft…' })
    expect(screen.getByRole('button', { name: 'Submit scope for approval' }).matches(':disabled')).toBe(true)
    expect(screen.getByLabelText('Trial name*').matches(':disabled')).toBe(true)
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    expect(screen.getByText('Cancel').getAttribute('aria-disabled')).toBe('true')
    await act(async () => { finish({ ...trial, version: 5 }) })
    expect(mocks.navigate).toHaveBeenCalledOnce()
  })
})

describe('Trial scope reload', () => {
  it('prevents edits, submission and navigation while reloading, then permits retry with the refreshed version', async () => {
    const scope = { ...trialDetail.scope!, internalValues: { ...trialDetail.scope!, workflowVersionId: 'workflow-1', estimatedRetailValue: 2000, anticipatedInternalCost: 500 } }
    const trial = { ...trialDetail, isStaff: true, canManage: true, status: 'UnderReview', scope }
    const configuration = { ...trialConfiguration, workflows: [{ id: 'workflow-1', name: 'Approved PSeq workflow', version: 3 }], analyses: scope.analyses, deliverables: scope.deliverables }
    let rejectReload!: (error: Error) => void
    const detailReload = vi.fn().mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectReload = reject })).mockResolvedValue({ data: { ...trial, version: 5 } })
    const configReload = vi.fn().mockResolvedValue({ data: configuration })
    mocks.queries.mockReturnValue({ staff: true, detail: { data: trial, refetch: detailReload }, config: { data: configuration, refetch: configReload } })
    mocks.mutation.mockRejectedValueOnce(new Error('Trial changed')).mockResolvedValue({ ...trial, version: 6 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<TrialScopePage trialId="trial-1" />)
    fireEvent.change(screen.getByLabelText('Reason for this scope revision*'), { target: { value: 'Keep the research goal' } })
    fireEvent.click(screen.getByRole('button', { name: 'Submit scope for approval' })); await screen.findByText('Trial changed')
    fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    expect(screen.getByRole('status').textContent).toContain('Reloading current Trial and configuration')
    expect(screen.getByLabelText('Trial name*').matches(':disabled')).toBe(true); expect(screen.getByLabelText('Reason for this scope revision*').matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Submit scope for approval' }).matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Reloading…' }).matches(':disabled')).toBe(true)
    expect(screen.getByText('Back to TR-RESEARCH-01').getAttribute('aria-disabled')).toBe('true'); expect(screen.getByText('Cancel').getAttribute('aria-disabled')).toBe('true')
    expect(mocks.blocker.mock.lastCall![0].shouldBlockFn()).toBe(true); expect(mocks.blocker.mock.lastCall![0].enableBeforeUnload()).toBe(true)
    expect(confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Reloading…' }))
    await act(async () => { fireEvent.submit(screen.getByLabelText('Trial name*').closest('form')!) })
    expect(detailReload).toHaveBeenCalledOnce(); expect(mocks.mutation).toHaveBeenCalledOnce()
    await act(async () => { rejectReload(new Error('Refresh unavailable')) })
    expect(await screen.findByText('Refresh unavailable')).toBeTruthy()
    expect((screen.getByLabelText('Reason for this scope revision*') as HTMLInputElement).value).toBe('Keep the research goal'); expect(screen.getByLabelText('Trial name*').matches(':disabled')).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    await screen.findByText(/The current Trial and configuration were reloaded/)
    fireEvent.click(screen.getByRole('button', { name: 'Submit scope for approval' }))
    await waitFor(() => expect(mocks.mutation).toHaveBeenCalledTimes(2))
    expect(mocks.mutation.mock.calls[1][0].payload).toMatchObject({ version: 5, reason: 'Keep the research goal' })
    expect(mocks.mutation.mock.calls[1][0].key).not.toBe(mocks.mutation.mock.calls[0][0].key)
    confirm.mockRestore()
  })
})
