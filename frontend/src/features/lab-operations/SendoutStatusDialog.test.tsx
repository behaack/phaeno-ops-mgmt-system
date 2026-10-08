import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import type { LabBatch, LabBatchDetail } from '#/api/lab-operations'
import { SendoutStatusDialog } from './SendoutStatusDialog'

const transition = vi.hoisted(() => vi.fn())
vi.mock('@tanstack/react-router', async importOriginal => ({ ...await importOriginal<object>(), useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/lab-operations', async importOriginal => ({ ...await importOriginal<object>(), transitionLabSendout: transition }))
const batch: LabBatch = { id: 'batch', batchNumber: 'PH-BAT-TEST', name: 'Test batch', libraryExceptionCount: 0, vendorOutcome: null, providerName: null, trackingReference: null, expectedCompletionAtUtc: null, resultsVersion: null, runNotPerformed: null, resultsReceivedAtUtc: null, batchType: 'ExternalSequencing', status: 'InProgress', startedAtUtc: null, completedAtUtc: null, notes: null, memberCount: 1, sendoutId: 'sendout', sendoutStatus: 'Shipped', sendoutVersion: 7, version: 2 }
const sendout: NonNullable<LabBatchDetail['sendout']> = { id: 'sendout', providerName: 'Test provider', providerReference: 'VENDOR-1', vendorSupplierId: 'vendor', vendorProductId: 'service', vendorShipmentAddressId: 'address', vendorShipmentAddressVersion: 1, vendorProductName: 'Sequencing service', vendorShipmentAddressLabel: 'Receiving dock', manifestJson: '{}', destination: '1 Test Street', carrier: 'Carrier', trackingReference: 'TRACK-1', expectedCompletionAtUtc: null, shippedAtUtc: null, providerReceivedAtUtc: null, sequencingStartedAtUtc: null, sequencingCompletedAtUtc: null, runNotPerformed: null, resultsReceivedAtUtc: null, outcome: null, outcomeAtUtc: null, outcomeNote: null }
beforeEach(() => transition.mockReset().mockResolvedValue(batch))

it('requires reviewed provider evidence and submits the actual time with the original sendout version', async () => {
  transition.mockResolvedValue(batch)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const close = vi.fn()
  render(<QueryClientProvider client={client}><SendoutStatusDialog batch={batch} status="ReceivedByProvider" sendout={sendout} onClose={close} onSaved={vi.fn().mockResolvedValue(undefined)} /></QueryClientProvider>)
  const dialog = screen.getByRole('dialog', { name: 'Mark vendor received' })
  expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' }))
  expect(dialog.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('Test provider')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mark vendor received' }))
  expect(await screen.findByText('Record the provider or custody evidence.')).toBeTruthy()
  expect(transition).not.toHaveBeenCalled()
  expect(screen.getByText('Record the vendor completion ETA.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText(/Actual occurrence time/), { target: { value: '2026-10-04T10:30:00' } })
  fireEvent.change(screen.getByLabelText(/Provider or custody evidence/), { target: { value: 'Provider confirmed receipt of sealed tubes.' } })
  fireEvent.change(screen.getByLabelText(/Vendor reference/), { target: { value: 'REF-1' } })
  fireEvent.change(screen.getByLabelText(/Vendor expected completion/), { target: { value: '2026-10-10T10:30:00' } })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Mark vendor received' }))
  await waitFor(() => expect(transition).toHaveBeenCalledWith('sendout', { status: 'ReceivedByProvider', version: 7, occurredAtUtc: new Date('2026-10-04T10:30:00').toISOString(), evidence: 'Provider confirmed receipt of sealed tubes.', providerReference: 'REF-1', expectedCompletionAtUtc: new Date('2026-10-10T10:30:00').toISOString() }))
  expect(close).toHaveBeenCalledOnce()
})

it('prefills the reviewed ETA and vendor reference and retains dirty evidence when dismissal is cancelled', async () => {
  const close = vi.fn()
  render(<QueryClientProvider client={new QueryClient()}><SendoutStatusDialog batch={batch} status="ReceivedByProvider" sendout={{ ...sendout, expectedCompletionAtUtc: new Date('2026-10-10T10:30:00').toISOString() }} onClose={close} onSaved={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByLabelText(/Vendor expected completion/)).toHaveProperty('value', '2026-10-10T10:30')
  expect(screen.getByLabelText(/Vendor reference/)).toHaveProperty('value', 'VENDOR-1')
  expect(screen.getByText('TRACK-1')).toBeTruthy()
  fireEvent.change(screen.getByLabelText(/Provider or custody evidence/), { target: { value: 'Receipt evidence draft' } })
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  const confirmation = await screen.findByRole('dialog', { name: 'Discard unsaved vendor status evidence?' })
  expect(confirmation.querySelector('[data-slot="dialog-body"]')?.textContent).toContain('PH-BAT-TEST')
  expect(document.activeElement).toBe(within(confirmation).getByRole('button', { name: 'Keep reviewing' }))
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Keep reviewing' }))
  expect(screen.getByLabelText(/Provider or custody evidence/)).toHaveProperty('value', 'Receipt evidence draft')
  expect(close).not.toHaveBeenCalled()
  expect(transition).not.toHaveBeenCalled()
})

it('blocks dispatch with missing saved carrier or tracking and names the corrective action', () => {
  render(<QueryClientProvider client={new QueryClient()}><SendoutStatusDialog batch={{ ...batch, sendoutStatus: 'Preparing' }} status="Shipped" sendout={{ ...sendout, carrier: null }} onClose={vi.fn()} onSaved={vi.fn()} /></QueryClientProvider>)
  expect(screen.getByRole('button', { name: 'Mark shipped' })).toHaveProperty('disabled', true)
  expect(screen.getByRole('alert').textContent).toContain('Update shipment and ETA')
  expect(transition).not.toHaveBeenCalled()
})

it('pins the reviewed shipment and version when background refresh changes them', async () => {
  const client = new QueryClient()
  const props = { batch, status: 'ReceivedByProvider', sendout: { ...sendout, expectedCompletionAtUtc: new Date('2026-10-10T10:30:00').toISOString() }, onClose: vi.fn(), onSaved: vi.fn().mockResolvedValue(undefined) }
  const view = render(<QueryClientProvider client={client}><SendoutStatusDialog {...props} /></QueryClientProvider>)
  fireEvent.change(screen.getByLabelText(/Provider or custody evidence/), { target: { value: 'Reviewed receipt' } })
  view.rerender(<QueryClientProvider client={client}><SendoutStatusDialog {...props} batch={{ ...batch, sendoutVersion: 20 }} sendout={{ ...props.sendout, destination: 'Changed destination' }} /></QueryClientProvider>)
  expect(screen.getByText('1 Test Street')).toBeTruthy()
  expect(screen.queryByText('Changed destination')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Mark vendor received' }))
  await waitFor(() => expect(transition).toHaveBeenCalledWith('sendout', expect.objectContaining({ version: 7, evidence: 'Reviewed receipt', providerReference: 'VENDOR-1' })))
})
