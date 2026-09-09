import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'

const api = vi.hoisted(() => ({ finalize: vi.fn(), preview: vi.fn(), confirm: vi.fn() }))
vi.mock('#/api/order-management', () => ({
  finalizeLabSampleRoster: api.finalize, previewLabSampleImport: api.preview, confirmLabSampleImport: api.confirm,
  deleteLabSample: vi.fn(), downloadLabSampleTemplate: vi.fn(), getOrderErrorMessage: (error: Error) => error.message,
}))
vi.mock('./LabSampleDialog', () => ({ LabSampleDialog: ({ biologicalSource }: { biologicalSource?: string }) => <p data-testid="selected-source">{biologicalSource}</p> }))
vi.mock('#/features/sample-shipping/RelatedSampleShipments', () => ({ RelatedSampleShipments: () => <p>Related shipments</p> }))
const order = { id: 'job', orderNumber: 'ABC12345', version: 4, canEditSamples: true, canFinalizeSamples: true,
  requestedSpecimenCount: 1, sourceGroups: [{ id: 'source', biologicalSource: 'Human PBMCs', specimenCount: 1 }],
  samples: [{ id: 'sample', customerSampleId: 'S-1', biologicalSource: 'Human PBMCs', quantity: 2, status: 'Expected' }],
} as LabServiceOrder
function renderPanel(value = order) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabJobSamplesPanel order={value} /></QueryClientProvider>) }

describe('Customer sample-list authorization', () => {
  beforeEach(() => { vi.clearAllMocks(); api.finalize.mockResolvedValue(order); api.confirm.mockResolvedValue(order) })
  it('groups sample records under their accepted source and keeps empty groups visible', () => {
    renderPanel({ ...order, requestedSpecimenCount: 3, canFinalizeSamples: false,
      sourceGroups: [...order.sourceGroups, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 2, version: 1 }],
      samples: [{ ...order.samples[0], biologicalSource: '  human pbmcs  ', quantity: 5 }],
    })
    const human = screen.getByRole('region', { name: 'Human PBMCs' })
    expect(within(human).getByText('1 of 1 sample')).toBeTruthy()
    expect(within(human).getByRole('img', { name: 'Human PBMCs sample count is complete' })).toBeTruthy()
    expect(within(human).getByText('5 tubes')).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Edit sample S-1' })).toBeTruthy()
    expect(within(human).queryByText('Expected')).toBeNull()
    expect(screen.getAllByText('Human PBMCs')).toHaveLength(1)
    expect(within(screen.getByRole('region', { name: 'Mouse liver' })).getByText('0 of 2 samples')).toBeTruthy()
    expect(screen.queryByRole('img', { name: 'Mouse liver sample count is complete' })).toBeNull()
    expect(within(human).getByRole('button', { name: 'Add sample to Human PBMCs' })).toHaveProperty('disabled', true)
    const add = within(screen.getByRole('region', { name: 'Mouse liver' })).getByRole('button', { name: 'Add sample to Mouse liver' })
    expect(add).toHaveProperty('disabled', false)
    fireEvent.click(add)
    expect(screen.getByTestId('selected-source').textContent).toBe('Mouse liver')
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
    expect(within(human).getByRole('button', { name: 'Edit sample S-1' })).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Remove sample S-2' })).toBeTruthy()
    expect(within(human).getByRole('button', { name: 'Add sample to Human PBMCs' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Add sample to Mouse liver' })).toHaveProperty('disabled', false)
    expect(api.finalize).not.toHaveBeenCalled()
  })
  it.each(['Human PBMCs', 'Unlisted source'])('blocks finalization when the total is correct but a sample belongs to %s instead of its required source', source => {
    renderPanel({ ...order, requestedSpecimenCount: 2,
      sourceGroups: [...order.sourceGroups, { id: 'mouse', biologicalSource: 'Mouse liver', specimenCount: 1, version: 1 }],
      samples: [order.samples[0], { ...order.samples[0], id: 'second', customerSampleId: 'S-2', biologicalSource: source }],
    })
    expect(screen.getByText('S-2')).toBeTruthy()
    expect(screen.getAllByRole('button', { name: /^Add sample to/ }).every(button => (button as HTMLButtonElement).disabled)).toBe(true)
    const finalize = screen.getByRole('button', { name: 'Review and finalize list' })
    expect(finalize).toHaveProperty('disabled', true)
    fireEvent.click(finalize)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.finalize).not.toHaveBeenCalled()
    if (source === 'Unlisted source') {
      const unmatched = screen.getByRole('region', { name: source })
      expect(within(unmatched).getByText(/not in the accepted list/)).toBeTruthy()
      expect(within(unmatched).getByRole('button', { name: 'Edit sample S-2' })).toBeTruthy()
      expect(within(unmatched).queryByRole('button', { name: /^Add sample to/ })).toBeNull()
    }
    expect(screen.queryByRole('img', { name: 'All sample counts are complete' })).toBeNull()
  })
  it('protects entered samples from import while keeping the CSV template available', () => {
    renderPanel()
    const importButton = screen.getByRole('button', { name: 'Import sample list' })
    expect(importButton).toHaveProperty('disabled', true)
    expect(screen.getByText('Remove all samples before importing a new list.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Download CSV template' })).toHaveProperty('disabled', false)
    fireEvent.click(importButton)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(api.preview).not.toHaveBeenCalled()
    expect(api.confirm).not.toHaveBeenCalled()
  })
  it('requires explicit no-PHI confirmation before finalizing the accepted list', async () => {
    renderPanel()
    expect(screen.getByRole('img', { name: 'All sample counts are complete' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Review and finalize list' }))
    const submit = screen.getByRole('button', { name: 'Finalize sample list' })
    expect(submit).toHaveProperty('disabled', true)
    expect(api.finalize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(submit)
    await waitFor(() => expect(api.finalize).toHaveBeenCalledWith('job', 4))
  })
  it('previews an import for an empty roster without saving and requires a separate confirmation', async () => {
    api.preview.mockResolvedValue({ previewId: 'preview', validRowCount: 1, blankRowCount: 0, rows: [{ rowNumber: 2, customerSampleId: 'S-2', biologicalSource: 'Human PBMCs', tubeCount: 3 }], errors: [] })
    renderPanel({ ...order, samples: [], canFinalizeSamples: false })
    fireEvent.click(screen.getByRole('button', { name: 'Import sample list' }))
    fireEvent.change(screen.getByLabelText(/^Sample CSV/), { target: { files: [new File(['customer_sample_id,biological_source,tube_count\nS-2,Human PBMCs,3'], 'samples.csv')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))
    await screen.findByText('S-2')
    expect(api.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft sample list' }))
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith('job', 'preview', 4))
  })
})
