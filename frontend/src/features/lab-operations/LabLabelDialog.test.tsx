import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { type LabContainer } from '#/api/lab-operations'

import { LabLabelDialog } from './LabLabelDialog'

const api = vi.hoisted(() => ({
  getLabContainerLabel: vi.fn(),
  recordLabContainerLabelPrint: vi.fn(),
}))

vi.mock('#/api/lab-operations', () => ({
  getLabContainerLabel: api.getLabContainerLabel,
  recordLabContainerLabelPrint: api.recordLabContainerLabelPrint,
  getLabOperationsError: (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback,
}))

const container: LabContainer = {
  id: 'container-1',
  labSpecimenId: 'specimen-1',
  parentContainerId: null,
  kind: 'SubmittedSpecimen',
  barcode: 'PH-S-23456789AB-C',
  label: 'Submitted specimen ACC-1',
  labelPrintCount: 0,
  location: 'Intake rack A',
  quantity: 25,
  quantityUnit: 'uL',
  status: 'Available',
  retainUntilUtc: null,
  version: 1,
}

describe('LabLabelDialog', () => {
  beforeEach(() => {
    api.getLabContainerLabel.mockReset()
    api.recordLabContainerLabelPrint.mockReset()
    api.getLabContainerLabel.mockResolvedValue({
      labWorkOrderId: 'work-1',
      commercialOrderNumber: 'LAB-1001',
      accessionNumber: 'ACC-1',
      parentBarcode: null,
      container,
      printHistory: [],
    })
    api.recordLabContainerLabelPrint.mockResolvedValue({})
  })

  it('records success only after the operator confirms the physical print', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)
    const onClose = vi.fn()
    const onRecorded = vi.fn().mockResolvedValue(undefined)

    renderWithClient(
      <LabLabelDialog
        container={container}
        onClose={onClose}
        onRecorded={onRecorded}
      />,
    )

    const reason = await screen.findByLabelText(/Print reason/)
    const openPrint = screen.getByRole('button', { name: 'Open print dialog' })
    expect((reason as HTMLInputElement).value)
      .toBe('Initial container label')
    expect(api.recordLabContainerLabelPrint).not.toHaveBeenCalled()

    fireEvent.click(openPrint)
    expect(print).toHaveBeenCalledOnce()
    expect(screen.getByText('Did the physical label print correctly?')).toBeTruthy()
    expect(api.recordLabContainerLabelPrint).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Label printed' }))

    await waitFor(() => expect(api.recordLabContainerLabelPrint).toHaveBeenCalledWith(
      container.id,
      {
        reason: 'Initial container label',
        outcome: 'Succeeded',
        failureDetails: null,
      },
    ))
    expect(onRecorded).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
    print.mockRestore()
  })

  it('requires details before recording a failed print attempt', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined)

    renderWithClient(
      <LabLabelDialog
        container={container}
        onClose={vi.fn()}
        onRecorded={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    await screen.findByLabelText(/Print reason/)
    fireEvent.click(screen.getByRole('button', { name: 'Open print dialog' }))
    const failed = screen.getByRole('button', { name: 'Record failed attempt' })
    expect((failed as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(screen.getByLabelText('Failure details'), {
      target: { value: 'Printer was offline.' },
    })
    fireEvent.click(failed)

    await waitFor(() => expect(api.recordLabContainerLabelPrint).toHaveBeenCalledWith(
      container.id,
      {
        reason: 'Initial container label',
        outcome: 'Failed',
        failureDetails: 'Printer was offline.',
      },
    ))
    print.mockRestore()
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
