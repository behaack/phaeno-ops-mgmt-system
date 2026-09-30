import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { kitRequestFixture } from '#/test-helpers/transportation-kit-requests'
import type { TransportationKitRequest } from '#/api/transportation-kit-requests'
import { LabJobKitDeliveryPanel } from './LabJobKitDeliveryPanel'

const mocks = vi.hoisted(() => ({ get: vi.fn(), receive: vi.fn() }))
vi.mock('#/api/transportation-kit-requests', () => ({ getLabOrderTransportationKits: mocks.get, confirmTransportationKitsReceived: mocks.receive }))

const dispatched: TransportationKitRequest = { ...kitRequestFixture, status: 'Dispatched', canConfirmReceipt: true, kits: [
  { stockKitId: 'kit-1', kitNumber: 'KIT-001', requestLineId: kitRequestFixture.lines[0].id, containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, outboundCarrier: 'Carrier', outboundTrackingNumber: 'TRACK-1', dispatchedAt: '2026-09-29T12:00:00Z', receivedAt: null },
  { stockKitId: 'kit-2', kitNumber: 'KIT-002', requestLineId: kitRequestFixture.lines[0].id, containerDefinitionId: kitRequestFixture.lines[0].containerDefinitionId, outboundCarrier: 'Carrier', outboundTrackingNumber: 'TRACK-2', dispatchedAt: '2026-09-29T12:00:00Z', receivedAt: null },
] }

beforeEach(() => { vi.clearAllMocks(); mocks.get.mockResolvedValue(dispatched); mocks.receive.mockResolvedValue(dispatched) })

describe('Customer physical kit receipt', () => {
  it('blocks an empty or wrong barcode, then accepts the selected physical kit', async () => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LabJobKitDeliveryPanel orderId={dispatched.jobId} canConfirm /></QueryClientProvider>)
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm KIT-001 received' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm physical kit receipt' })
    const barcode = within(dialog).getByRole('textbox', { name: 'Physical kit barcode' }) as HTMLInputElement
    const confirm = within(dialog).getByRole('button', { name: 'Confirm physical receipt' })
    await waitFor(() => expect(document.activeElement).toBe(barcode))

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
