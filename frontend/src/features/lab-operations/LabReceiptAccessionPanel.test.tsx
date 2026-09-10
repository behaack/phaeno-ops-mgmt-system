import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabReceiptAccessionPanel } from './LabReceiptAccessionPanel'

const api = vi.hoisted(() => ({ packet: vi.fn(), tube: vi.fn(), identity: vi.fn(), queue: vi.fn(), receive: vi.fn(), work: vi.fn(), accession: vi.fn() }))
vi.mock('#/api/lab-operations', () => ({ getLabWorkOrder: api.work, accessionShipmentTube: api.accession }))
vi.mock('#/api/lab-shipment-receipt', () => ({ getLabShipmentQueue: api.queue, receiveLabShipment: api.receive }))
vi.mock('#/api/shipping-containers', () => ({ scanShippingIdentity: api.identity }))
vi.mock('#/api/sample-shipping', () => ({ scanSampleShippingPacket: api.packet, scanRegisteredSampleTube: api.tube }))
vi.mock('#/features/orders/ReturnKitFulfillmentPanel', () => ({ ReturnKitFulfillmentPanel: () => <p>Return-kit queue</p> }))
vi.mock('#/features/orders/stock-kits/StandardKitInventoryPanel', () => ({ StandardKitInventoryPanel: () => <p>Standard-kit queue</p> }))
vi.mock('#/features/orders/kit-requests/KitRequestsPanel', () => ({ KitRequestsPanel: () => <p>Kit-request queue</p> }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, search }: { children: ReactNode; search?: Record<string, string> }) => <a href={`#work?${new URLSearchParams(search).toString()}`}>{children}</a>,
}))

describe('LabReceiptAccessionPanel navigation', () => {
  beforeEach(() => {
    api.work.mockResolvedValue({ containers: [] })
    api.accession.mockReset()
    api.queue.mockResolvedValue([])
    api.receive.mockReset()
    api.packet.mockReset()
    api.tube.mockReset()
    api.identity.mockReset()
    api.packet.mockResolvedValue({
      packetNumber: 'PACKET-1', barcode: 'PH-P-23456789AB-C', packetRevision: 1, isVoided: false,
      containerReceivedAt: '2026-09-10T18:00:00Z', shipmentId: 'shipment-1', shipmentNumber: 'SHIP-1', shipmentStatus: 'Delivered', organizationName: 'Example Customer',
      authorizationSource: 'CustomerLabServiceOrder', authorizationReference: 'LAB-1',
      expectedSampleCount: 1, receivedSampleCount: 0, receiptState: 'AwaitingReceipt',
      labWorkOrderId: 'work-1', labWorkStatus: 'AwaitingSpecimens', destinationName: 'Lab', crosswalk: [],
    })
  })

  it('records container receipt only in Receive shipments, then opens separate tube accession', async () => {
    api.receive.mockResolvedValue({ shipmentId: 'shipment-1', shipmentNumber: 'SHIP-1', barcode: 'PH-P-23456789AB-C', receivedAt: '2026-09-10T18:00:00Z', alreadyReceived: false })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Receive shipments' }).getAttribute('aria-selected')).toBe('true')
    expect(api.receive).not.toHaveBeenCalled()
    const input = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(input, { target: { value: 'PH-P-23456789AB-C' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByText(/Shipment received.*SHIP-1/)).toBeTruthy()
    expect(api.receive).toHaveBeenCalledTimes(1)
    expect(api.tube).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Accession samples' }))
    expect(await screen.findByRole('dialog', { name: 'Accession samples in SHIP-1' })).toBeTruthy()
    expect(screen.getByRole('tab', { name: 'Accession samples', hidden: true }).getAttribute('aria-selected')).toBe('true')
    expect(api.receive).toHaveBeenCalledTimes(1)
  })

  it('lists separate expected containers and tracking numbers for the same Job', async () => {
    api.queue.mockResolvedValue([
      { id: 'one', shipmentNumber: 'SHIP-ONE', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Shipped', carrier: 'Carrier', trackingNumber: 'TRACK-ONE', expectedTubeCount: 10 },
      { id: 'two', shipmentNumber: 'SHIP-TWO', organizationName: 'Customer', authorizationReference: 'JOB-1', labWorkOrderId: 'work-1', destinationName: 'Lab', status: 'Shipped', carrier: 'Carrier', trackingNumber: 'TRACK-TWO', expectedTubeCount: 5 },
    ])
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled workOrders={[]} /></QueryClientProvider>)
    expect(await screen.findByText('TRACK-ONE')).toBeTruthy()
    expect(screen.getByText('TRACK-TWO')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'SHIP-ONE' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'SHIP-TWO' })).toBeTruthy()
    expect(api.receive).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Receive shipment' })).toBeNull()
  })

  it('shows one task at a time and preserves a receiving scan draft across tabs', async () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canManageKitSupply workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Kit requests' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Kit-request queue')).toBeTruthy()
    expect(screen.queryByText('Standard-kit queue')).toBeNull()
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Accession samples' }), { button: 0, ctrlKey: false })
    fireEvent.change(screen.getByLabelText('Shipping insert barcode'), { target: { value: 'UNFINISHED-SCAN' } })
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Prepare kits' }), { button: 0, ctrlKey: false })
    expect(screen.getByText('Standard-kit queue')).toBeTruthy()
    expect(screen.queryByText('Kit-request queue')).toBeNull()
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Accession samples' }), { button: 0, ctrlKey: false })
    expect(screen.getByLabelText('Shipping insert barcode')).toHaveProperty('value', 'UNFINISHED-SCAN')
    expect(api.packet).not.toHaveBeenCalled()
    expect(api.tube).not.toHaveBeenCalled()
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1)
  })

  it('hides configuration-only queues and supports keyboard tab selection', async () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    expect(screen.queryByRole('tab', { name: 'Kit requests' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'Prepare kits' })).toBeNull()
    const receiving = screen.getByRole('tab', { name: 'Receive shipments' })
    act(() => receiving.focus())
    fireEvent.keyDown(receiving, { key: 'ArrowLeft' })
    await waitFor(() => expect(screen.getByRole('tab', { name: 'Kits sent' }).getAttribute('aria-selected')).toBe('true'))
    expect(screen.getByText('Return-kit queue')).toBeTruthy()
    expect(screen.queryByLabelText('Shipping insert barcode')).toBeNull()
  })

  it('opens shipment-specific legacy links in Kits sent', () => {
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled shipmentId="shipment-1" workOrders={[]} /></QueryClientProvider>)
    expect(screen.getByRole('tab', { name: 'Kits sent' }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Return-kit queue')).toBeTruthy()
  })

  it('loops through tubes and requires each freezer box before saving, then completes the container', async () => {
    const packet = await api.packet()
    packet.crosswalk = ['TUBE-1', 'TUBE-2'].map((barcode, index) => ({ shipmentItemId: 'item-1', tubeSlotId: `slot-${index}`, supplierTubeBarcode: barcode, customerSampleId: 'SAMPLE-1', sampleName: 'Sample', tubeStatus: 'Assigned', tubeOrdinal: index + 1, tubeCount: 2 }))
    api.packet.mockResolvedValue(packet)
    api.tube.mockImplementation((_packet, barcode) => Promise.resolve({ isExpected: true, isAccessioned: false, supplierTubeBarcode: barcode, customerSampleId: 'SAMPLE-1' }))
    api.accession.mockImplementation((_work, _shipment, input) => Promise.resolve({ containers: ['TUBE-1', ...(input.supplierTubeBarcode === 'TUBE-2' ? ['TUBE-2'] : [])].map((barcode, index) => ({ barcode, location: `BOX-${index + 1}` })) }))
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: packet.barcode } })
    fireEvent.submit(scanner.closest('form')!)
    await screen.findByRole('dialog', { name: 'Accession samples in SHIP-1' })
    for (const index of [1, 2]) {
      const tube = screen.getByLabelText('Supplier tube barcode')
      fireEvent.change(tube, { target: { value: `TUBE-${index}` } })
      await waitFor(() => expect(screen.getByRole('button', { name: 'Scan tube' })).not.toHaveProperty('disabled', true))
      fireEvent.submit(tube.closest('form')!)
      const box = await screen.findByLabelText(/Freezer box barcode/)
      expect(api.accession).toHaveBeenCalledTimes(index - 1)
      fireEvent.submit(box.closest('form')!)
      expect(await screen.findByText('Scan the freezer box barcode.')).toBeTruthy()
      expect(api.accession).toHaveBeenCalledTimes(index - 1)
      fireEvent.change(box, { target: { value: `BOX-${index}` } })
      fireEvent.submit(box.closest('form')!)
      await waitFor(() => expect(api.accession).toHaveBeenCalledTimes(index))
      expect(api.accession).toHaveBeenLastCalledWith('work-1', 'shipment-1', { packetBarcode: packet.barcode, supplierTubeBarcode: `TUBE-${index}`, freezerBoxBarcode: `BOX-${index}` })
      await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Accession tube' })).toBeNull())
      if (index === 1) await waitFor(() => expect(document.activeElement).toBe(screen.getByLabelText('Supplier tube barcode')))
    }
    expect(await screen.findByText('2 of 2 expected tubes accessioned — container complete')).toBeTruthy()
    expect(screen.getByText('BOX-1')).toBeTruthy()
    expect(screen.getByText('BOX-2')).toBeTruthy()
    expect(screen.queryByLabelText('Supplier tube barcode')).toBeNull()
    expect(screen.getByRole('button', { name: 'Done' })).toBeTruthy()
    expect(api.receive).not.toHaveBeenCalled()
  })

  it('keeps an unexpected tube out of the freezer-box prompt', async () => {
    api.tube.mockResolvedValue({ isExpected: false, isAccessioned: false, supplierTubeBarcode: 'WRONG' })
    render(<QueryClientProvider client={new QueryClient()}><LabReceiptAccessionPanel apiEnabled canReceiveShipments tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: 'PH-P-23456789AB-C' } })
    fireEvent.submit(scanner.closest('form')!)
    const tube = await screen.findByLabelText('Supplier tube barcode')
    await waitFor(() => expect(api.work).toHaveBeenCalled())
    fireEvent.change(tube, { target: { value: 'WRONG' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Scan tube' })).not.toHaveProperty('disabled', true))
    fireEvent.submit(tube.closest('form')!)
    expect(await screen.findByText(/This tube does not match the container/)).toBeTruthy()
    expect(screen.queryByLabelText(/Freezer box barcode/)).toBeNull()
    expect(api.accession).not.toHaveBeenCalled()
  })

  it.each(['PH-O-11111111111141118111111111111111', 'PH-M-22222222222242228222222222222222'])('resolves %s to a manifest before comparing registered tubes', async barcode => {
    api.identity.mockResolvedValue({ kind: barcode.startsWith('PH-O') ? 'Order' : 'Sample', id: 'identity', reference: 'REFERENCE-1', shipments: [{ id: 'shipment-1', shipmentNumber: 'SHIP-1', organizationName: 'Example Customer', destinationName: 'Lab', status: 'ReadyToShip', currentPacket: { barcode: 'PH-P-23456789AB-C', packetNumber: 'PACKET-1' } }] })
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}><LabReceiptAccessionPanel apiEnabled tab="accession" workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipping insert barcode')
    fireEvent.change(scanner, { target: { value: barcode } }); fireEvent.submit(scanner.closest('form')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Open manifest PACKET-1' }))
    expect(await screen.findByRole('dialog', { name: 'Accession samples in SHIP-1' })).toBeTruthy()
    expect(api.identity).toHaveBeenCalledWith(barcode, expect.anything())
    expect(api.packet).toHaveBeenCalledWith('PH-P-23456789AB-C', expect.anything())
    expect(api.tube).not.toHaveBeenCalled()
  })
})
