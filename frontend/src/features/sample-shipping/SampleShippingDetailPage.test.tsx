import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SampleShipmentWorkflow } from '#/api/sample-shipping'
import {
  PhaenoSessionContext,
  type PhaenoSessionContextValue,
} from '#/features/auth/session-context'
import { noSessionCapabilities } from '#/test-helpers/session'

import { SampleShippingDetailPage } from './SampleShippingDetailPage'

const api = vi.hoisted(() => ({
  assignSampleTube: vi.fn(),
  downloadSampleShippingCrosswalk: vi.fn(),
  getSampleShipment: vi.fn(),
  issueSampleShippingPacket: vi.fn(),
  recordSampleShipment: vi.fn(),
}))

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: { children: ReactNode }) => <a href="#sample-shipping">{children}</a>,
}))

vi.mock('#/api/sample-shipping', () => ({
  assignSampleTube: api.assignSampleTube,
  downloadSampleShippingCrosswalk: api.downloadSampleShippingCrosswalk,
  getSampleShipment: api.getSampleShipment,
  issueSampleShippingPacket: api.issueSampleShippingPacket,
  recordSampleShipment: api.recordSampleShipment,
}))

describe('SampleShippingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getSampleShipment.mockResolvedValue(shipment)
    api.assignSampleTube.mockResolvedValue(shipment)
    api.issueSampleShippingPacket.mockResolvedValue(shipment)
  })

  it('shows the exact pilot products and replaces a frozen tube mapping with an audited packet revision', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: shipment.shipmentNumber })).toBeTruthy()
    expect(screen.getByText('Corning 8676 / Fisher 07-200-963')).toBeTruthy()
    expect(screen.getByText('Therapak 37806 / Fisher 22-130-029')).toBeTruthy()
    expect(screen.getByText('TUBE-0001')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Correct tube' }))
    const dialog = screen.getByRole('dialog', { name: 'Change tube assignment' })
    expect(dialog.textContent).toContain('voids the current packet and issues a corrected revision')
    fireEvent.change(within(dialog).getByLabelText(/Supplier tube barcode/), {
      target: { value: 'TUBE-0002' },
    })
    fireEvent.change(within(dialog).getByLabelText(/Correction reason/), {
      target: { value: 'Customer moved the sample to the unused registered tube.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save and replace packet' }))

    await waitFor(() => expect(api.assignSampleTube).toHaveBeenCalledWith(
      shipment.id,
      shipment.crosswalk[0].shipmentItemId,
      {
        supplierBarcode: 'TUBE-0002',
        tubeSlotId: null,
        reason: 'Customer moved the sample to the unused registered tube.',
        version: shipment.crosswalk[0].version,
      },
    ))
  })

  it('requires a reason before replacing an issued packet', async () => {
    renderPage()

    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    fireEvent.click(screen.getByRole('button', { name: 'Replace packet' }))
    const dialog = screen.getByRole('dialog', { name: 'Replace shipping packet' })
    const replace = within(dialog).getByRole('button', { name: 'Void and replace packet' })
    expect((replace as HTMLButtonElement).disabled).toBe(true)

    fireEvent.change(within(dialog).getByLabelText(/Replacement reason/), {
      target: { value: 'Reprinted after the original packet was damaged.' },
    })
    fireEvent.click(replace)

    await waitFor(() => expect(api.issueSampleShippingPacket).toHaveBeenCalledWith(
      shipment.id,
      {
        version: shipment.version,
        replacementReason: 'Reprinted after the original packet was damaged.',
      },
    ))
  })
})

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <PhaenoSessionContext.Provider value={customerSession()}>
        <SampleShippingDetailPage shipmentId={shipment.id} />
      </PhaenoSessionContext.Provider>
    </QueryClientProvider>,
  )
}

function customerSession(): PhaenoSessionContextValue {
  return {
    authConfigured: true,
    authProvider: 'clerk',
    clerkLoaded: true,
    signedIn: true,
    session: {
      state: 'ready',
      user: {
        id: 'user-1',
        email: 'admin@example.test',
        firstName: 'Sample',
        lastName: 'Admin',
        status: 'Active',
      },
      memberships: [{
        membershipId: 'membership-1',
        organizationId: shipment.organizationId,
        organizationName: shipment.organizationName,
        organizationKind: 'Customer',
        isOrganizationAdmin: true,
      }],
      isPlatformAdmin: false,
      selectedOrganization: {
        organizationId: shipment.organizationId,
        membershipId: 'membership-1',
        isAvailable: true,
      },
      capabilities: {
        ...noSessionCapabilities,
        canViewSampleShipping: true,
        canManageSampleShipping: true,
      },
    },
    isLoading: false,
    error: null,
    selectedOrganizationId: shipment.organizationId,
    setSelectedOrganizationId: () => undefined,
  }
}

const shipment: SampleShipmentWorkflow = {
  id: '11111111-1111-4111-8111-111111111111',
  shipmentNumber: 'SHIP-20260818-001',
  organizationId: '22222222-2222-4222-8222-222222222222',
  organizationName: 'Example Customer',
  authorizationSource: 'CustomerPromotionalOrder',
  authorizationSourceId: '33333333-3333-4333-8333-333333333333',
  authorizationReference: 'PROMO-001',
  authorizationName: 'RNA pilot',
  labWorkOrderId: '44444444-4444-4444-8444-444444444444',
  destinationId: '55555555-5555-4555-8555-555555555555',
  destinationName: 'West laboratory',
  status: 'ReadyToShip',
  carrier: null,
  trackingNumber: null,
  shippedAt: null,
  version: 4,
  returnKit: {
    id: '66666666-6666-4666-8666-666666666666',
    kitNumber: 'RK-20260818-001',
    sampleShipmentId: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    authorizationSource: 'CustomerPromotionalOrder',
    authorizationSourceId: '33333333-3333-4333-8333-333333333333',
    tubeSupplierName: 'Corning',
    tubeProductNumber: '8676 / Fisher 07-200-963',
    tubeLotNumber: 'LOT-01',
    shipperSupplierName: 'Therapak',
    shipperProductNumber: '37806 / Fisher 22-130-029',
    requiredTubeCount: 2,
    status: 'Fulfilled',
    outboundCarrier: 'UPS',
    outboundTrackingNumber: 'OUTBOUND-1',
    fulfilledAt: '2026-08-18T16:00:00Z',
    version: 3,
    tubes: [
      { id: '77777777-7777-4777-8777-777777777771', supplierBarcode: 'TUBE-0001', status: 'Assigned', assignedAt: '2026-08-18T17:00:00Z', accessionedAt: null, version: 2 },
      { id: '77777777-7777-4777-8777-777777777772', supplierBarcode: 'TUBE-0002', status: 'Available', assignedAt: null, accessionedAt: null, version: 1 },
    ],
  },
  crosswalk: [{
    shipmentItemId: '88888888-8888-4888-8888-888888888888',
    submittedSpecimenId: '99999999-9999-4999-8999-999999999999',
    customerSampleId: 'RNA-001',
    sampleName: 'Extracted RNA 1',
    sampleTypeName: 'Extracted RNA',
    quantity: 20,
    quantityUnit: 'uL',
    registeredSampleTubeId: '77777777-7777-4777-8777-777777777771',
    supplierTubeBarcode: 'TUBE-0001',
    tubeStatus: 'Assigned',
    version: 2,
  }],
  currentPacket: {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    revision: 1,
    packetNumber: 'SP-20260818-ABC123',
    barcode: 'PH-P-23456789AB-C',
    issuedAt: '2026-08-18T17:30:00Z',
    isVoided: false,
  },
}
