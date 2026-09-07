import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabReceiptAccessionPanel } from './LabReceiptAccessionPanel'

const api = vi.hoisted(() => ({ packet: vi.fn(), tube: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ scanSampleShippingPacket: api.packet, scanRegisteredSampleTube: api.tube }))
vi.mock('#/features/orders/ReturnKitFulfillmentPanel', () => ({ ReturnKitFulfillmentPanel: () => null }))
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, search }: { children: ReactNode; search?: Record<string, string> }) => <a href={`#work?${new URLSearchParams(search).toString()}`}>{children}</a>,
}))

describe('LabReceiptAccessionPanel navigation', () => {
  beforeEach(() => {
    api.packet.mockReset()
    api.tube.mockReset()
    api.packet.mockResolvedValue({
      packetNumber: 'PACKET-1', barcode: 'PH-P-23456789AB-C', packetRevision: 1, isVoided: false,
      shipmentId: 'shipment-1', shipmentStatus: 'Shipped', organizationName: 'Example Customer',
      authorizationSource: 'CustomerLabServiceOrder', authorizationReference: 'LAB-1',
      expectedSampleCount: 1, receivedSampleCount: 0, receiptState: 'AwaitingReceipt',
      labWorkOrderId: 'work-1', labWorkStatus: 'AwaitingSpecimens', destinationName: 'Lab', crosswalk: [],
    })
  })

  it('carries the checked shipment, packet and tube into receipt and accession', async () => {
    api.tube.mockResolvedValue({ isExpected: true, isAccessioned: false, supplierTubeBarcode: 'TUBE-1', customerSampleId: 'SAMPLE-1' })
    const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
    render(<QueryClientProvider client={client}><LabReceiptAccessionPanel apiEnabled workOrders={[]} /></QueryClientProvider>)
    const scanner = screen.getByLabelText('Shipment-packet barcode')
    fireEvent.change(scanner, { target: { value: 'PH-P-23456789AB-C' } })
    fireEvent.submit(scanner.closest('form')!)
    const workLink = await screen.findByRole('link', { name: 'Open Lab work' })
    expect(workLink.getAttribute('href')).toContain('section=receipt')
    expect(workLink.getAttribute('href')).toContain('shipmentId=shipment-1')
    expect(workLink.getAttribute('href')).toContain('packet=PH-P-23456789AB-C')
    const tube = screen.getByLabelText('Supplier tube barcode')
    fireEvent.change(tube, { target: { value: 'TUBE-1' } })
    fireEvent.submit(tube.closest('form')!)
    const receiptLink = await screen.findByRole('link', { name: 'Continue to receipt and accession' })
    expect(receiptLink.getAttribute('href')).toContain('shipmentId=shipment-1')
    expect(receiptLink.getAttribute('href')).toContain('tube=TUBE-1')
    expect(receiptLink.getAttribute('href')).toContain('tab=specimens')
  })
})
