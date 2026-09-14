import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReturnKitFulfillmentPanel } from './ReturnKitFulfillmentPanel'

const mocks = vi.hoisted(() => ({ shipments: vi.fn() }))
vi.mock('#/api/sample-shipping', async (importOriginal) => ({
  ...await importOriginal<typeof import('#/api/sample-shipping')>(),
  getPlatformSampleShipments: mocks.shipments,
}))

function mount(showEmpty = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={client}><ReturnKitFulfillmentPanel apiEnabled showEmpty={showEmpty} /></QueryClientProvider>)
}

beforeEach(() => vi.clearAllMocks())

describe('return kit queue feedback', () => {
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
    mocks.shipments.mockResolvedValue([])
    mount()
    expect(await screen.findByText('No shared sample shipments are ready for return-kit fulfillment.')).toBeTruthy()
    expect(screen.queryByText('Return kits could not be updated')).toBeNull()
  })
})
