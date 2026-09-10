import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { RelatedSampleShipments } from './RelatedSampleShipments'
const mocks = vi.hoisted(() => ({ list: vi.fn() }))
vi.mock('#/api/sample-shipping', () => ({ getSourceSampleShipments: mocks.list }))
vi.mock('@tanstack/react-router', () => ({ Link: ({ children }: { children: ReactNode }) => <a href="#shipment">{children}</a> }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewSampleShipping: true } }, selectedOrganizationId: 'org-1', selectedDepartmentId: 'department-1' }) }))

describe('related shipment receipt summary', () => {
  beforeEach(() => mocks.list.mockReset())
  it('separates retired physical containers from active preparation and its counts', async () => {
    mocks.list.mockResolvedValue([shippingFixture, { ...shippingFixture, id: 'retired', shipmentNumber: 'OLD-CONTAINER', status: 'Cancelled', crosswalk: [], orderExpectedTubeCount: 999, orderReceivedTubeCount: 999 }])
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RelatedSampleShipments sourceId={shippingFixture.authorizationSourceId} /></QueryClientProvider>)
    expect(await screen.findByRole('link', { name: 'Open shipment, tubes and packet' })).toBeTruthy()
    expect(screen.getByText('Retired container configurations (1)')).toBeTruthy()
    expect(screen.getByText('View history · OLD-CONTAINER')).toBeTruthy()
    expect(screen.queryByText(/999/)).toBeNull()
  })
  it('aggregates a split sample once and keeps unallocated tubes visible', async () => {
    const tube = shippingTube(1, { totalSampleTubeCount: 4, receivedTubeCount: 1 })
    mocks.list.mockResolvedValue([
      { ...shippingFixture, expectedTubeCount: 2, receivedTubeCount: 1, orderExpectedTubeCount: 4, orderReceivedTubeCount: 1, crosswalk: [tube, { ...tube, tubeSlotId: 'second' }] },
      { ...shippingFixture, id: 'shipment-2', shipmentNumber: 'SHIP-2', expectedTubeCount: 1, receivedTubeCount: 0, orderExpectedTubeCount: 4, orderReceivedTubeCount: 1, crosswalk: [{ ...tube, tubeSlotId: 'third' }] },
      { ...shippingFixture, id: 'pool', isPackingPool: true, container: null, crosswalk: [{ ...tube, tubeSlotId: 'fourth' }] },
    ])
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RelatedSampleShipments sourceId={shippingFixture.authorizationSourceId} /></QueryClientProvider>)
    expect(await screen.findByText('1 of 4 tubes received across all shipments.')).toBeTruthy()
    expect(screen.getAllByText(/RNA-1/)).toHaveLength(1)
    expect(screen.getByText(/1 of 4 tubes received · Partially received/)).toBeTruthy()
    expect(screen.getByText('1 tube still needs a shipping container.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Choose containers' })).toBeTruthy()
    expect(screen.queryByText(/4 of 4 tubes received/)).toBeNull()
  })

  it('loads each job directly even when the organization-wide cached list contains only other jobs', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['sample-shipments', 'org-1', 'department-1'], Array.from({ length: 250 }, (_, index) => ({ ...shippingFixture, id: `other-${index}`, authorizationSourceId: 'another-job' })))
    mocks.list.mockResolvedValue([shippingFixture])
    const view = render(<QueryClientProvider client={client}><RelatedSampleShipments sourceId={shippingFixture.authorizationSourceId} /></QueryClientProvider>)
    expect(await screen.findByRole('link', { name: 'Open shipment, tubes and packet' })).toBeTruthy()
    expect(mocks.list).toHaveBeenCalledWith(shippingFixture.authorizationSourceId, false)
    mocks.list.mockResolvedValue([{ ...shippingFixture, id: 'second-job-shipment', authorizationSourceId: 'second-job', shipmentNumber: 'SECOND-JOB-SHIPMENT' }])
    view.rerender(<QueryClientProvider client={client}><RelatedSampleShipments sourceId="second-job" /></QueryClientProvider>)
    expect(await screen.findByText('SECOND-JOB-SHIPMENT')).toBeTruthy()
    expect(mocks.list).toHaveBeenCalledWith('second-job', false)
    expect(screen.queryByText(shippingFixture.shipmentNumber)).toBeNull()
  })

  it('omits exhausted and cancelled pools without offering further preparation', async () => {
    mocks.list.mockResolvedValue([
      shippingFixture,
      { ...shippingFixture, id: 'exhausted', isPackingPool: true, container: null, status: 'Cancelled', crosswalk: [] },
      { ...shippingFixture, id: 'empty', isPackingPool: true, container: null, crosswalk: [] },
    ])
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RelatedSampleShipments sourceId={shippingFixture.authorizationSourceId} /></QueryClientProvider>)
    expect(await screen.findByRole('link', { name: 'Open shipment, tubes and packet' })).toBeTruthy()
    expect(screen.queryByText('Tubes awaiting containers')).toBeNull()
    expect(screen.queryByRole('link', { name: 'Choose containers' })).toBeNull()
    expect(screen.queryByText('0 unallocated tubes')).toBeNull()
  })
})

