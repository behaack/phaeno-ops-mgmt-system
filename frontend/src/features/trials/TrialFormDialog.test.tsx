import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TrialFormDialog } from './TrialFormDialog'
import { requiredTrialInputs } from './trial-presentation'
import { trialScope } from '#/test-helpers/trials'

const { blocker } = vi.hoisted(() => ({ blocker: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: blocker }))

describe('Trial bounded actions', () => {
  it('requires explicit RUO and no-PHI confirmation', async () => {
    const submit = vi.fn().mockResolvedValue(undefined)
    render(<TrialFormDialog title="Accept Trial" description="Review approved terms" fields={[{ name: 'ruo', label: 'Research use only and no PHI', type: 'checkbox', required: true }]} onClose={vi.fn()} onSubmit={submit}><p>For Research Use Only. Not for use in diagnostic procedures.</p></TrialFormDialog>)
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert'); expect(submit).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Research use only and no PHI' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(submit).toHaveBeenCalledWith({ ruo: 'yes' }, expect.any(String)))
  })
  it('preserves entered values while explicitly reloading a concurrency conflict', async () => {
    let version = 4
    const sent: number[] = []
    const reload = vi.fn().mockImplementation(async () => { version = 5 })
    const submit = vi.fn().mockImplementation(async () => { sent.push(version); if (version === 4) throw new Error('This Trial changed.') })
    render(<TrialFormDialog title="Schedule" description="Update estimate" fields={[{ name: 'estimate', label: 'Estimate', required: true }]} onClose={vi.fn()} onReload={reload} onSubmit={submit} />)
    fireEvent.change(screen.getByLabelText('Estimate*'), { target: { value: 'Next week' } }); fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    await screen.findByRole('status'); expect((screen.getByLabelText('Estimate*') as HTMLInputElement).value).toBe('Next week')
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(sent).toEqual([4, 5]))
    expect(submit.mock.calls[0][1]).not.toBe(submit.mock.calls[1][1])
  })
  it('collects every frozen PSeq required input without duplicating standard sample fields', () => {
    expect(requiredTrialInputs(trialScope)).toEqual(['organism'])
    expect(requiredTrialInputs({ ...trialScope, analyses: [...trialScope.analyses, { ...trialScope.analyses[0], requiredInputsJson: '{"required":["organism","tissue"]}' }] })).toEqual(['organism', 'tissue'])
  })
  it('requires renewed acceptance after changed-scope reload and retains other valid entries', async () => {
    const submit = vi.fn().mockRejectedValueOnce(new Error('Scope changed')).mockResolvedValue(undefined)
    render(<TrialFormDialog title="Acceptance" description="Review terms" fields={[{ name: 'note', label: 'Note' }, { name: 'confirmed', label: 'I accept', type: 'checkbox', required: true }]} onClose={vi.fn()} onSubmit={submit} onReload={async () => ({ resetFields: ['confirmed'], message: 'Review the amended scope.' })} />)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Preserve me' } }); fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    await screen.findByText('Review the amended scope.'); expect((screen.getByRole('checkbox') as HTMLInputElement).checked).toBe(false); expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('Preserve me')
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); await screen.findByRole('alert'); expect(submit).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('checkbox')); fireEvent.click(screen.getByRole('button', { name: 'Save' })); await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
  })
  it('asks before discarding changes through Cancel or Escape', async () => {
    const close = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<TrialFormDialog title="Schedule" description="Update estimate" fields={[{ name: 'note', label: 'Note' }]} onClose={close} onSubmit={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Unsaved schedule' } }); fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(confirm).toHaveBeenCalled(); expect(close).not.toHaveBeenCalled()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' }); expect(close).not.toHaveBeenCalled()
    confirm.mockReturnValue(true); fireEvent.click(screen.getByRole('button', { name: 'Cancel' })); expect(close).toHaveBeenCalledOnce(); confirm.mockRestore()
  })
  it('blocks overlapping actions, editing and navigation until a failed reload settles', async () => {
    let rejectReload!: (error: Error) => void
    const reload = vi.fn(() => new Promise<void>((_resolve, reject) => { rejectReload = reject }))
    const submit = vi.fn().mockRejectedValue(new Error('Trial changed'))
    const close = vi.fn(); const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<TrialFormDialog title="Schedule" description="Update estimate" fields={[{ name: 'note', label: 'Note' }]} onClose={close} onSubmit={submit} onReload={reload} />)
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Keep this estimate' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save' })); await screen.findByText('Trial changed')
    fireEvent.click(screen.getByRole('button', { name: 'Reload current Trial; keep my entries' }))
    expect(screen.getByRole('status').textContent).toContain('Reloading current Trial')
    expect(screen.getByRole('region', { name: 'Schedule fields' }).tabIndex).toBe(0)
    expect(screen.getByLabelText('Note').matches(':disabled')).toBe(true)
    for (const name of ['Reloading…', 'Save', 'Cancel']) expect(screen.getByRole('button', { name }).matches(':disabled')).toBe(true)
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    expect(blocker.mock.lastCall![0].shouldBlockFn()).toBe(true)
    expect(blocker.mock.lastCall![0].enableBeforeUnload()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Reloading…' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    await act(async () => { fireEvent.submit(screen.getByLabelText('Note').closest('form')!) })
    expect(submit).toHaveBeenCalledOnce(); expect(reload).toHaveBeenCalledOnce(); expect(close).not.toHaveBeenCalled(); expect(confirm).not.toHaveBeenCalled()
    await act(async () => { rejectReload(new Error('Refresh unavailable')) })
    expect(await screen.findByText('Refresh unavailable')).toBeTruthy()
    expect((screen.getByLabelText('Note') as HTMLInputElement).value).toBe('Keep this estimate'); expect(screen.getByLabelText('Note').matches(':disabled')).toBe(false)
    expect(screen.getByRole('button', { name: 'Save' }).matches(':disabled')).toBe(false)
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.getByRole('region', { name: 'Schedule fields' }).hasAttribute('tabindex')).toBe(false)
    expect(blocker.mock.lastCall![0].shouldBlockFn()).toBe(false)
    confirm.mockRestore()
  })
})
