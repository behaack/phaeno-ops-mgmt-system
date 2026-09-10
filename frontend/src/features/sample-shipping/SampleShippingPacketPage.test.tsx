import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { SampleShippingPacketPage } from './SampleShippingPacketPage'
import type { ShippingInsertIdentity } from './shipping-insert-acknowledgement'

const api = vi.hoisted(() => ({ getPacket: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShippingPacket: api.getPacket }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))

const packet = {
  shipment: {
    shipmentNumber: 'SHIP-1', authorizationReference: 'LAB-1',
    currentPacket: { id: 'packet-1', packetNumber: 'PACKET-1', barcode: 'PH-P-23456789AB-C', revision: 1 },
  },
  destinationSnapshotJson: '{}', instructionSnapshotJson: '{}', manifestSnapshotJson: '{}',
}

function show(autoPrint = false, onAutoPrint?: (insert: ShippingInsertIdentity) => void) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['sample-shipping-packet', 'shipment-1'], packet)
  render(<QueryClientProvider client={client}><SampleShippingPacketPage shipmentId="shipment-1" autoPrint={autoPrint} onAutoPrint={onAutoPrint} /></QueryClientProvider>)
  return client
}

describe('SampleShippingPacketPage', () => {
  beforeEach(() => { api.getPacket.mockReset(); vi.spyOn(window, 'print').mockImplementation(() => undefined) })
  afterEach(() => { vi.restoreAllMocks() })

  it('checks a fresh cached packet and renders the current revision before printing once', async () => {
    let resolvePacket!: (value: typeof packet) => void
    api.getPacket.mockImplementation(() => new Promise<typeof packet>((resolve) => { resolvePacket = resolve }))
    const printDocument = vi.fn(() => window.print())
    const client = show(true, printDocument)
    expect(screen.queryByRole('button', { name: 'Print shipping insert' })).toBeNull()
    expect(window.print).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Back to shipment' })).toBeTruthy()
    await waitFor(() => expect(api.getPacket).toHaveBeenCalledWith('shipment-1'))
    const current = { ...packet, shipment: { ...packet.shipment, currentPacket: { ...packet.shipment.currentPacket, revision: 2 } } }
    vi.mocked(window.print).mockImplementation(() => { expect(screen.getByText(/Revision 2/)).toBeTruthy() })
    resolvePacket(current)
    expect(await screen.findByRole('button', { name: 'Print shipping insert' })).toBeTruthy()
    expect(screen.getByText(/Revision 2/)).toBeTruthy()
    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1))
    expect(printDocument).toHaveBeenCalledTimes(1)
    expect(printDocument).toHaveBeenCalledWith({ id: 'packet-1', revision: 2, packetNumber: 'PACKET-1' })
    expect(document.querySelector('.shipping-packet')?.getAttribute('data-packet-id')).toBe('packet-1')
    expect(document.querySelector('.shipping-packet')?.getAttribute('data-packet-revision')).toBe('2')
    api.getPacket.mockResolvedValue(current)
    await act(async () => { await client.refetchQueries({ queryKey: ['sample-shipping-packet', 'shipment-1'] }) })
    expect(window.print).toHaveBeenCalledTimes(1)
    fireEvent.click(await screen.findByRole('button', { name: 'Print shipping insert' }))
    expect(window.print).toHaveBeenCalledTimes(2)
  })

  it('keeps an old cached packet unprintable when the current revision cannot be checked', async () => {
    api.getPacket.mockRejectedValue(new Error('Current packet is unavailable.'))
    show(true)
    expect(await screen.findByText('Shipping insert unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Print shipping insert' })).toBeNull()
    expect(window.print).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to shipment' })).toBeTruthy()
  })

  it('keeps the receiving sheet minimal and retains frozen split details in the Portal', async () => {
    const common = { submittedSpecimenId: 'specimen-1', customerSampleId: 'RNA-SPLIT', sampleName: 'Extracted RNA', sampleTypeName: 'RNA', sampleBarcode: 'PH-M-SPECIMEN1', totalSampleTubeCount: 4, tubeCount: 2, otherShipments: [{ shipmentId: 'shipment-2', shipmentNumber: 'SHIP-OTHER', tubeCount: 1 }], unallocatedTubeCount: 1 }
    api.getPacket.mockResolvedValue({ ...packet, manifestSnapshotJson: JSON.stringify({ orderBarcode: 'PH-O-ORDER1', shipmentBarcode: 'PH-S-SHIPMENT1', container: { definitionId: 'container-20', commonName: 'Frozen container name', sku: '000-20', capacity: 20 }, containerKit: { id: 'stock-1', kitNumber: 'KIT-FROZEN-001', barcode: 'KIT-FROZEN-001' }, samples: [{ ...common, tubeOrdinal: 1, supplierTubeBarcode: 'TUBE_0001' }, { ...common, tubeOrdinal: 2, supplierTubeBarcode: 'TUBE_0002' }] }), shipment: { ...packet.shipment, container: { commonName: 'Current revised name', sku: 'CHANGED', capacity: 99 }, assignedContainer: { kitNumber: 'KIT-LIVE-OTHER', barcode: 'KIT-LIVE-OTHER' } } })
    show()
    await screen.findByRole('button', { name: 'Print shipping insert' })
    expect(window.print).not.toHaveBeenCalled()
    const receiving = screen.getByRole('region', { name: 'Receiving barcodes' })
    expect(within(receiving).getAllByRole('img')).toHaveLength(2)
    expect(within(receiving).getByRole('img', { name: 'Shipping insert revision barcode PH-P-23456789AB-C' })).toBeTruthy()
    expect(within(screen.getByRole('region', { name: 'Receiving summary' })).getByText('1 sample · 2 tubes')).toBeTruthy()
    expect(document.querySelector('.packet-header .shipping-barcode')).toBeNull()
    const details = screen.getByText('Full packing instructions and sample / tube list').closest('details')!
    expect(details.open).toBe(false)
    details.open = true
    expect(screen.getByRole('img', { name: 'Order barcode PH-O-ORDER1' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Shipment barcode PH-S-SHIPMENT1' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Container barcode KIT-FROZEN-001' })).toBeTruthy()
    expect(screen.queryByText('KIT-LIVE-OTHER')).toBeNull()
    expect(screen.getAllByRole('img', { name: 'Sample barcode PH-M-SPECIMEN1' })).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Permanent tube barcode TUBE_0001' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Permanent tube barcode TUBE_0002' })).toBeTruthy()
    expect(screen.getByText('2 of 4 tubes in this shipment')).toBeTruthy()
    expect(screen.getByText('1 tube in shipment SHIP-OTHER')).toBeTruthy()
    expect(screen.getByText('1 tube is not yet allocated to a shipment.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Other tubes for this sample/ })).toBeTruthy()
    expect(screen.getByText(/Frozen container name/)).toBeTruthy()
    expect(screen.queryByText('Current revised name')).toBeNull()
    expect(screen.getAllByRole('img', { name: /Permanent tube barcode/ })).toHaveLength(2)
  })

  it('retains a legacy frozen crosswalk in the Portal without inventing identifiers', async () => {
    api.getPacket.mockResolvedValue({ ...packet, manifestSnapshotJson: JSON.stringify({ samples: [{ customerSampleId: 'LEGACY-1', sampleName: 'Legacy RNA', supplierTubeBarcode: 'LEGACY-TUBE' }] }) })
    show()
    await screen.findByRole('button', { name: 'Print shipping insert' })
    screen.getByText('Full packing instructions and sample / tube list').closest('details')!.open = true
    expect(screen.getByRole('img', { name: 'Permanent tube barcode LEGACY-TUBE' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /^Sample barcode/ })).toBeNull()
    expect(screen.queryByRole('img', { name: /^Container barcode/ })).toBeNull()
  })

  it('withholds a voided packet even if a cached response contains it', async () => {
    api.getPacket.mockResolvedValue({ ...packet, shipment: { ...packet.shipment, currentPacket: { ...packet.shipment.currentPacket, isVoided: true } } })
    show(true)
    expect(await screen.findByText('Shipping insert no longer current')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Print shipping insert' })).toBeNull()
    expect(window.print).not.toHaveBeenCalled()
  })
})
