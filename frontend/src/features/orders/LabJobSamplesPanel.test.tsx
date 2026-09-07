import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LabServiceOrder } from '#/api/order-management'
import { LabJobSamplesPanel } from './LabJobSamplesPanel'

const api = vi.hoisted(() => ({ finalize: vi.fn(), preview: vi.fn(), confirm: vi.fn() }))
vi.mock('#/api/order-management', () => ({
  finalizeLabSampleRoster: api.finalize, previewLabSampleImport: api.preview, confirmLabSampleImport: api.confirm,
  deleteLabSample: vi.fn(), downloadLabSampleTemplate: vi.fn(), getOrderErrorMessage: (error: Error) => error.message,
}))
vi.mock('./LabSampleDialog', () => ({ LabSampleDialog: () => null }))
vi.mock('#/features/sample-shipping/RelatedSampleShipments', () => ({ RelatedSampleShipments: () => <p>Related shipments</p> }))
const order = { id: 'job', orderNumber: 'ABC12345', version: 4, canEditSamples: true, canFinalizeSamples: true,
  requestedSpecimenCount: 1, sourceGroups: [{ id: 'source', biologicalSource: 'Human PBMCs', specimenCount: 1 }],
  samples: [{ id: 'sample', customerSampleId: 'S-1', biologicalSource: 'Human PBMCs', quantity: 2, status: 'Expected' }],
} as LabServiceOrder
function renderPanel() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><LabJobSamplesPanel order={order} /></QueryClientProvider>) }

describe('Customer sample-list authorization', () => {
  beforeEach(() => { vi.clearAllMocks(); api.finalize.mockResolvedValue(order); api.confirm.mockResolvedValue(order) })
  it('requires explicit no-PHI confirmation before finalizing the accepted list', async () => {
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Review and finalize list' }))
    const submit = screen.getByRole('button', { name: 'Finalize sample list' })
    expect(submit).toHaveProperty('disabled', true)
    expect(api.finalize).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(submit)
    await waitFor(() => expect(api.finalize).toHaveBeenCalledWith('job', 4))
  })
  it('previews an import without changing the saved list and requires a separate replacement confirmation', async () => {
    api.preview.mockResolvedValue({ previewId: 'preview', validRowCount: 1, blankRowCount: 0, rows: [{ rowNumber: 2, customerSampleId: 'S-2', biologicalSource: 'Human PBMCs', tubeCount: 3 }], errors: [] })
    renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Import sample list' }))
    fireEvent.change(screen.getByLabelText(/^Sample CSV/), { target: { files: [new File(['customer_sample_id,biological_source,tube_count\nS-2,Human PBMCs,3'], 'samples.csv')] } })
    fireEvent.click(screen.getByRole('button', { name: 'Preview CSV' }))
    await screen.findByText('S-2')
    expect(api.confirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Replace draft sample list' }))
    await waitFor(() => expect(api.confirm).toHaveBeenCalledWith('job', 'preview', 4))
  })
})
