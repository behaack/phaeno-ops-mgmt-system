import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'

const api = vi.hoisted(() => ({ add: vi.fn(), get: vi.fn(), clear: vi.fn(), finalize: vi.fn(), preview: vi.fn(), confirm: vi.fn(), shipments: vi.fn(), blocker: vi.fn() }))
vi.mock('#/api/order-management', () => ({
  addLabSample: api.add, getLabOrder: api.get,
  finalizeLabSampleRoster: api.finalize, previewLabSampleImport: api.preview, confirmLabSampleImport: api.confirm,
  deleteLabSample: api.clear, downloadLabSampleTemplate: vi.fn(), getOrderErrorMessage: (error: Error) => error.message,
}))
vi.mock('./LabSampleDialog', () => ({ LabSampleDialog: ({ biologicalSource }: { biologicalSource?: string }) => <p data-testid="selected-source">{biologicalSource}</p> }))
vi.mock('#/api/sample-shipping', () => ({ getSourceSampleShipments: api.shipments }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: api.blocker, Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewSampleShipping: true } }, selectedOrganizationId: 'org-1', selectedDepartmentId: 'department-1' }) }))
const order = { id: 'job', orderNumber: 'ABC12345', version: 4, canEditSamples: true, canFinalizeSamples: true,
  requestedSpecimenCount: 1, sourceGroups: [{ id: 'source', biologicalSource: 'Human PBMCs', specimenCount: 1 }],
  samples: [{ id: 'sample', customerSampleId: 'S-1', biologicalSource: 'Human PBMCs', quantity: 2, status: 'Expected' }],
} as LabServiceOrder
function renderPanel(value = order) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabJobSamplesPanel order={value} /></QueryClientProvider>) }

function listAction(name: string) {
  const direct = screen.queryByRole('button', { name })
  if (direct) return direct
  fireEvent.pointerDown(screen.getByRole('button', { name: 'Sample list actions' }), { button: 0, ctrlKey: false })
  return screen.getByRole('menuitem', { name })
}
function sampleAction(id: string, action: string) {
  fireEvent.pointerDown(screen.getByRole('button', { name: `Actions for sample ${id}` }), { button: 0, ctrlKey: false })
  return screen.getByRole('menuitem', { name: `${action} sample` })
}

describe('Customer sample-list authorization', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.clearAllMocks(); api.finalize.mockResolvedValue(order); api.confirm.mockResolvedValue(order); api.shipments.mockReset().mockResolvedValue([]) })
  it('blocks leaving while a sample dialog is open and releases a closed review dialog', () => {
    renderPanel()
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false)
    fireEvent.click(listAction('Review and finalize list'))
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true)
    expect(api.blocker.mock.lastCall?.[0].enableBeforeUnload()).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false)
    fireEvent.click(sampleAction('S-1', 'Edit'))
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true)
    expect(api.blocker.mock.lastCall?.[0].disabled).toBe(false)
  })
  it('keeps navigation blocked through pending sample finalization until its result is saved', async () => {
    let resolve!: (saved: LabServiceOrder) => void
    api.finalize.mockImplementation(() => new Promise<LabServiceOrder>(done => { resolve = done }))
    renderPanel()
    fireEvent.click(listAction('Review and finalize list'))
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: 'Finalize sample list' }))
    await waitFor(() => expect(api.finalize).toHaveBeenCalledWith(order.id, order.version, true))
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', true)
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true)
    expect(api.blocker.mock.lastCall?.[0].enableBeforeUnload()).toBe(true)
    await act(async () => resolve({ ...order, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z' }))
    await waitFor(() => expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.blocker.mock.lastCall?.[0].disabled).toBe(true)
  })
  it('shows split-family receipt counts once in the finalized roster, alongside laboratory details', async () => {
    const tube = shippingTube(1, { submittedSpecimenId: 'sample', totalSampleTubeCount: 4, receivedTubeCount: 1, supplierTubeBarcode: 'SAVED-1' })
    const shipment = { ...shippingFixture, authorizationSourceId: order.id, orderExpectedTubeCount: 4, orderReceivedTubeCount: 1 }
    api.shipments.mockResolvedValue([
      { ...shipment, crosswalk: [tube, { ...tube, tubeSlotId: 'second' }] },
      { ...shipment, id: 'split', crosswalk: [tube, { ...tube, tubeSlotId: 'third', supplierTubeBarcode: null }] },
      { ...shipment, id: 'pool', isPackingPool: true, crosswalk: [{ ...tube, tubeSlotId: 'fourth', supplierTubeBarcode: null }] },
      { ...shipment, id: 'retired', status: 'Cancelled', crosswalk: [{ ...tube, totalSampleTubeCount: 999, receivedTubeCount: 999 }] },
      { ...shipment, id: 'unrelated', authorizationSourceId: 'another-job', crosswalk: [{ ...tube, totalSampleTubeCount: 999, receivedTubeCount: 999 }] },
    ])
    renderPanel({ ...order, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z', samples: [{ ...order.samples[0], quantity: 4, status: 'OnHold', accessionId: 'ACC-1', tenantSafeReason: 'Review requested.' }] })
    expect(await screen.findByText('Receipt: 1 of 4 tubes received')).toBeTruthy()
    const row = screen.getByText('S-1').closest('li')!
    expect(within(row).getByText('Accession ACC-1')).toBeTruthy()
    expect(within(row).queryByText('4 tubes')).toBeNull()
    expect(within(row).getByText('On Hold')).toBeTruthy()
    expect(within(row).getByText('2 of 4 tubes matched')).toBeTruthy()
    expect(within(row).getByText('Review requested.')).toBeTruthy()
    expect(screen.queryByText('Sample receipt progress')).toBeNull()
    expect(screen.queryByText(/999/)).toBeNull()
    expect(screen.getByText('1 of 4 tubes received across all shipments.')).toBeTruthy()
    expect(api.shipments).toHaveBeenCalledTimes(1)
    expect(api.shipments).toHaveBeenCalledWith(order.id, false)
  })
  it('shows a compact checking state until receipt data is available', () => {
    api.shipments.mockReturnValue(new Promise(() => {}))
    renderPanel({ ...order, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z' })
    expect(screen.getByText('Receipt: Checking…')).toBeTruthy()
    expect(screen.getByText('Matching: Checking…')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Loading related shipments…')
    expect(screen.queryByText(/Receipt: 0 of/)).toBeNull()
  })
  it.each(['missing counts', 'unrelated specimen', 'failed request'])('keeps %s distinct from a known zero receipt count', async scenario => {
    if (scenario === 'failed request') api.shipments.mockRejectedValue(new Error('Unavailable'))
    else api.shipments.mockResolvedValue([{ ...shippingFixture, authorizationSourceId: order.id, crosswalk: [shippingTube(1, { submittedSpecimenId: scenario === 'unrelated specimen' ? 'other-sample' : 'sample', customerSampleId: 'S-1', totalSampleTubeCount: 2, receivedTubeCount: scenario === 'missing counts' ? undefined : 0 })] }])
    renderPanel({ ...order, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z' })
    expect(await screen.findByText('Receipt: Not available')).toBeTruthy()
    expect(screen.queryByText(/Receipt: 0 of/)).toBeNull()
    if (scenario === 'failed request') expect(screen.getByRole('button', { name: 'Retry shipments' })).toBeTruthy()
    if (scenario !== 'missing counts') expect(screen.getByText('Matching: Not available')).toBeTruthy()
  })
  it('shows a known zero only when the shipment explicitly supplies both family counts', async () => {
    api.shipments.mockResolvedValue([{ ...shippingFixture, authorizationSourceId: order.id, crosswalk: [shippingTube(1, { submittedSpecimenId: 'sample', totalSampleTubeCount: 2, receivedTubeCount: 0 })] }])
    renderPanel({ ...order, sampleRosterFinalizedAt: '2026-09-10T00:00:00Z' })
    expect(await screen.findByText('Receipt: 0 of 2 tubes received')).toBeTruthy()
    expect(screen.getByText('0 of 2 tubes matched')).toBeTruthy()
    expect(screen.queryByText('Sample receipt progress')).toBeNull()
  })
  it('paginates ten naturally ordered samples across source groups with whole-group counts', () => {
    const samples = Array.from({ length: 12 }, (_, index) => ({ ...order.samples[0], id: `human-${12 - index}`, customerSampleId: `S-${12 - index}` }))
    renderPanel({ ...order, requestedSpecimenCount: 13,
      sourceGroups: [{ ...order.sourceGroups[0], specimenCount: 12 }, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 1, version: 1 }],
      samples: [...samples, { ...order.samples[0], id: 'mouse-1', customerSampleId: 'M-1', biologicalSource: 'Mouse liver' }],
    })
    const roster = screen.getByRole('region', { name: 'Samples by biological source' })
    expect(within(roster).getAllByRole('listitem')).toHaveLength(10)
    expect(within(roster).getAllByRole('listitem').map(row => within(row).getByText(/^S-\d+$/).textContent)).toEqual(Array.from({ length: 10 }, (_, index) => `S-${index + 1}`))
    expect(within(roster).getByText('12 of 12 samples')).toBeTruthy()
    expect(screen.getByText('Samples 1–10 of 13')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Previous samples' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Next samples' }))
    expect(screen.getByText('Samples 11–13 of 13')).toBeTruthy()
    const continued = within(roster).getByRole('region', { name: 'Human PBMCs (continued)' })
    expect(within(continued).getByText('12 of 12 samples')).toBeTruthy()
    expect(within(continued).getAllByRole('listitem')).toHaveLength(2)
    expect(within(continued).getByText('S-11')).toBeTruthy()
    expect(within(continued).getByText('S-12')).toBeTruthy()
    expect(within(roster).getByRole('region', { name: 'Mouse liver' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Next samples' })).toHaveProperty('disabled', true)
    expect(screen.getByText('13 of 13 sample IDs saved')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Previous samples' }))
    expect(screen.getByText('Samples 1–10 of 13')).toBeTruthy()
  })
  it('supports embedded controlled pagination without resetting a restored page while the roster is empty', () => {
    const onPageChange = vi.fn()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const populated = { ...order, requestedSpecimenCount: 12, sourceGroups: [{ ...order.sourceGroups[0], specimenCount: 12 }], samples: Array.from({ length: 12 }, (_, index) => ({ ...order.samples[0], id: `sample-${index}`, customerSampleId: `S-${index + 1}` })) }
    const view = (value: LabServiceOrder, page: number) => <QueryClientProvider client={client}><LabJobSamplesPanel order={value} embedded page={page} onPageChange={onPageChange} /></QueryClientProvider>
    const rendered = render(view({ ...populated, samples: [] }, 1))
    expect(onPageChange).not.toHaveBeenCalled()
    rendered.rerender(view(populated, 1))
    expect(screen.getByText('Samples 11–12 of 12')).toBeTruthy()
    expect(screen.queryByText('Samples and shipping')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Related shipments' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Previous samples' }))
    expect(onPageChange).toHaveBeenCalledWith(0)
    expect(screen.getByText('Samples 11–12 of 12')).toBeTruthy()
    rendered.rerender(view(populated, 0))
    expect(screen.getByText('Samples 1–10 of 12')).toBeTruthy()
    fireEvent.click(listAction('Review and finalize list'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(screen.getByText('12 samples · 24 tubes')).toBeTruthy()
  })
  it('groups sample records under their accepted source and keeps empty groups visible', () => {
    renderPanel({ ...order, requestedSpecimenCount: 3, canFinalizeSamples: false,
      sourceGroups: [...order.sourceGroups, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 2, version: 1 }],
      samples: [{ ...order.samples[0], biologicalSource: '  human pbmcs  ', quantity: 5 }],
    })
    const human = screen.getByRole('region', { name: 'Human PBMCs' })
    expect(within(human).getByText('1 of 1 sample')).toBeTruthy()
    expect(within(human).getByRole('img', { name: 'Human PBMCs sample count is complete' })).toBeTruthy()
    expect(within(human).getByText('5 tubes')).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Actions for sample S-1' })).toBeTruthy()
    expect(within(human).queryByText('Expected')).toBeNull()
    expect(screen.getAllByText('Human PBMCs')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Mouse liver' })).getByText('0 of 2 samples')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Mouse liver sample count is complete' })).toBeNull()
    expect(within(human).queryByRole('textbox')).toBeNull()
    const mouse = screen.getByRole('region', { name: 'Mouse liver' })
    expect(within(mouse).getAllByRole('textbox', { name: /^Sample ID/ })).toHaveLength(2)
    expect(within(mouse).getAllByRole('spinbutton').every(input => (input as HTMLInputElement).value === '1')).toBe(true)
    expect(api.add).not.toHaveBeenCalled()
    expect(screen.queryByRole('img', { name: 'All sample counts are complete' })).toBeNull()
  })
  it('preserves overfilled samples with a repair warning while other sources still have room', () => {
    renderPanel({ ...order, requestedSpecimenCount: 3, canFinalizeSamples: false,
      sourceGroups: [...order.sourceGroups, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 2, version: 1 }],
      samples: [order.samples[0], { ...order.samples[0], id: 'second', customerSampleId: 'S-2' }],
    })
    expect(screen.getByRole('alert').textContent).toContain('Sample list needs attention')
    const human = screen.getByRole('region', { name: 'Human PBMCs' })
    expect(within(human).getByText('2 of 1 sample')).toBeTruthy()
    expect(within(human).queryByRole('img', { name: 'Human PBMCs sample count is complete' })).toBeNull()
    expect(within(human).getByText(/1 extra sample/)).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Actions for sample S-1' })).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Actions for sample S-2' })).toBeTruthy()
    expect(within(human).queryByRole('textbox')).toBeNull()
    expect(screen.getAllByRole('textbox', { name: /for Mouse liver/ })).toHaveLength(2)
    expect(api.finalize).not.toHaveBeenCalled()
  })
  it.each(['Human PBMCs', 'Unlisted source'])('blocks finalization when the total is correct but a sample belongs to %s instead of its required source', source => {
    renderPanel({ ...order, requestedSpecimenCount: 2,
      sourceGroups: [...order.sourceGroups, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 1, version: 1 }],
      samples: [order.samples[0], { ...order.samples[0], id: 'second', customerSampleId: 'S-2', biologicalSource: source }],
    })
    expect(screen.getByText('S-2')).toBeTruthy()
    const finalize = listAction('Review and finalize list')
    expect(finalize.getAttribute('aria-disabled')).toBe('true')
    fireEvent.click(finalize)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.finalize).not.toHaveBeenCalled()
    fireEvent.keyDown(finalize, { key: 'Escape' })
    if (source === 'Unlisted source') {
      const unmatched = screen.getByRole('region', { name: source })
      expect(within(unmatched).getByText(/not in the accepted list/)).toBeTruthy()
      expect(within(unmatched).getByRole('button', { name: 'Actions for sample S-2' })).toBeTruthy()
      expect(within(unmatched).queryByRole('textbox')).toBeNull()
    }
    expect(screen.queryByRole('img', { name: 'All sample counts are complete' })).toBeNull()
  })
  it('protects partial saved samples from import while keeping the CSV template available', () => {
    renderPanel({ ...order, requestedSpecimenCount: 2, sourceGroups: [{ ...order.sourceGroups[0], specimenCount: 2 }] })
    const importButton = listAction('Import sample list')
    expect(importButton.getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByText('Clear all saved sample details before importing a new list.')).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Download CSV template' }).getAttribute('aria-disabled')).not.toBe('true')
    fireEvent.click(importButton)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.preview).not.toHaveBeenCalled()
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('surfaces finalization and hides CSV controls when every sample is identified', () => {
    renderPanel()
    expect(screen.getByRole('button', { name: 'Review and finalize list' })).toHaveProperty('disabled', false)
    expect(screen.queryByRole('button', { name: 'Sample list actions' })).toBeNull()
    expect(screen.queryByText('Download CSV template')).toBeNull()
    expect(screen.queryByText('Import sample list')).toBeNull()
    expect(screen.queryByText('Clear all saved sample details before importing a new list.')).toBeNull()
  })
  it('clears saved details with confirmation and restores the accepted empty slot with one tube', async () => {
    const cleared = { ...order, version: 5, samples: [], canFinalizeSamples: false }
    api.clear.mockResolvedValue(cleared)
    const systemConfirm = vi.spyOn(window, 'confirm')
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    function SavedRoster() {
      const { data } = useQuery({ queryKey: ['lab-service-order', order.id], queryFn: async () => order, initialData: order, enabled: false })
      return <LabJobSamplesPanel order={data} />
    }
    render(<QueryClientProvider client={client}><SavedRoster /></QueryClientProvider>)
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for sample S-1' }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear sample details' }))
    expect(api.clear).not.toHaveBeenCalled()
    expect(screen.getAllByText('S-1').length).toBeGreaterThan(0)
    const confirmation = screen.getByRole('dialog', { name: 'Clear sample details?' })
    expect(within(confirmation).getByText(/accepted sample count and biological source stay unchanged/)).toBeTruthy()
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true)
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for sample S-1' }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear sample details' }))
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Clear sample details?' })).getByRole('button', { name: 'Clear sample details' }))
    await waitFor(() => expect(api.clear).toHaveBeenCalledWith(order.id, order.samples[0].id, order.samples[0].version))
    expect(systemConfirm).not.toHaveBeenCalled()
    expect(await screen.findByRole('textbox', { name: 'Sample ID 1 for Human PBMCs' })).toHaveProperty('value', '')
    expect(screen.getByRole('spinbutton', { name: 'Tube count 1 for Human PBMCs' })).toHaveProperty('value', '1')
    expect(screen.getByText('0 of 1 sample IDs saved')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Review and finalize list' })).toBeNull()
    expect(listAction('Review and finalize list').getAttribute('aria-disabled')).toBe('true')
    expect(client.getQueryData<LabServiceOrder>(['lab-service-order', order.id])?.requestedSpecimenCount).toBe(1)
    expect(api.finalize).not.toHaveBeenCalled()
  })
  it('keeps the clear modal open with an error if saved details cannot be cleared', async () => {
    api.clear.mockRejectedValueOnce(new Error('The sample changed. Refresh and try again.'))
    renderPanel()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions for sample S-1' }), { button: 0, ctrlKey: false })
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clear sample details' }))
    const modal = screen.getByRole('dialog', { name: 'Clear sample details?' })
    fireEvent.click(within(modal).getByRole('button', { name: 'Clear sample details' }))
    expect(await within(modal).findByText('The sample changed. Refresh and try again.')).toBeTruthy()
    expect(within(modal).getByRole('button', { name: 'Cancel' })).toHaveProperty('disabled', false)
    expect(screen.queryByRole('textbox', { name: 'Sample ID 1 for Human PBMCs' })).toBeNull()
    expect(api.finalize).not.toHaveBeenCalled()
  })
  it('does not offer editing or clearing for finalized samples', () => {
    renderPanel({ ...order, canEditSamples: false, canFinalizeSamples: false, sampleRosterFinalizedAt: '2026-09-16T00:00:00Z' })
    expect(screen.queryByRole('button', { name: 'Actions for sample S-1' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Review and finalize list' })).toBeNull()
  })
  it('requires explicit no-PHI confirmation before finalizing the accepted list', async () => {
    renderPanel()
    expect(screen.getByRole('img', { name: 'All sample counts are complete' })).toBeTruthy()
    fireEvent.click(listAction('Review and finalize list'))
    const submit = screen.getByRole('button', { name: 'Finalize sample list' })
    expect(submit).toHaveProperty('disabled', true)
    expect(api.finalize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(submit)
    await waitFor(() => expect(api.finalize).toHaveBeenCalledWith('job', 4, true))
  })
  it('blocks leaving and importing while IDs are unsaved, then permits importing after discard', () => {
    renderPanel({ ...order, samples: [], canFinalizeSamples: false })
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false)
    fireEvent.change(screen.getByRole('textbox', { name: 'Sample ID 1 for Human PBMCs' }), { target: { value: 'S-2' } })
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(true)
    const action = listAction('Import sample list')
    expect(action.getAttribute('aria-disabled')).toBe('true')
    fireEvent.keyDown(action, { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Discard unsaved entries' }))
    expect(api.blocker.mock.lastCall?.[0].shouldBlockFn()).toBe(false)
    expect(listAction('Import sample list').getAttribute('aria-disabled')).not.toBe('true')
    expect(api.add).not.toHaveBeenCalled()
  })
  it('previews an import for an empty roster without saving and requires a separate confirmation', async () => {
    api.preview.mockResolvedValue({ previewId: 'preview', validRowCount: 1, blankRowCount: 0, rows: [{ rowNumber: 2, customerSampleId: 'S-2', biologicalSource: 'Human PBMCs', tubeCount: 3 }], errors: [] })
    renderPanel({ ...order, samples: [], canFinalizeSamples: false })
    fireEvent.click(listAction('Import sample list'))
    fireEvent.change(screen.getByLabelText(/^Sample CSV/), { target: { files: [new File(['customer_sample_id,biological_source,tube_count\nS-2,Human PBMCs,3'], 'samples.csv')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))
    await screen.findByText('S-2')
    expect(api.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft sample list' }))
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith('job', 'preview', 4))
  })
})
