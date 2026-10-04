import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ComponentProps } from 'react'
import { getCrmCompany, listCrmOpportunityDepartments } from '#/api/crm'
import { getTrialConfiguration } from '#/api/trials'
import { trialConfiguration } from '#/test-helpers/trials'
import { TrialCreateDialog } from './TrialCreateDialog'

vi.mock('#/api/trials', async importOriginal => ({ ...await importOriginal<typeof import('#/api/trials')>(), getTrialConfiguration: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn() }))
vi.mock('#/api/crm', async importOriginal => ({ ...await importOriginal<typeof import('#/api/crm')>(), getCrmCompany: vi.fn(), listCrmOpportunityDepartments: vi.fn() }))

type CreateHandler = ComponentProps<typeof TrialCreateDialog>['onSubmit']

describe('Trial creation details', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getTrialConfiguration).mockResolvedValue(trialConfiguration)
    HTMLElement.prototype.scrollIntoView = vi.fn()
    vi.mocked(getCrmCompany).mockResolvedValue({ id: 'company-1', name: 'Research Company' } as Awaited<ReturnType<typeof getCrmCompany>>)
    vi.mocked(listCrmOpportunityDepartments).mockResolvedValue([{ id: 'research', name: 'Research' }, { id: 'oncology', name: 'Oncology' }])
  })

  it('requires the initial details, an ordered submission window and an explicit Department', async () => {
    const submit = vi.fn<CreateHandler>()
    await arrange(submit)
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    expect(await screen.findByText('Enter a Trial name.')).toBeTruthy()
    expect(submit).not.toHaveBeenCalled()
    enterDetails()
    fireEvent.change(screen.getByLabelText('Submission closes', { exact: false }), { target: { value: '2026-10-09' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    expect(await screen.findByText('Closing date cannot be before opening date.')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Submission closes', { exact: false }), { target: { value: '2026-10-10' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    expect(await screen.findByText('Select the Department this Trial belongs to.')).toBeTruthy()
    expect(submit).not.toHaveBeenCalled()
  })

  it('preserves entered details and the idempotency key after a failed create', async () => {
    const submit = vi.fn<CreateHandler>().mockRejectedValueOnce(new Error('Save unavailable')).mockResolvedValueOnce(undefined)
    const close = vi.fn()
    await arrange(submit, close)
    enterDetails()
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'oncology' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    await waitFor(() => expect(submit).toHaveBeenCalledOnce())
    expect(submit.mock.calls[0][0]).toEqual({ companyId: 'company-1', departmentId: 'oncology', name: 'RNA evaluation', objective: 'Evaluate research outputs.', sampleTypeId: 'rna', sources: [{ biologicalSource: 'Human PBMC', specimenCount: 10 }], submissionOpensAtUtc: '2026-10-10T00:00:00.000Z', submissionClosesAtUtc: '2026-10-21T00:00:00.000Z' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Create Trial project' }).matches(':disabled')).toBe(false))
    expect(screen.getByRole('textbox', { name: 'Objective / Description' })).toHaveProperty('value', 'Evaluate research outputs.')
    expect(close).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2))
    expect(submit.mock.calls[1]).toEqual(submit.mock.calls[0])
    await waitFor(() => expect(close).toHaveBeenCalledOnce())
  })

  it('calculates quantities across variable sources and rejects duplicates and nonpositive quantities', async () => {
    const submit = vi.fn<CreateHandler>().mockResolvedValue(undefined)
    await arrange(submit)
    enterDetails()
    fireEvent.change(screen.getByRole('combobox', { name: 'Department' }), { target: { value: 'oncology' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }))
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Biological source' })[1], { target: { value: ' human   PBMC ' } })
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Samples' })[1], { target: { value: '0' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    expect(await screen.findByText('Enter at least one sample.')).toBeTruthy()
    fireEvent.change(screen.getAllByRole('spinbutton', { name: 'Samples' })[1], { target: { value: '4' } })
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    expect(await screen.findByText('Use a distinct biological source.')).toBeTruthy()
    expect(submit).not.toHaveBeenCalled()
    fireEvent.change(screen.getAllByRole('textbox', { name: 'Biological source' })[1], { target: { value: 'Mouse liver' } })
    expect(screen.getByText('Total samples: 14')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Add source' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove source 3' }))
    expect(screen.getAllByRole('textbox', { name: 'Biological source' })).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: 'Create Trial project' }))
    await waitFor(() => expect(submit).toHaveBeenCalledOnce())
    expect(submit.mock.calls[0][0]).toMatchObject({ sampleTypeId: 'rna', sources: [{ biologicalSource: 'Human PBMC', specimenCount: 10 }, { biologicalSource: 'Mouse liver', specimenCount: 4 }] })
    expect(submit.mock.calls[0][0]).not.toHaveProperty('sampleAllowance')
  })
})

async function arrange(submit: CreateHandler, close = vi.fn()) {
  render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><TrialCreateDialog fromCompanyId="company-1" onSubmit={submit} onClose={close} /></QueryClientProvider>)
  await screen.findByRole('combobox', { name: 'Department' })
  await screen.findByRole('option', { name: /^Extracted RNA$/ })
}

function enterDetails() {
  fireEvent.change(screen.getByRole('textbox', { name: 'Trial name' }), { target: { value: 'RNA evaluation' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Objective / Description' }), { target: { value: 'Evaluate research outputs.' } })
  fireEvent.change(screen.getByRole('combobox', { name: 'Sample type' }), { target: { value: 'rna' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Biological source' }), { target: { value: 'Human PBMC' } })
  fireEvent.change(screen.getByRole('spinbutton', { name: 'Samples' }), { target: { value: '10' } })
  fireEvent.change(screen.getByLabelText('Submission opens', { exact: false }), { target: { value: '2026-10-10' } })
  fireEvent.change(screen.getByLabelText('Submission closes', { exact: false }), { target: { value: '2026-10-20' } })
}
