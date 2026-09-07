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
})
