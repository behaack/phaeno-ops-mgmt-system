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
  getSampleShipments: vi.fn(),
  getKitSupply: vi.fn(),
}))
vi.mock('#/api/transportation-kit-requests', () => ({ getShipmentKitSupply: api.getKitSupply, orderTransportationKits: vi.fn(), confirmTransportationKitsReceived: vi.fn(), cancelTransportationKitRequest: vi.fn() }))
vi.mock('./ShippingInsertPrintFrame', () => ({
  ShippingInsertPrintFrame: ({ onFinished, onFailure }: { onFinished: () => void; onFailure: (message: string) => void }) => <div data-testid="shipping-insert-print-frame"><button onClick={onFinished}>Close print dialog</button><button onClick={() => onFailure('Current shipping insert unavailable.')}>Fail print preparation</button></div>,
}))

vi.mock('@tanstack/react-router', () => ({
  useBlocker: vi.fn(),
  useNavigate: () => vi.fn(),
  Link: ({ children }: { children: ReactNode }) => <a href="#sample-shipping">{children}</a>,
}))

vi.mock('#/api/sample-shipping', () => ({
  assignSampleTube: api.assignSampleTube,
  downloadSampleShippingCrosswalk: api.downloadSampleShippingCrosswalk,
  getSampleShipment: api.getSampleShipment,
  issueSampleShippingPacket: api.issueSampleShippingPacket,
  recordSampleShipment: api.recordSampleShipment,
  getSourceSampleShipments: api.getSampleShipments,
}))

describe('SampleShippingDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.getSampleShipment.mockResolvedValue(shipment)
    api.getSampleShipments.mockResolvedValue([shipment])
    api.assignSampleTube.mockResolvedValue(shipment)
    api.issueSampleShippingPacket.mockResolvedValue(shipment)
    api.getKitSupply.mockResolvedValue({ shipmentId: shipment.id, jobId: shipment.authorizationSourceId, request: null, recordedStock: [], inventoryStatus: 'Unknown', canRequestKits: true, canPrepareSamples: true, preparationBlockedReason: 'Order kits for this Job first.', locations: [], recommendation: { containers: [] } })
  })

  it('blocks Customer Lab scanning until a physical container is assigned', async () => {
    api.getSampleShipment.mockResolvedValue({ ...shipment, authorizationSource: 'CustomerLabServiceOrder', status: 'Preparing', currentPacket: null, returnKit: null })
    renderPage()
    expect(await screen.findByRole('button', { name: 'Order transportation kits' })).toBeTruthy()
    expect(screen.getByText('Confirm a received container before scanning its tubes.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Correct tube' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Review and confirm shipping insert' })).toBeNull()
    expect(api.assignSampleTube).not.toHaveBeenCalled()
  })

  it.each(['Partner', 'Prospect'] as const)('leaves %s shipping outside Customer Job kit-order gating', async organizationKind => {
    api.getSampleShipment.mockResolvedValue({ ...shipment, authorizationSource: organizationKind === 'Partner' ? 'CustomerLabServiceOrder' : 'TrialProject' })
    const session = customerSession()
    session.session!.memberships[0].organizationKind = organizationKind
    renderPage(undefined, session)
    expect(await screen.findByRole('button', { name: 'Correct tube' })).toBeTruthy()
    expect(api.getKitSupply).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Order transportation kits' })).toBeNull()
  })

  it('shows the exact pilot products and replaces a frozen tube mapping with an audited packet revision', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: shipment.shipmentNumber })).toBeTruthy()
    expect(screen.getByText('Corning 8676 / Fisher 07-200-963')).toBeTruthy()
    expect(screen.getByText('Therapak 37806 / Fisher 22-130-029')).toBeTruthy()
    expect(screen.getByText('TUBE-0001')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Correct tube' }))
    const dialog = screen.getByRole('dialog', { name: 'Change tube assignment' })
    expect(dialog.textContent).toContain('voids the current shipping insert and issues a corrected version')
    fireEvent.change(within(dialog).getByLabelText(/Supplier tube barcode/), {
      target: { value: 'TUBE-0002' },
    })
    fireEvent.change(within(dialog).getByLabelText(/Correction reason/), {
      target: { value: 'Customer moved the sample to the unused registered tube.' },
    })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save and update insert' }))

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

  it('groups issued-shipment actions without offering standalone packet replacement', async () => {
    renderPage()

    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    expect(screen.queryByRole('button', { name: 'Record shipment' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Replace packet' })).toBeNull()
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    expect(await screen.findByRole('menuitem', { name: 'Download tube list (CSV)' })).toBeTruthy()
    expect(screen.getByRole('menuitem', { name: 'Record shipment' })).toBeTruthy()
    expect(screen.queryByRole('menuitem', { name: 'Replace packet' })).toBeNull()
    expect(api.issueSampleShippingPacket).not.toHaveBeenCalled()
  })

  it('shows packet failures inside the dialog and clears them when starting a new attempt', async () => {
    api.getSampleShipment.mockResolvedValue({ ...shipment, status: 'Preparing', currentPacket: null })
    api.issueSampleShippingPacket.mockRejectedValueOnce(new Error('Packet changed. Review the current revision.'))
    renderPage()
    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    fireEvent.click(screen.getByRole('button', { name: 'Review and confirm shipping insert' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm shipping insert' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm and issue shipping insert' }))

    expect(await within(dialog).findByRole('alert')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Keep reviewing' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review and confirm shipping insert' }))
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).toBeNull()
  })

  it('prints from the shipment workspace and permits retry after a preparation failure', async () => {
    renderPage()
    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    const originalUrl = window.location.href
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Actions' }), { button: 0, ctrlKey: false })
    const printAction = await screen.findByRole('menuitem', { name: 'Print shipping insert' })
    expect(printAction.tagName).not.toBe('A')
    fireEvent.click(printAction)
    expect(await screen.findByTestId('shipping-insert-print-frame')).toBeTruthy()
    expect(window.location.href).toBe(originalUrl)
    expect(screen.getByRole('heading', { name: shipment.shipmentNumber })).toBeTruthy()
    expect(api.issueSampleShippingPacket).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Fail print preparation' }))
    expect(screen.queryByTestId('shipping-insert-print-frame')).toBeNull()
    expect(screen.getByText('Shipping insert could not be printed')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.queryByText('Shipping insert could not be printed')).toBeNull()
    expect(screen.getByTestId('shipping-insert-print-frame')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Close print dialog' }))
    expect(screen.queryByTestId('shipping-insert-print-frame')).toBeNull()
    expect(window.location.href).toBe(originalUrl)
  })

  it('counts one sample with multiple tube slots once in packet confirmation', async () => {
    api.getSampleShipment.mockResolvedValue({ ...shipment, status: 'Preparing', currentPacket: null, crosswalk: [
      { ...shipment.crosswalk[0], tubeSlotId: 'slot-1', tubeOrdinal: 1, tubeCount: 2 },
      { ...shipment.crosswalk[0], tubeSlotId: 'slot-2', tubeOrdinal: 2, tubeCount: 2, supplierTubeBarcode: 'TUBE-0002' },
    ] })
    renderPage()
    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    expect(screen.queryByRole('button', { name: 'Actions' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review and confirm shipping insert' }))
    expect(screen.getByRole('dialog', { name: 'Confirm shipping insert' }).textContent).toContain('1 sample across 2 tubes')
  })

  it('invalidates an earlier packet preview after confirming a packet', async () => {
    api.getSampleShipment.mockResolvedValue({ ...shipment, status: 'Preparing', currentPacket: null })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    queryClient.setQueryData(['sample-shipping-packet', shipment.id], { revision: 1 })
    renderPage(queryClient)
    await screen.findByRole('heading', { name: shipment.shipmentNumber })
    fireEvent.click(screen.getByRole('button', { name: 'Review and confirm shipping insert' }))
    const dialog = screen.getByRole('dialog', { name: 'Confirm shipping insert' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirm and issue shipping insert' }))
    await waitFor(() => expect(queryClient.getQueryState(['sample-shipping-packet', shipment.id])?.isInvalidated).toBe(true))
  })
})

function renderPage(queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  }), session = customerSession()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <PhaenoSessionContext.Provider value={session}>
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
