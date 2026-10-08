import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRef, useState } from 'react'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
import { LabJobKitDeliveryPanel } from './LabJobKitDeliveryPanel'

const mocks = vi.hoisted(() => ({ get: vi.fn(), receive: vi.fn(), cancel: vi.fn() }))
vi.mock('@tanstack/react-router', () => ({ useBlocker: () => ({ status: 'idle' }) }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLabOrderTransportationKits: mocks.get, getTransportationKitRequest: mocks.get, cancelTransportationKitRequest: mocks.cancel, confirmTransportationKitsReceived: mocks.receive }))

const dispatched: TransportationKitRequest = { ...kitRequestFixture, status: 'Dispatched', canCancel: false, canConfirmReceipt: true, kits: [
  { stockKitId: 'kit-1', kitNumber: 'KIT-001', requestLineId: kitRequestFixture.lines[0].id, containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, outboundCarrier: 'Carrier', outboundTrackingNumber: 'TRACK-1', dispatchedAt: '2026-09-29T12:00:00Z', receivedAt: null },
  { stockKitId: 'kit-2', kitNumber: 'KIT-002', requestLineId: kitRequestFixture.lines[0].id, containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, outboundCarrier: 'Carrier', outboundTrackingNumber: 'TRACK-2', dispatchedAt: '2026-09-29T12:00:00Z', receivedAt: null },
] }

beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(dispatched); mocks.receive.mockResolvedValue(dispatched) })

function KitOrderView({ canConfirm = true }: { canConfirm?: boolean }) {
  const [open, setOpen] = useState(false)
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }))
  const trigger = useRef<HTMLButtonElement>(null)
  return <QueryClientProvider client={client}>
    <button ref={trigger} onClick={() => setOpen(true)}>View kit order</button>
    <LabJobKitDeliveryPanel orderId={dispatched.jobId} canConfirm={canConfirm} open={open} onOpenChange={setOpen} restoreFocus={() => trigger.current?.focus()} />
  </QueryClientProvider>
}

describe('Placed transportation kit order modal', () => {
  it('confirms cancellation for only an unshipped request with an optional preserved reason', async () => {
    mocks.get.mockResolvedValue(kitRequestFixture)
    mocks.cancel.mockResolvedValue({ ...kitRequestFixture, status: 'Cancelled', canCancel: false })
    render(<KitOrderView />)
    fireEvent.click(screen.getByRole('button', { name: 'View kit order' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Cancel kit request' }))
    const dialog = screen.getByRole('dialog', { name: 'Cancel kit order?' })
    expect(dialog.querySelector('[data-slot="dialog-body"]')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Keep kit request' })))
    fireEvent.change(screen.getByRole('textbox', { name: 'Reason (optional)' }), { target: { value: 'Prepare this phase next month.' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel kit request' }))
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith(kitRequestFixture.id,
      { version: kitRequestFixture.version, reason: 'Prepare this phase next month.' }, expect.any(String)))
  })
  it('opens the saved pending order, quantities and address, then restores the invoking control', async () => {
    mocks.get.mockResolvedValue(kitRequestFixture)
    render(<KitOrderView />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(mocks.get).not.toHaveBeenCalled()
    const trigger = screen.getByRole('button', { name: 'View kit order' })
    fireEvent.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Transportation kit order' })
    expect(await within(dialog).findByText('Kit order received by Phaeno')).toBeTruthy()
    expect(within(dialog).getByText('100 Science Avenue')).toBeTruthy()
    expect(within(dialog).getByRole('row', { name: /20-tube transportation kit.*2 0 0/ })).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: /Confirm .* received/ })).toBeNull()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close kit order' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(document.activeElement).toBe(trigger)
    expect(mocks.receive).not.toHaveBeenCalled()
  })

  it('returns from receipt to tracking without stacking dialogs or recording a receipt', async () => {
    render(<KitOrderView />)
    fireEvent.click(screen.getByRole('button', { name: 'View kit order' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm KIT-001 received' }))
    const receipt = screen.getByRole('dialog', { name: 'Confirm physical kit receipt' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(within(receipt).getByText('TRACK-1')).toBeTruthy()
    fireEvent.click(within(receipt).getByRole('button', { name: 'Cancel' }))
    const overview = screen.getByRole('dialog', { name: 'Transportation kit order' })
    expect(within(overview).getByText('Carrier · Tracking TRACK-2')).toBeTruthy()
    await waitFor(() => expect(document.activeElement).toBe(within(overview).getByRole('button', { name: 'Close kit order' })))
    expect(mocks.receive).not.toHaveBeenCalled()
  })

  it('keeps tracking viewable without exposing administrator receipt commands', async () => {
    render(<KitOrderView canConfirm={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'View kit order' }))
    expect(await screen.findByText('Carrier · Tracking TRACK-1')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Confirm .* received/ })).toBeNull()
    expect(mocks.receive).not.toHaveBeenCalled()
  })
})

describe('Customer physical kit receipt', () => {
  it('blocks an empty or wrong barcode, then accepts the selected physical kit', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LabJobKitDeliveryPanel orderId={dispatched.jobId} canConfirm open onOpenChange={vi.fn()} restoreFocus={vi.fn()} /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm KIT-001 received' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm physical kit receipt' })
    const barcode = within(dialog).getByRole('textbox', { name: 'Physical kit barcode' }) as HTMLInputElement
    const confirm = within(dialog).getByRole('button', { name: 'Confirm physical receipt' })
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    await waitFor(() => expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Cancel' })))

    fireEvent.click(confirm)
    expect(within(dialog).getByText('Scan the physical kit barcode before confirming receipt.')).toBeTruthy()
    expect(mocks.receive).not.toHaveBeenCalled()

    fireEvent.change(barcode, { target: { value: 'KIT-002' } })
    fireEvent.keyDown(barcode, { key: 'Enter' })
    expect(within(dialog).getByText('This barcode does not match the selected kit. Check the physical kit and try again.')).toBeTruthy()
    expect(barcode.value).toBe('KIT-002')
    fireEvent.click(confirm)
    expect(mocks.receive).not.toHaveBeenCalled()

    fireEvent.change(barcode, { target: { value: ' kit-001 ' } })
    fireEvent.keyDown(barcode, { key: 'Enter' })
    expect(document.activeElement).toBe(confirm)
    fireEvent.click(confirm)
    await waitFor(() => expect(mocks.receive).toHaveBeenCalledWith(dispatched.id,
      { version: dispatched.version, stockKitIds: ['kit-1'], scannedKitBarcode: 'kit-001' }, expect.any(String)))
  })
})
