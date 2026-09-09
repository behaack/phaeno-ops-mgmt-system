import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { SampleShippingPacketPage } from './SampleShippingPacketPage'

const api = vi.hoisted(() => ({ getPacket: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ getSampleShippingPacket: api.getPacket }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))

const packet = {
  shipment: {
    shipmentNumber: 'SHIP-1', authorizationReference: 'LAB-1',
    currentPacket: { packetNumber: 'PACKET-1', barcode: 'PH-P-23456789AB-C', revision: 1 },
  },
  destinationSnapshotJson: '{}', instructionSnapshotJson: '{}', manifestSnapshotJson: '{}',
}

function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['sample-shipping-packet', 'shipment-1'], packet)
  render(<QueryClientProvider client={client}><SampleShippingPacketPage shipmentId="shipment-1" /></QueryClientProvider>)
}

describe('SampleShippingPacketPage', () => {
  beforeEach(() => { api.getPacket.mockReset() })

  it('checks even a fresh cached packet before allowing it to be printed', async () => {
    let resolvePacket!: (value: typeof packet) => void
    api.getPacket.mockImplementation(() => new Promise<typeof packet>((resolve) => { resolvePacket = resolve }))
    show()
    expect(screen.queryByRole('button', { name: 'Print packet' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Back to shipment' })).toBeTruthy()
    await waitFor(() => expect(api.getPacket).toHaveBeenCalledWith('shipment-1'))
    resolvePacket({ ...packet, shipment: { ...packet.shipment, currentPacket: { ...packet.shipment.currentPacket, revision: 2 } } })
    expect(await screen.findByRole('button', { name: 'Print packet' })).toBeTruthy()
    expect(screen.getByText(/Revision 2/)).toBeTruthy()
  })

  it('keeps an old cached packet unprintable when the current revision cannot be checked', async () => {
    api.getPacket.mockRejectedValue(new Error('Current packet is unavailable.'))
    show()
    expect(await screen.findByText('Packet unavailable')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Print packet' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Back to shipment' })).toBeTruthy()
  })

  it('prints frozen order, shipment, sample and individual tube identities with separate split references', async () => {
    const common = { submittedSpecimenId: 'specimen-1', customerSampleId: 'RNA-SPLIT', sampleName: 'Extracted RNA', sampleTypeName: 'RNA', sampleBarcode: 'PH-M-SPECIMEN1', totalSampleTubeCount: 4, tubeCount: 2, otherShipments: [{ shipmentId: 'shipment-2', shipmentNumber: 'SHIP-OTHER', tubeCount: 1 }], unallocatedTubeCount: 1 }
    api.getPacket.mockResolvedValue({ ...packet, manifestSnapshotJson: JSON.stringify({ orderBarcode: 'PH-O-ORDER1', shipmentBarcode: 'PH-S-SHIPMENT1', container: { definitionId: 'container-20', commonName: 'Frozen container name', sku: '000-20', capacity: 20 }, samples: [{ ...common, tubeOrdinal: 1, supplierTubeBarcode: 'TUBE_0001' }, { ...common, tubeOrdinal: 2, supplierTubeBarcode: 'TUBE_0002' }] }), shipment: { ...packet.shipment, container: { commonName: 'Current revised name', sku: 'CHANGED', capacity: 99 } } })
    show()
    await screen.findByRole('button', { name: 'Print packet' })
    expect(screen.getByRole('img', { name: 'Order barcode PH-O-ORDER1' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Shipment barcode PH-S-SHIPMENT1' })).toBeTruthy()
    expect(screen.getAllByRole('img', { name: 'Sample barcode PH-M-SPECIMEN1' })).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Permanent tube barcode TUBE_0001' })).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Permanent tube barcode TUBE_0002' })).toBeTruthy()
    expect(screen.getByText('2 of 4 tubes in this shipment')).toBeTruthy()
    expect(screen.getByText('1 tube in shipment SHIP-OTHER')).toBeTruthy()
    expect(screen.getByText('1 tube is not yet allocated to a shipment.')).toBeTruthy()
    expect(screen.getByRole('heading', { name: /Other tubes for this sample/ })).toBeTruthy()
    expect(screen.getByText('Frozen container name')).toBeTruthy()
    expect(screen.queryByText('Current revised name')).toBeNull()
    expect(screen.getAllByRole('img', { name: /Permanent tube barcode/ })).toHaveLength(2)
  })

  it('keeps a legacy frozen crosswalk printable without inventing sample identifiers', async () => {
    api.getPacket.mockResolvedValue({ ...packet, manifestSnapshotJson: JSON.stringify({ samples: [{ customerSampleId: 'LEGACY-1', sampleName: 'Legacy RNA', supplierTubeBarcode: 'LEGACY-TUBE' }] }) })
    show()
    await screen.findByRole('button', { name: 'Print packet' })
    expect(screen.getByRole('img', { name: 'Permanent tube barcode LEGACY-TUBE' })).toBeTruthy()
    expect(screen.queryByRole('img', { name: /^Sample barcode/ })).toBeNull()
  })

  it('withholds a voided packet even if a cached response contains it', async () => {
    api.getPacket.mockResolvedValue({ ...packet, shipment: { ...packet.shipment, currentPacket: { ...packet.shipment.currentPacket, isVoided: true } } })
    show()
    expect(await screen.findByText('Packet no longer current')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Print packet' })).toBeNull()
  })
})
