import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { shippingFixture, shippingTube } from '#/test-helpers/sample-shipping'
import { ShippingContainerSelector } from './ShippingContainerSelector'

const mocks = vi.hoisted(() => ({ list: vi.fn(), navigate: vi.fn(), allowed: true }))
vi.mock('#/api/sample-shipping', () => ({ getSourceSampleShipments: mocks.list }))
vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }))
vi.mock('#/features/auth/session-context', () => ({ usePhaenoSession: () => ({ authProvider: 'clerk', session: { capabilities: { canViewSampleShipping: mocks.allowed } }, selectedOrganizationId: 'org-1', selectedDepartmentId: 'department-1' }) }))

const second = { ...shippingFixture, id: 'shipment-2', shipmentNumber: 'SHIP-2', crosswalk: [shippingTube(3)] }
function show() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(<QueryClientProvider client={client}><ShippingContainerSelector shipment={shippingFixture} /></QueryClientProvider>)
}
beforeEach(() => { vi.resetAllMocks(); mocks.allowed = true; mocks.list.mockResolvedValue([shippingFixture, second]); mocks.navigate.mockResolvedValue(undefined) })

describe('shipping container selector', () => {
  it('selects the current container and switches directly to another shipment', async () => {
    show()
    const selector = screen.getByRole('combobox', { name: 'Shipping container' })
    await waitFor(() => expect(selector).toHaveProperty('disabled', false))
    expect(selector).toHaveProperty('value', shippingFixture.id)
    expect(within(selector).getByRole('option', { name: /SHIP-2.*1 tube/ })).toBeTruthy()
    fireEvent.change(selector, { target: { value: second.id } })
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/sample-shipping/$shipmentId', params: { shipmentId: second.id } }))
    expect(mocks.list).toHaveBeenCalledWith(shippingFixture.authorizationSourceId, false)
  })

  it('keeps remaining tubes reachable and excludes other jobs, retired containers and empty pools', async () => {
    mocks.list.mockResolvedValue([shippingFixture, second,
      { ...second, id: 'other-job', authorizationSourceId: 'other-job', shipmentNumber: 'OTHER' },
      { ...second, id: 'cancelled', status: 'Cancelled', shipmentNumber: 'RETIRED' },
      { ...second, id: 'empty', isPackingPool: true, crosswalk: [] },
      { ...second, id: 'pool', isPackingPool: true, container: null },
    ])
    show()
    const pool = await screen.findByRole('option', { name: /Tubes awaiting containers/ })
    expect(pool).toHaveProperty('value', 'pool')
    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.queryByRole('option', { name: /OTHER|RETIRED/ })).toBeNull()
  })

  it('keeps the current selection usable after a navigation blocker leaves its promise pending', async () => {
    mocks.navigate.mockImplementationOnce(() => new Promise<void>(() => {}))
    show()
    const selector = screen.getByRole('combobox')
    await waitFor(() => expect(selector).toHaveProperty('disabled', false))
    fireEvent.change(selector, { target: { value: second.id } })
    expect(selector).toHaveProperty('disabled', false)
    expect(selector).toHaveProperty('value', shippingFixture.id)
    expect(mocks.navigate).toHaveBeenCalledTimes(1)
    fireEvent.change(selector, { target: { value: second.id } })
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledTimes(2))
  })

  it('keeps the current selection during a load failure and supports retry', async () => {
    mocks.list.mockRejectedValueOnce(new Error('Unavailable')).mockResolvedValue([shippingFixture, second])
    show()
    fireEvent.click(await screen.findByRole('button', { name: 'Retry containers' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveProperty('disabled', false))
    expect(screen.getByRole('combobox')).toHaveProperty('value', shippingFixture.id)
  })

  it('does not load shipping records without view permission', () => {
    mocks.allowed = false
    show()
    expect(screen.queryByRole('combobox')).toBeNull()
    expect(mocks.list).not.toHaveBeenCalled()
  })
})
