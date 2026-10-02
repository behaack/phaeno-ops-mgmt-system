import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReturnKitFulfillmentPanel } from './ReturnKitFulfillmentPanel'
import { shippingFixture } from '#/test-helpers/sample-shipping'

const mocks = vi.hoisted(() => ({ shipments: vi.fn() }))
const route = vi.hoisted(() => ({ search: {} as Record<string, unknown>, listeners: new Set<() => void>() }))
vi.mock('@tanstack/react-router', async () => {
  const { useSyncExternalStore } = await import('react')
  return { useSearch: () => useSyncExternalStore(listener => { route.listeners.add(listener); return () => { route.listeners.delete(listener) } }, () => route.search), useNavigate: () => ({ search }: { search: Record<string, unknown> | ((previous: Record<string, unknown>) => Record<string, unknown>) }) => { route.search = typeof search === 'function' ? search(route.search) : search; route.listeners.forEach(listener => listener()) }, Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }
})
vi.mock('#/api/sample-shipping', async (importOriginal) => ({
  ...await importOriginal<typeof import('#/api/sample-shipping')>(),
  getPlatformReturnKitShipments: mocks.shipments,
}))

function mount(showEmpty = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ReturnKitFulfillmentPanel apiEnabled showEmpty={showEmpty} /></QueryClientProvider>)
}

beforeEach(() => { vi.clearAllMocks(); route.search = {} })

describe('return kit queue feedback', () => {
  it('matches shipment search against the Job reference and distinguishes a filtered miss from an empty queue', async () => {
    route.search = { kitShipmentSearch: 'JOB-1' }
    mocks.shipments.mockImplementation(search => Promise.resolve({ items: search === 'JOB-1' ? [{ ...shippingFixture, returnKit: { id: 'kit-1', kitNumber: 'KIT-SEARCH-1', status: 'Fulfilled', tubes: [], requiredTubeCount: 0, fulfilledAt: null } }] : [], page: 1, pageSize: 20, totalCount: search === 'JOB-1' ? 1 : 0 }))
    const view = mount()
    expect(await screen.findByText('SHIP-1')).toBeTruthy()
    expect(screen.getByRole('textbox', { name: 'Search kit shipments' })).toBeTruthy()
    route.search = { kitShipmentSearch: 'unknown-kit' }
    view.rerender(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ReturnKitFulfillmentPanel apiEnabled showEmpty /></QueryClientProvider>)
    expect(await screen.findByText('No kit shipments match this search.')).toBeTruthy()
    expect(screen.queryByText('No shared sample shipments are ready for return-kit fulfillment.')).toBeNull()
  })
  it.each([true, false])('shows a failed load without claiming an empty queue (showEmpty=%s)', async (showEmpty) => {
    mocks.shipments.mockRejectedValue(new Error('Request denied'))
    mount(showEmpty)
    expect(await screen.findByText('Return kits could not be updated')).toBeTruthy()
    expect(screen.queryByText('No shared sample shipments are ready for return-kit fulfillment.')).toBeNull()
  })

  it('keeps a pending load distinct from an empty queue', () => {
    mocks.shipments.mockImplementation(() => new Promise(() => {}))
    mount()
    expect(screen.getByRole('status').textContent).toContain('Loading return kits')
    expect(screen.queryByText('No shared sample shipments are ready for return-kit fulfillment.')).toBeNull()
  })

  it('shows the empty queue after a successful empty response', async () => {
    mocks.shipments.mockResolvedValue({ items: [], page: 1, pageSize: 20, totalCount: 0 })
    mount()
    expect(await screen.findByText('No shared sample shipments are ready for return-kit fulfillment.')).toBeTruthy()
    expect(screen.queryByText('Return kits could not be updated')).toBeNull()
  })

  it('requests kit pages on the server and resets search to page one without losing unrelated filters', async () => {
    route.search = { kitShipmentPage: 2, requestSearch: 'KEEP' }
    mocks.shipments.mockImplementation((search, page) => Promise.resolve({ items: search ? [] : [{ ...shippingFixture, returnKit: { id: 'kit-1', kitNumber: 'KIT-1', status: 'Fulfilled', tubes: [], requiredTubeCount: 0, fulfilledAt: null } }], page, pageSize: 20, totalCount: search ? 0 : 45 }))
    mount()
    expect(await screen.findByText('45 shipments · Page 2 of 3')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: /^Next$/ }))
    expect(await screen.findByText('45 shipments · Page 3 of 3')).toBeTruthy()
    expect(mocks.shipments).toHaveBeenCalledWith('', 3, undefined)
    expect(screen.getByRole('button', { name: /^Next$/ })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByRole('textbox', { name: 'Search kit shipments' }), { target: { value: 'NO-MATCH' } })
    expect(route.search).toMatchObject({ kitShipmentSearch: 'NO-MATCH', kitShipmentPage: 1, requestSearch: 'KEEP' })
    expect(await screen.findByText('No kit shipments match this search.')).toBeTruthy()
    expect(mocks.shipments).toHaveBeenCalledWith('NO-MATCH', 1, undefined)
    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))
    await waitFor(() => expect(screen.getByText('45 shipments · Page 1 of 3')).toBeTruthy())
  })
})
