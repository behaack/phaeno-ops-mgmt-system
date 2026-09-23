import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PreparationBatchPage } from './PreparationBatchPage'
import { createPreviewBatch } from './ConfigurationPreview'
import type { PreparationStage } from '#/api/lab-preparation'

const state = vi.hoisted(() => ({ canAccess: false, sessionAvailable: true, batch: vi.fn(), apply: vi.fn(), resources: vi.fn(), tubes: vi.fn() }))
vi.mock('./lab-command-recovery', async original => ({ ...await original<typeof import('./lab-command-recovery')>(), useLabCommandRecovery: () => ({ data: null, isFetched: true, retain: async () => undefined, clear: async () => undefined, refetch: async () => undefined }) }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({
  session: state.sessionAvailable ? { capabilities: { canManageLabOperations: state.canAccess } } : null, authProvider: 'clerk',
}) }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: vi.fn(), Link: ({ children, to }: { children: ReactNode; to: string }) => <a href={to}>{children}</a> }))
vi.mock('#/api/lab-preparation', async original => ({ ...await original<typeof import('#/api/lab-preparation')>(), getPreparation: state.batch, applyPreparation: state.apply, findPreparationTubes: state.tubes }))
vi.mock('#/api/lab-operations', async original => ({ ...await original<typeof import('#/api/lab-operations')>(), getLabOperationsDashboard: state.resources }))
vi.mock('./PreparationTray', () => ({ PreparationTray: ({ eligibleTubes, children }: { eligibleTubes?: ReactNode; children?: (id: string) => ReactNode }) => <div>Tray workspace{eligibleTubes}{children?.('member')}</div> }))

function show(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return render(<QueryClientProvider client={client}><PreparationBatchPage batchId="saved-preparation" /></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks(); state.canAccess = false; state.sessionAvailable = true })

describe('preparation access feedback', () => {
  it('retries a biological transfer with its original source version after an uncertain response refreshes the balance', async () => {
    state.canAccess = true
    const stage: PreparationStage = { id: 'stage', name: 'Transfer', sequence: 1, requirement: 'Required', definition: { schemaVersion: 1, preparationBatchEnabled: true, steps: [{ key: 'transfer', name: 'Transfer sample', instructions: 'Transfer actual sample material.', required: true, repeatable: true, operatorConfirmation: true, captures: [{ key: 'sample', label: 'Sample material', type: 'biologicalMaterial', scope: 'tube', required: true }], inputMaterials: [], preparedOutputs: [], equipmentTypes: [] }] } }
    const example = createPreviewBatch(stage)
    const batch = { ...example, id: 'saved-preparation', canOperate: true, roles: ['Operator'], members: example.members.slice(0, 1) }
    state.batch.mockResolvedValue(batch)
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    state.apply.mockRejectedValueOnce(new Error('Response interrupted'))
    show()
    fireEvent.click((await screen.findAllByRole('button', { name: 'Record step' }))[0])
    fireEvent.click(screen.getByRole('button', { name: 'A1 · EXAMPLE-TUBE-1' }))
    fireEvent.change(screen.getByLabelText(/Scan accessioned source tube barcode/), { target: { value: 'EXAMPLE-TUBE-1' } })
    fireEvent.change(screen.getByLabelText(/Scan library tube barcode/), { target: { value: 'EXAMPLE-LIBRARY-1' } })
    fireEvent.change(screen.getByLabelText(/Actual amount transferred/), { target: { value: '20' } })
    fireEvent.click(screen.getByRole('checkbox', { name: /I performed this step/ }))
    const refreshed = { ...batch, version: 2, members: [{ ...batch.members[0], sourceMaterial: { ...batch.members[0].sourceMaterial!, version: 2, quantity: 80 }, libraryTube: { ...batch.members[0].libraryTube!, transferId: 'saved-transfer' } }] }
    state.batch.mockResolvedValue(refreshed)
    fireEvent.click(screen.getByRole('button', { name: 'Save step record' }))
    const retry = await screen.findByRole('button', { name: 'Retry same command' })
    expect(screen.queryByLabelText(/Actual amount transferred/)).toBeNull()
    const submitted = state.apply.mock.calls[0][1]
    expect(submitted.step.resourceEntries[0]).toMatchObject({ quantity: 20, resourceVersion: 1 })
    state.apply.mockResolvedValueOnce(refreshed)
    fireEvent.click(retry)
    await waitFor(() => expect(state.apply).toHaveBeenCalledTimes(2))
    expect(state.apply.mock.calls[1][1]).toEqual(submitted)
  })

  it('automatically reconciles eligible conditions once and preserves the receipt for an uncertain retry', async () => {
    state.canAccess = true
    const ready = { id: 'saved-preparation', name: 'Batch', version: 5, status: 'InProgress', canOperate: true, automaticSkipAvailable: true, members: [], stages: [], records: [], roles: ['Supervisor'], layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] } }
    state.batch.mockResolvedValue(ready)
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    state.apply.mockRejectedValueOnce(new Error('Connection interrupted'))
    show()
    const retry = await screen.findByRole('button', { name: 'Retry automatic skip' })
    expect(state.apply).toHaveBeenCalledTimes(1)
    const submitted = state.apply.mock.calls[0][1]
    expect(submitted).toMatchObject({ action: 'evaluate-conditions', version: 5 })
    const resolved = { ...ready, version: 6, automaticSkipAvailable: false }
    state.batch.mockResolvedValue(resolved)
    state.apply.mockResolvedValueOnce(resolved)
    fireEvent.click(retry)
    await screen.findByText('Review unresolved tube outcomes')
    expect(state.apply).toHaveBeenCalledTimes(2)
    expect(state.apply.mock.calls[1][1]).toEqual(submitted)
  })

  it('starts directly, prevents duplicate submission and exposes retry feedback without a modal', async () => {
    state.canAccess = true
    const draft = { id: 'saved-preparation', name: 'Batch', version: 1, status: 'Draft', trayBarcode: 'TRAY', trayConfirmed: true, canOperate: true, members: [], stages: [], records: [], roles: [], layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] } }
    state.batch.mockResolvedValue(draft)
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    let rejectStart!: (error: Error) => void
    state.apply.mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectStart = reject }))
    show()
    const start = await screen.findByRole('button', { name: 'Start preparation' })
    expect(screen.getByText(/records the start time and prevents further tray edits/)).toBeTruthy()
    fireEvent.click(start)
    fireEvent.click(start)
    await waitFor(() => expect(state.apply).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('button', { name: 'Starting…' })).toHaveProperty('disabled', true)
    expect(screen.queryByRole('dialog')).toBeNull()
    const submitted = state.apply.mock.calls[0][1]
    expect(submitted).toMatchObject({ action: 'start', confirmed: true, version: 1 })
    await act(async () => rejectStart(new Error('Connection interrupted')))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('review before saving again'))
    expect(screen.getByRole('button', { name: 'Start preparation' })).toHaveProperty('disabled', false)
    const started = { ...draft, status: 'InProgress', version: 2, startedAtUtc: '2026-09-17T12:00:00Z' }
    state.batch.mockResolvedValue(started)
    state.apply.mockResolvedValueOnce(started)
    fireEvent.click(screen.getByRole('button', { name: 'Start preparation' }))
    await screen.findByText('Review unresolved tube outcomes')
    expect(state.apply.mock.calls[1][1]).toEqual(submitted)
    expect(screen.queryByRole('button', { name: 'Start preparation' })).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it.each([
    { biologicalSource: 'Human liver', safetyInformation: 'Declared handling instructions.\nSecond line.', expectedSource: 'Human liver', expectedSafety: 'Declared handling instructions. Second line.' },
    { biologicalSource: null, safetyInformation: null, expectedSource: 'Not recorded', expectedSafety: 'Not recorded' },
    { biologicalSource: undefined, safetyInformation: undefined, expectedSource: 'Not available', expectedSafety: 'Not available' },
  ])('shows saved specimen declarations without inferring missing safety: $expectedSource', async ({ biologicalSource, safetyInformation, expectedSource, expectedSafety }) => {
    state.canAccess = true
    state.batch.mockResolvedValue({ id: 'saved-preparation', name: 'Batch', version: 1, status: 'Draft', trayConfirmed: true, canOperate: true,
      members: [{ id: 'member', position: 'A1', barcode: 'TUBE', workOrderId: 'job', jobName: 'JOB', specimenId: 'specimen', specimenName: 'ACCESSION', sequence: 1, state: 'Planned', executions: [], biologicalSource, safetyInformation }],
      stages: [], records: [], roles: [], layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] } })
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    show()
    const details = await screen.findByRole('region', { name: 'Tube details for A1' })
    expect(within(details).getByText('Specimen type').nextElementSibling?.textContent).toBe(expectedSource)
    expect(within(details).getByText('Declared safety information').nextElementSibling?.textContent?.replaceAll('\n', ' ')).toBe(expectedSafety)
  })
  it('surfaces Start preparation for a confirmed draft and hides handoff and tube discovery', async () => {
    state.canAccess = true
    state.batch.mockResolvedValue({ id: 'saved-preparation', name: 'Batch', version: 1, status: 'Draft', trayBarcode: 'TRAY', trayConfirmed: true, canOperate: true, members: [], stages: [], records: [], roles: [], layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] } })
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    show()
    expect(await screen.findByRole('button', { name: 'Start preparation' })).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Open sequencing batches' })).toBeNull()
    expect(screen.queryByText('Find eligible tubes')).toBeNull()
    expect(state.tubes).not.toHaveBeenCalled()
  })
  it('pages eligible tubes and resets paging when either filter changes or is cleared', async () => {
    state.canAccess = true
    state.batch.mockResolvedValue({ id: 'saved-preparation', name: 'Batch', version: 1, status: 'Draft', canOperate: true, members: [], stages: [], records: [], roles: [], layout: { name: 'Tray', rows: 1, columns: 2, labels: 'grid', unavailable: [] } })
    state.resources.mockResolvedValue({ materialLots: [], equipment: [], batches: [] })
    state.tubes.mockImplementation(async (_id: string, query: string, box: string, page: number) => ({
      items: [{ id: `tube-${page}`, barcode: `Tube on page ${page}`, jobName: query || 'JOB', specimenName: 'Sample', location: box || 'BOX' }], page, pageSize: 10, totalCount: 11, totalPages: 2,
    }))
    show()
    fireEvent.click(await screen.findByText('Find eligible tubes'))
    const pager = await screen.findByRole('navigation', { name: 'Eligible tube pages' })
    expect(within(pager).getByRole('button', { name: 'Previous' })).toHaveProperty('disabled', true)
    fireEvent.click(within(pager).getByRole('button', { name: 'Next' }))
    await screen.findByText('Tube on page 2')
    expect(within(pager).getByRole('button', { name: 'Next' })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByLabelText('Freezer box barcode'), { target: { value: 'BOX-2' } })
    await waitFor(() => expect(state.tubes).toHaveBeenLastCalledWith('saved-preparation', '', 'BOX-2', 1))
    await screen.findByText('Tube on page 1')
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('Tube on page 2')
    fireEvent.change(screen.getByLabelText('Search by tube barcode or job'), { target: { value: 'JOB-2' } })
    await waitFor(() => expect(state.tubes).toHaveBeenLastCalledWith('saved-preparation', 'JOB-2', 'BOX-2', 1))
    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    await screen.findByText('Tube on page 1')
    expect(screen.getByLabelText('Freezer box barcode')).toHaveProperty('value', '')
    expect(screen.getByLabelText('Search by tube barcode or job')).toHaveProperty('value', '')
  })
  it('shows the role requirement instead of a disabled-query loading state', () => {
    show()
    expect(screen.getByRole('alert').textContent).toContain('An assigned Phaeno laboratory role is required.')
    expect(screen.getByRole('link', { name: 'Back to dashboard' }).getAttribute('href')).toBe('/')
    expect(screen.queryByText('Loading preparation batch…')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull()
    expect(state.batch).not.toHaveBeenCalled()
  })

  it('does not expose cached staff data or fetch supporting resources without access', () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['lab-preparation', 'saved-preparation'], { name: 'STAFF-ONLY-CACHED-BATCH', status: 'Draft', canOperate: true })
    show(client)
    expect(screen.getByRole('alert').textContent).toContain('laboratory role')
    expect(screen.queryByText('STAFF-ONLY-CACHED-BATCH')).toBeNull()
    expect(state.batch).not.toHaveBeenCalled()
    expect(state.resources).not.toHaveBeenCalled()
    expect(state.tubes).not.toHaveBeenCalled()
  })

  it('still requests the batch for an authorized session and shows genuine loading', async () => {
    state.canAccess = true
    state.batch.mockReturnValue(new Promise(() => {}))
    show()
    await waitFor(() => expect(state.batch).toHaveBeenCalledWith('saved-preparation'))
    expect(screen.getByRole('status').textContent).toBe('Loading preparation batch…')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('withholds cached data while the current session is unresolved', () => {
    state.sessionAvailable = false
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['lab-preparation', 'saved-preparation'], { name: 'STAFF-ONLY-CACHED-BATCH', status: 'Draft', canOperate: true })
    show(client)
    expect(screen.getByRole('status').textContent).toBe('Checking laboratory access…')
    expect(screen.queryByText('STAFF-ONLY-CACHED-BATCH')).toBeNull()
    expect(state.resources).not.toHaveBeenCalled()
    expect(state.tubes).not.toHaveBeenCalled()
  })
})
