import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabBatchBarcodeScanner } from './LabBarcodeScanner'

const api = vi.hoisted(() => ({
  addLabBatchMember: vi.fn(),
  scanLabContainer: vi.fn(),
}))

vi.mock('#/api/lab-operations', () => ({
  addLabBatchMember: api.addLabBatchMember,
  scanLabContainer: api.scanLabContainer,
  getLabOperationsError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}))

describe('LabBatchBarcodeScanner', () => {
  beforeEach(() => {
    api.addLabBatchMember.mockReset()
    api.scanLabContainer.mockReset()
  })

  it('adds a scanned QC-passed library and keeps the scanner ready', async () => {
    api.scanLabContainer.mockResolvedValue({
      labWorkOrderId: 'work-1',
      commercialOrderNumber: 'LAB-1001',
      accessionNumber: 'ACC-1',
      parentBarcode: 'PH-S-23456789AB-C',
      labLibraryId: 'library-1',
      libraryStatus: 'QcPassed',
      container: {
        id: 'container-1',
        labSpecimenId: 'specimen-1',
        parentContainerId: 'parent-1',
        kind: 'Library',
        barcode: 'PH-L-23456789AB-C',
        label: 'Library one',
        labelPrintCount: 1,
        location: 'Rack A',
        quantity: 10,
        quantityUnit: 'uL',
        status: 'Available',
        retainUntilUtc: null,
        version: 1,
      },
    })
    api.addLabBatchMember.mockResolvedValue({})
    const onAdded = vi.fn().mockResolvedValue(undefined)

    renderWithClient(
      <LabBatchBarcodeScanner
        batches={[{
          id: 'batch-1',
          batchNumber: 'BATCH-1',
          name: 'Reference sequencing batch',
          batchType: 'ExternalSequencing',
          status: 'Draft',
          startedAtUtc: null,
          completedAtUtc: null,
          notes: null,
          memberCount: 0,
          sendoutId: null,
          sendoutStatus: null,
          sendoutVersion: null,
          version: 1,
        }]}
        onAdded={onAdded}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Draft batch/), {
      target: { value: 'batch-1' },
    })
    const scanner = screen.getByLabelText(/Library barcode/)
    fireEvent.change(scanner, { target: { value: 'PH-L-23456789AB-C' } })
    fireEvent.submit(scanner.closest('form')!)

    await waitFor(() => expect(api.addLabBatchMember).toHaveBeenCalledWith(
      'batch-1',
      { labWorkOrderId: 'work-1', labLibraryId: 'library-1' },
    ))
    expect(await screen.findByText(/was added to the selected batch/)).toBeTruthy()
    expect((scanner as HTMLInputElement).value).toBe('')
    expect(document.activeElement).toBe(scanner)
  })

  it.each([
    [null, null, 'The scanned container is not a prepared library.'],
    ['library-1', 'Batched', 'This library is already assigned to a sequencing batch. Open its preparation record to view the assignment.'],
    ['library-1', 'QcFailed', 'Only a QC-passed library can be added to a draft batch.'],
  ])('rejects scanned library %s in state %s with specific feedback', async (labLibraryId, libraryStatus, message) => {
    api.scanLabContainer.mockResolvedValue({
      labWorkOrderId: 'work-1',
      labLibraryId,
      libraryStatus,
      container: { barcode: 'PH-S-23456789AB-C' },
    })

    renderWithClient(
      <LabBatchBarcodeScanner
        batches={[{
          id: 'batch-1',
          batchNumber: 'BATCH-1',
          name: 'Reference sequencing batch',
          batchType: 'ExternalSequencing',
          status: 'Draft',
          startedAtUtc: null,
          completedAtUtc: null,
          notes: null,
          memberCount: 0,
          sendoutId: null,
          sendoutStatus: null,
          sendoutVersion: null,
          version: 1,
        }]}
        onAdded={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Draft batch/), {
      target: { value: 'batch-1' },
    })
    const scanner = screen.getByLabelText(/Library barcode/)
    fireEvent.change(scanner, { target: { value: 'PH-S-23456789AB-C' } })
    fireEvent.submit(scanner.closest('form')!)

    expect(await screen.findByText(message)).toBeTruthy()
    expect(api.addLabBatchMember).not.toHaveBeenCalled()
    expect((scanner as HTMLInputElement).value).toBe('PH-S-23456789AB-C')
    expect(document.activeElement).toBe(scanner)
  })
})

function renderWithClient(children: React.ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  )
}
