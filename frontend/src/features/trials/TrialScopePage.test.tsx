import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { trialConfiguration, trialDetail } from '#/test-helpers/trials'
import { TrialScopePage } from './TrialScopePage'

const mocks = vi.hoisted(() => ({ queries: vi.fn(), mutation: vi.fn(), blocker: vi.fn(), navigate: vi.fn() }))
vi.mock('./trial-hooks', () => ({ useTrialQueries: mocks.queries, useTrialMutation: () => ({ mutateAsync: mocks.mutation }) }))
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mocks.navigate, useBlocker: mocks.blocker,
  Link: ({ children, disabled, className }: ComponentProps<'a'> & { disabled?: boolean }) => <a href={disabled ? undefined : '#trial'} aria-disabled={disabled || undefined} className={className}>{children}</a>,
}))

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
