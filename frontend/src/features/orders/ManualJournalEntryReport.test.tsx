import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ManualJournalEntryReport } from './ManualJournalEntryReport'

const apiMocks = vi.hoisted(() => ({
  download: vi.fn(),
  list: vi.fn(),
}))

vi.mock('#/api/order-management', () => ({
  downloadManualJournalEntries: apiMocks.download,
  getOrderErrorMessage: (_error: unknown, fallback: string) => fallback,
  listManualJournalEntries: apiMocks.list,
}))

describe('ManualJournalEntryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiMocks.download.mockResolvedValue(undefined)
    apiMocks.list.mockResolvedValue([{
      documentId: '11111111-1111-4111-8111-111111111111',
      entryId: 'JE-11111111111141118111111111111111',
      accountingDateUtc: '2026-08-26T12:00:00Z',
      organizationId: '22222222-2222-4222-8222-222222222222',
      organizationName: 'Example Customer',
      workflowType: 'LabService',
      workflowId: '33333333-3333-4333-8333-333333333333',
      workflowNumber: 'LAB-42',
      customerOrProjectReference: 'Customer study',
      purchaseOrderNumber: null,
      sourceDocumentNumber: 'LAB-42',
      currency: 'USD',
      grossAmount: 125.5,
      outstandingBalance: 125.5,
      paymentStatus: 'Outstanding',
      paymentReference: null,
      paymentRecordedAtUtc: null,
      memo: 'Lab LAB-42 for Example Customer',
      version: 1,
    }])
  })

  it('shows source records and downloads the selected date range without posting them', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    render(<QueryClientProvider client={client}><ManualJournalEntryReport apiEnabled /></QueryClientProvider>)

    expect(await screen.findByText('Example Customer')).toBeTruthy()
    expect(screen.getAllByText('$125.50')).toHaveLength(2)
    expect(screen.getByText(/Downloading does not mark a record as posted/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Download CSV' }))
    await waitFor(() => expect(apiMocks.download).toHaveBeenCalledOnce())
  })
})
